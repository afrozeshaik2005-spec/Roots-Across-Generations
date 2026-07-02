import prisma from '../config/database.js';
import { sendNotification } from '../services/notification.service.js';

export const startConversation = async (req, res, next) => {
  try {
    const { familyId, targetMemberId } = req.body;
    const currentMemberId = req.user.memberId;

    if (!familyId || !targetMemberId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Family ID and Target Member ID are required', status: 400 }
      });
    }

    if (currentMemberId === targetMemberId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot initiate a chat session with yourself', status: 400 }
      });
    }

    // Order IDs to ensure unique pair constraint
    const memberOneId = currentMemberId < targetMemberId ? currentMemberId : targetMemberId;
    const memberTwoId = currentMemberId > targetMemberId ? currentMemberId : targetMemberId;

    const conversation = await prisma.conversation.upsert({
      where: {
        familyId_memberOneId_memberTwoId: {
          familyId,
          memberOneId,
          memberTwoId
        }
      },
      update: {},
      create: {
        familyId,
        memberOneId,
        memberTwoId
      },
      include: {
        memberOne: { select: { id: true, fullName: true, profilePhoto: true } },
        memberTwo: { select: { id: true, fullName: true, profilePhoto: true } }
      }
    });

    res.status(201).json({
      success: true,
      conversation
    });
  } catch (err) {
    next(err);
  }
};

export const getConversationsList = async (req, res, next) => {
  try {
    const currentMemberId = req.user.memberId;
    const { familyId } = req.query;

    if (!familyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Family ID query param is required', status: 400 }
      });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        familyId,
        OR: [
          { memberOneId: currentMemberId },
          { memberTwoId: currentMemberId }
        ]
      },
      include: {
        memberOne: { select: { id: true, fullName: true, profilePhoto: true } },
        memberTwo: { select: { id: true, fullName: true, profilePhoto: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Calculate unread message counts for each conversation
    const list = await Promise.all(
      conversations.map(async (c) => {
        const otherMember = c.memberOneId === currentMemberId ? c.memberTwo : c.memberOne;
        
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: c.id,
            receiverMemberId: currentMemberId,
            isRead: false
          }
        });

        const lastMessage = c.messages[0] || null;

        // Skip if last message is deleted for current user
        const isDeletedForMe = lastMessage
          ? (lastMessage.senderMemberId === currentMemberId ? lastMessage.isDeletedBySender : lastMessage.isDeletedByReceiver)
          : false;

        return {
          id: c.id,
          otherMember,
          lastMessage: isDeletedForMe ? null : lastMessage,
          unreadCount,
          updatedAt: c.updatedAt
        };
      })
    );

    // Sort list by latest message createdAt
    list.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    res.json({
      success: true,
      conversations: list
    });
  } catch (err) {
    next(err);
  }
};

export const getConversationMessages = async (req, res, next) => {
  try {
    const { id } = req.params; // conversationId
    const currentMemberId = req.user.memberId;
    const { page = 1, limit = 50 } = req.query;

    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);

    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        OR: [
          { senderMemberId: currentMemberId, isDeletedBySender: false },
          { receiverMemberId: currentMemberId, isDeletedByReceiver: false }
        ]
      },
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * l,
      take: l
    });

    // Invert to chronological order for client UI view
    messages.reverse();

    res.json({
      success: true,
      messages
    });
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params; // conversationId
    const { content } = req.body;
    const senderMemberId = req.user.memberId;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: { message: 'Message content is required', status: 400 }
      });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: { message: 'Conversation not found', status: 404 }
      });
    }

    const receiverMemberId = conversation.memberOneId === senderMemberId
      ? conversation.memberTwoId
      : conversation.memberOneId;

    const message = await prisma.message.create({
      data: {
        familyId: conversation.familyId,
        conversationId: id,
        senderMemberId,
        receiverMemberId,
        content
      }
    });

    // Update conversation updatedAt timestamp
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    // Emit live to Socket.io receiver room if available
    const io = req.app.get('io');
    if (io) {
      io.to(`member_${receiverMemberId}`).emit('message_received', message);
    }

    // Create a DB notification so NotificationBell picks it up
    try {
      const senderMember = await prisma.familyMember.findUnique({
        where: { id: senderMemberId },
        select: { fullName: true }
      });
      const receiverUser = await prisma.familyMember.findUnique({
        where: { id: receiverMemberId },
        select: { user: { select: { id: true } } }
      });
      if (receiverUser?.user?.id) {
        const snippet = content.length > 80 ? content.substring(0, 80) + '...' : content;
        await sendNotification(
          req.app,
          receiverUser.user.id,
          'MESSAGE_RECEIVED',
          'New Message',
          `${senderMember?.fullName || 'Someone'} sent you: ${snippet}`,
          message.id
        );
      }
    } catch (notifErr) {
      console.error('Failed to create message notification:', notifErr);
    }

    res.status(201).json({
      success: true,
      message
    });
  } catch (err) {
    next(err);
  }
};

export const readMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const currentMemberId = req.user.memberId;

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message || message.receiverMemberId !== currentMemberId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Message not found or unauthorized', status: 404 }
      });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { isRead: true }
    });

    // Emit read receipt back to sender via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`member_${message.senderMemberId}`).emit('read_receipt', {
        messageId,
        conversationId: message.conversationId,
        isRead: true
      });
    }

    res.json({
      success: true,
      message: updated
    });
  } catch (err) {
    next(err);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const currentMemberId = req.user.memberId;

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: { message: 'Message not found', status: 404 }
      });
    }

    const isSender = message.senderMemberId === currentMemberId;
    const isReceiver = message.receiverMemberId === currentMemberId;

    if (!isSender && !isReceiver) {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized to delete this message', status: 403 }
      });
    }

    // Apply independent copy deletions flags
    const data = {};
    if (isSender) data.isDeletedBySender = true;
    if (isReceiver) data.isDeletedByReceiver = true;

    await prisma.message.update({
      where: { id: messageId },
      data
    });

    res.json({
      success: true,
      message: 'Message soft-deleted from your feed copy'
    });
  } catch (err) {
    next(err);
  }
};
