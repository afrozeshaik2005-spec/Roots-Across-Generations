import prisma from '../config/database.js';
import { uploadFile } from '../services/firebaseStorage.service.js';
import { sendNotification } from '../services/notification.service.js';
import { bucket } from '../config/firebase.js';

export const uploadMemory = async (req, res, next) => {
  try {
    const { familyId, title, description, memoryDate, location, type, isPrivate, taggedMemberIds } = req.body;
    const uploaderId = req.user.memberId;

    if (!familyId || !title || !type) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required memory fields', status: 400 }
      });
    }

    // 1. Verify membership
    const membership = await prisma.familyMembership.findUnique({
      where: {
        familyId_memberId: {
          familyId,
          memberId: uploaderId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only family members can upload memories', status: 403 }
      });
    }

    // 2. Validate Firebase Storage for files
    if (type !== 'STORY' && !req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'Attachment file required for non-story type', status: 400 }
      });
    }

    // 3. Upload File
    let fileUrl = null;
    if (type !== 'STORY' && req.file) {
      fileUrl = await uploadFile(req.file, 'memories');
    }

    // 4. Resolve Tags List (must contain uploader)
    let parsedTags = [];
    if (taggedMemberIds) {
      parsedTags = Array.isArray(taggedMemberIds) 
        ? taggedMemberIds 
        : JSON.parse(taggedMemberIds);
    }

    if (!parsedTags.includes(uploaderId)) {
      parsedTags.push(uploaderId);
    }

    const memory = await prisma.$transaction(async (tx) => {
      const createdMemory = await tx.memory.create({
        data: {
          family: { connect: { id: familyId } },
          creator: { connect: { id: uploaderId } },
          title,
          description: description || null,
          type,
          fileUrl,
          memoryDate: memoryDate ? new Date(memoryDate) : null,
          location: location || null
        }
      });

      // Create tags
      await tx.memoryTag.createMany({
        data: parsedTags.map(memberId => ({
          memoryId: createdMemory.id,
          memberId
        }))
      });

      return createdMemory;
    });

    // 5. Notify tagged members
    const otherTaggedIds = parsedTags.filter(id => id !== uploaderId);
    for (const tagId of otherTaggedIds) {
      const targetUser = await prisma.user.findFirst({
        where: { familyMemberId: tagId }
      });
      if (targetUser) {
        await sendNotification(
          req.app,
          targetUser.id,
          'MEMORY_TAGGED',
          'Tagged in a Memory 📸',
          `You have been tagged in a new memory: "${title}".`,
          memory.id
        );
      }
    }

    res.status(201).json({
      success: true,
      memory
    });
  } catch (err) {
    next(err);
  }
};

