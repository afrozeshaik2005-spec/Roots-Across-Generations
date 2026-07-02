import prisma from '../config/database.js';
import { sendNotification } from '../services/notification.service.js';

/**
 * POST /contact-requests
 * Request contact info from another member
 */
export const createContactRequest = async (req, res, next) => {
  try {
    const { ownerId, familyId, fields } = req.body;
    const requesterMemberId = req.user?.memberId;

    if (!requesterMemberId) {
      return res.status(400).json({ success: false, error: { message: 'No member profile linked', status: 400 } });
    }
    if (!ownerId || !familyId || !fields?.length) {
      return res.status(400).json({ success: false, error: { message: 'ownerId, familyId, and fields are required', status: 400 } });
    }
    if (requesterMemberId === ownerId) {
      return res.status(400).json({ success: false, error: { message: 'Cannot request your own contact info', status: 400 } });
    }

    // Check for existing pending request
    const existing = await prisma.contactRequest.findFirst({
      where: { requesterId: requesterMemberId, ownerId, familyId, status: 'PENDING' }
    });
    if (existing) {
      return res.status(409).json({ success: false, error: { message: 'You already have a pending request for this member', status: 409 } });
    }

    const validFields = ['PHONE', 'EMAIL', 'ADDRESS', 'ALL'];
    const sanitizedFields = fields.filter(f => validFields.includes(f));
    if (!sanitizedFields.length) {
      return res.status(400).json({ success: false, error: { message: 'No valid fields provided', status: 400 } });
    }

    const request = await prisma.contactRequest.create({
      data: {
        requesterId: requesterMemberId,
        ownerId,
        familyId,
        fields: sanitizedFields
      },
      include: { requester: { select: { id: true, fullName: true } }, owner: { select: { id: true, fullName: true } } }
    });

    // Notify owner via socket + DB
    const ownerUser = await prisma.familyMember.findUnique({ where: { id: ownerId }, select: { user: { select: { id: true } } } });
    if (ownerUser?.user?.id) {
      const fieldLabels = sanitizedFields.map(f => f === 'ALL' ? 'all contact details' : f.toLowerCase() + ' number').join(' and ');
      await sendNotification(
        req.app,
        ownerUser.user.id,
        'JOIN_REQUEST', // reuse type
        'Contact Info Request',
        `${request.requester.fullName} requested your ${fieldLabels}`,
        request.id
      );
    }

    // Emit socket event to owner
    const io = req.app.get('io');
    if (io) {
      io.to(`member_${ownerId}`).emit('contact.request.created', {
        id: request.id,
        requesterId: request.requesterId,
        requesterName: request.requester.fullName,
        ownerId: request.ownerId,
        ownerName: request.owner.fullName,
        fields: request.fields,
        status: request.status,
        createdAt: request.createdAt
      });
    }

    return res.status(201).json({ success: true, request });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /contact-requests/sent
 * Get requests I sent
 */
export const getSentRequests = async (req, res, next) => {
  try {
    const memberId = req.user?.memberId;
    if (!memberId) {
      return res.status(400).json({ success: false, error: { message: 'No member profile linked', status: 400 } });
    }

    const requests = await prisma.contactRequest.findMany({
      where: { requesterId: memberId },
      include: { owner: { select: { id: true, fullName: true, profilePhoto: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, requests });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /contact-requests/received
 * Get requests sent to me
 */
export const getReceivedRequests = async (req, res, next) => {
  try {
    const memberId = req.user?.memberId;
    if (!memberId) {
      return res.status(400).json({ success: false, error: { message: 'No member profile linked', status: 400 } });
    }

    const requests = await prisma.contactRequest.findMany({
      where: { ownerId: memberId },
      include: { requester: { select: { id: true, fullName: true, profilePhoto: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, requests });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /contact-requests/:id/approve
 * Owner approves a contact request — shares selected data
 */
export const approveContactRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const memberId = req.user?.memberId;

    const request = await prisma.contactRequest.findUnique({
      where: { id },
      include: { owner: true, requester: true }
    });

    if (!request) {
      return res.status(404).json({ success: false, error: { message: 'Request not found', status: 404 } });
    }
    if (request.ownerId !== memberId) {
      return res.status(403).json({ success: false, error: { message: 'Only the profile owner can approve this request', status: 403 } });
    }
    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: { message: 'Request is no longer pending', status: 400 } });
    }

    // Pull actual contact data from owner's profile
    const ownerProfile = await prisma.familyMember.findUnique({
      where: { id: request.ownerId },
      select: { phone: true, email: true, birthPlace: true, birthVillageCity: true }
    });

    const wantsAll = request.fields.includes('ALL');
    const sharedPhone = (wantsAll || request.fields.includes('PHONE')) ? ownerProfile.phone : null;
    const sharedEmail = (wantsAll || request.fields.includes('EMAIL')) ? ownerProfile.email : null;
    const sharedAddress = (wantsAll || request.fields.includes('ADDRESS'))
      ? [ownerProfile.birthPlace, ownerProfile.birthVillageCity].filter(Boolean).join(', ') || null
      : null;

    const updated = await prisma.contactRequest.update({
      where: { id },
      data: { status: 'APPROVED', sharedPhone, sharedEmail, sharedAddress },
      include: { requester: { select: { id: true, fullName: true } }, owner: { select: { id: true, fullName: true } } }
    });

    // Notify requester
    const requesterUser = await prisma.familyMember.findUnique({
      where: { id: request.requesterId },
      select: { user: { select: { id: true } } }
    });
    if (requesterUser?.user?.id) {
      await sendNotification(
        req.app,
        requesterUser.user.id,
        'JOIN_ACCEPTED',
        'Contact Info Shared',
        `${request.owner.fullName} approved your contact info request`,
        request.id
      );
    }

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      io.to(`member_${request.requesterId}`).emit('contact.request.approved', {
        id: updated.id,
        ownerName: updated.owner.fullName,
        sharedPhone: updated.sharedPhone,
        sharedEmail: updated.sharedEmail,
        sharedAddress: updated.sharedAddress,
        fields: updated.fields,
        status: updated.status
      });
    }

    return res.json({ success: true, request: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /contact-requests/:id/reject
 * Owner rejects a contact request
 */
export const rejectContactRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const memberId = req.user?.memberId;

    const request = await prisma.contactRequest.findUnique({
      where: { id },
      include: { owner: true, requester: true }
    });

    if (!request) {
      return res.status(404).json({ success: false, error: { message: 'Request not found', status: 404 } });
    }
    if (request.ownerId !== memberId) {
      return res.status(403).json({ success: false, error: { message: 'Only the profile owner can reject this request', status: 403 } });
    }
    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: { message: 'Request is no longer pending', status: 400 } });
    }

    const updated = await prisma.contactRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
      include: { requester: { select: { id: true, fullName: true } }, owner: { select: { id: true, fullName: true } } }
    });

    // Notify requester
    const requesterUser = await prisma.familyMember.findUnique({
      where: { id: request.requesterId },
      select: { user: { select: { id: true } } }
    });
    if (requesterUser?.user?.id) {
      await sendNotification(
        req.app,
        requesterUser.user.id,
        'JOIN_REJECTED',
        'Contact Request Rejected',
        `Your contact info request to ${request.owner.fullName} was rejected`,
        request.id
      );
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`member_${request.requesterId}`).emit('contact.request.rejected', {
        id: updated.id,
        ownerName: updated.owner.fullName,
        status: updated.status
      });
    }

    return res.json({ success: true, request: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /contact-requests/status/:ownerId
 * Check if I have a pending/approved request for a specific owner
 */
export const getRequestStatus = async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const { familyId } = req.query;
    const memberId = req.user?.memberId;

    if (!memberId) {
      return res.status(400).json({ success: false, error: { message: 'No member profile linked', status: 400 } });
    }

    const request = await prisma.contactRequest.findFirst({
      where: { requesterId: memberId, ownerId, familyId: familyId || undefined },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, request: request || null });
  } catch (err) {
    next(err);
  }
};