export const getFamilyMemories = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    const viewerId = req.user?.memberId;

    if (!viewerId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Link viewers and guest accounts cannot access family memories', status: 403 }
      });
    }

    // Verify membership
    const membership = await prisma.familyMembership.findUnique({
      where: {
        familyId_memberId: {
          familyId,
          memberId: viewerId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied to this family archive', status: 403 }
      });
    }

    const isHistorian = ['FOUNDER', 'HISTORIAN'].includes(membership.role);

    // Fetch non-deleted memories
    const memories = await prisma.memory.findMany({
      where: {
        familyId,
        isDeleted: false
      },
      include: {
        creator: { select: { id: true, fullName: true, profilePhoto: true } },
        tags: {
          include: { member: { select: { id: true, fullName: true, profilePhoto: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter by Privacy Settings
    // Private memories only visible to tagged members or family Historians
    const filtered = memories.filter((memory) => {
      if (!memory.isPrivate) return true;
      if (isHistorian) return true;
      const isTagged = memory.tags.some(tag => tag.memberId === viewerId);
      return isTagged;
    });

    res.json({
      success: true,
      memories: filtered
    });
  } catch (err) {
    next(err);
  }
};

export const getMemberMemories = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const viewerId = req.user?.memberId;

    if (!viewerId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied', status: 403 }
      });
    }

    const taggedTags = await prisma.memoryTag.findMany({
      where: {
        memberId,
        memory: {
          isDeleted: false
        }
      },
      include: {
        memory: {
          include: {
            creator: { select: { id: true, fullName: true, profilePhoto: true } },
            tags: {
              include: { member: { select: { id: true, fullName: true, profilePhoto: true } } }
            }
          }
        }
      }
    });

    const memories = taggedTags.map(t => t.memory);

    // Filter based on privacy
    // If memory is private, viewer must be tagged in it or a historian in its family
    const viewerMemberships = await prisma.familyMembership.findMany({
      where: { memberId: viewerId }
    });

    const filtered = [];
    for (const mem of memories) {
      if (!mem.isPrivate) {
        filtered.push(mem);
        continue;
      }

      const isTagged = mem.tags.some(t => t.memberId === viewerId);
      if (isTagged) {
        filtered.push(mem);
        continue;
      }

      const familyMembership = viewerMemberships.find(m => m.familyId === mem.familyId);
      if (familyMembership && ['FOUNDER', 'HISTORIAN'].includes(familyMembership.role)) {
        filtered.push(mem);
      }
    }

    res.json({
      success: true,
      memories: filtered
    });
  } catch (err) {
    next(err);
  }
};

export const updateMemory = async (req, res, next) => {
  try {
    const { memoryId } = req.params;
    const { title, description, memoryDate, location, isPrivate } = req.body;
    const editorId = req.user.memberId;

    const memory = await prisma.memory.findUnique({
      where: { id: memoryId }
    });

    if (!memory || memory.isDeleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Memory not found', status: 404 }
      });
    }

    // Verify permission (Uploader or Historian)
    const membership = await prisma.familyMembership.findUnique({
      where: {
        familyId_memberId: {
          familyId: memory.familyId,
          memberId: editorId
        }
      }
    });

    const isUploader = memory.creatorId === editorId;
    const isHistorian = membership && ['FOUNDER', 'HISTORIAN'].includes(membership.role);

    if (!isUploader && !isHistorian) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only the uploader or family Historian can modify memory details', status: 403 }
      });
    }

    const updated = await prisma.memory.update({
      where: { id: memoryId },
      data: {
        title,
        description: description || null,
        memoryDate: memoryDate ? new Date(memoryDate) : null,
        location: location || null,
        isPrivate: isPrivate !== undefined ? isPrivate : memory.isPrivate
      }
    });

    res.json({
      success: true,
      memory: updated
    });
  } catch (err) {
    next(err);
  }
};

export const deleteMemory = async (req, res, next) => {
  try {
    const { memoryId } = req.params;
    const editorId = req.user.memberId;

    const memory = await prisma.memory.findUnique({
      where: { id: memoryId }
    });

    if (!memory || memory.isDeleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Memory not found', status: 404 }
      });
    }

    // Verify permission (Uploader or Historian)
    const membership = await prisma.familyMembership.findUnique({
      where: {
        familyId_memberId: {
          familyId: memory.familyId,
          memberId: editorId
        }
      }
    });

    const isUploader = memory.creatorId === editorId;
    const isHistorian = membership && ['FOUNDER', 'HISTORIAN'].includes(membership.role);

    if (!isUploader && !isHistorian) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only the uploader or family Historian can delete memories', status: 403 }
      });
    }

    // Soft delete
    await prisma.memory.update({
      where: { id: memoryId },
      data: { isDeleted: true }
    });

    res.json({
      success: true,
      message: 'Memory archived and soft-deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

export const addMemoryTag = async (req, res, next) => {
  try {
    const { memoryId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Member ID is required', status: 400 }
      });
    }

    const memory = await prisma.memory.findUnique({
      where: { id: memoryId }
    });

    if (!memory || memory.isDeleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Memory not found', status: 404 }
      });
    }

    // Add tag
    const tag = await prisma.memoryTag.upsert({
      where: {
        memoryId_memberId: {
          memoryId,
          memberId
        }
      },
      update: {},
      create: {
        memoryId,
        memberId
      }
    });

    // Notify tagged member
    const targetUser = await prisma.user.findFirst({
      where: { familyMemberId: memberId }
    });
    if (targetUser && memberId !== req.user.memberId) {
      await sendNotification(
        req.app,
        targetUser.id,
        'MEMORY_TAGGED',
        'Tagged in a Memory 📸',
        `You have been tagged in the memory: "${memory.title}".`,
        memoryId
      );
    }

    res.status(201).json({
      success: true,
      tag
    });
  } catch (err) {
    next(err);
  }
};

export const removeMemoryTag = async (req, res, next) => {
  try {
    const { memoryId, memberId } = req.params;

    const memory = await prisma.memory.findUnique({
      where: { id: memoryId }
    });

    if (!memory || memory.isDeleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Memory not found', status: 404 }
      });
    }

    await prisma.memoryTag.delete({
      where: {
        memoryId_memberId: {
          memoryId,
          memberId
        }
      }
    });

    res.json({
      success: true,
      message: 'Tag removed successfully'
    });
  } catch (err) {
    next(err);
  }
};
