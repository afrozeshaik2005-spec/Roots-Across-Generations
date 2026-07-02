import prisma from '../config/database.js';
import { uploadFile } from '../services/firebaseStorage.service.js';
import { sendNotification } from '../services/notification.service.js';
import { recalculateFamilyGenerations } from '../services/generationCalculator.service.js';

const REQUIRED_PROFILE_FIELDS = ['fullName', 'dob', 'gender', 'phone'];
const BIO_PARENT_TYPES = ['FATHER', 'MOTHER'];
const PARENT_TYPES = ['FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER', 'ADOPTED_CHILD', 'GUARDIAN'];

const isFutureDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date > today;
};

const normalizeRelationshipType = (type) => String(type || '').trim().toUpperCase();

const getDisplayRelationship = (type) => {
  const labels = {
    FATHER: 'father',
    MOTHER: 'mother',
    SON: 'son',
    DAUGHTER: 'daughter',
    BROTHER: 'brother',
    SISTER: 'sister',
    HUSBAND: 'husband',
    WIFE: 'wife',
    STEP_FATHER: 'step father',
    STEP_MOTHER: 'step mother',
    STEP_SON: 'step son',
    STEP_DAUGHTER: 'step daughter',
    ADOPTED_CHILD: 'adopted child',
    GUARDIAN: 'ward under guardianship'
  };
  return labels[type] || type.toLowerCase().replaceAll('_', ' ');
};

export const submitJoinRequest = async (req, res, next) => {
  try {
    const { familyId, fullName, dob, email, phone, gender, relatedToMemberId } = req.body;
    const relationshipType = normalizeRelationshipType(req.body.relationshipType);

    if (!familyId || !email || !relatedToMemberId || !relationshipType) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required join request fields', status: 400 }
      });
    }

    const missingProfileFields = REQUIRED_PROFILE_FIELDS.filter((field) => !String(req.body[field] || '').trim());
    if (missingProfileFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: { message: `Missing required profile fields: ${missingProfileFields.join(', ')}`, status: 400 }
      });
    }

    if (isFutureDate(dob)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Date of birth cannot be in the future', status: 400 }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required. Please log in first.', status: 401 }
      });
    }

    // Verify family target exists
    const family = await prisma.family.findUnique({
      where: { id: familyId }
    });
    if (!family) {
      return res.status(404).json({
        success: false,
        error: { message: 'Target family not found', status: 404 }
      });
    }

    // A user can only have one pending join request per family
    const existingPending = await prisma.joinRequest.findFirst({
      where: {
        familyId,
        requesterUserId: req.user.id,
        status: 'PENDING'
      }
    });
    if (existingPending) {
      return res.status(400).json({
        success: false,
        error: { message: 'You already have a pending join request for this family.', status: 400 }
      });
    }

    // Process proof file upload if exists
    let proofUrl = null;
    if (req.file) {
      proofUrl = await uploadFile(req.file, 'proofs');
    }

    const request = await prisma.joinRequest.create({
      data: {
        familyId,
        fullName,
        dob: new Date(dob),
        email,
        phone,
        gender,
        relatedToMemberId,
        relationshipType,
        proofUrl,
        requesterUserId: req.user.id
      }
    });

    // Notify relative target member (if they have a user account connected)
    const relativeUser = await prisma.user.findFirst({
      where: { familyMemberId: relatedToMemberId }
    });

    if (relativeUser) {
      await sendNotification(
        req.app,
        relativeUser.id,
        'JOIN_REQUEST',
        'New Join Request Received',
        `${fullName} has requested to join your family tree: "I am this person's ${getDisplayRelationship(relationshipType)}."`,
        request.id
      );
    }

    // Emit real-time socket event to family room so historian sees it immediately
    const io = req.app.get('io');
    if (io) {
      io.to(`family_${familyId}`).emit('joinRequest.created', {
        requestId: request.id,
        familyId,
        fullName,
        relationshipType,
        createdAt: request.createdAt
      });
    }

    res.status(201).json({
      success: true,
      request
    });
  } catch (err) {
    next(err);
  }
};

export const getFamilyJoinRequests = async (req, res, next) => {
  try {
    const { familyId } = req.params;

    const requests = await prisma.joinRequest.findMany({
      where: {
        familyId,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    // Resolve target member names for each request using relatedToMemberId.
    // This prevents the frontend from showing "Unknown Member" as a fallback.
    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
        let targetMemberName = null;
        if (req.relatedToMemberId) {
          const targetMember = await prisma.familyMember.findUnique({
            where: { id: req.relatedToMemberId },
            select: { id: true, fullName: true }
          });
          targetMemberName = targetMember?.fullName ?? null;
        }
        return {
          ...req,
          targetMemberId: req.relatedToMemberId,
          targetMemberName
        };
      })
    );

    res.json({
      success: true,
      requests: enrichedRequests
    });
  } catch (err) {
    next(err);
  }
};

export const acceptJoinRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    const request = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: { family: true }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: { message: 'Join request not found', status: 404 }
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: { message: `This join request has already been ${request.status.toLowerCase()}`, status: 400 }
      });
    }

    // Verify user is a historian or founder of the family
    const membership = await prisma.familyMembership.findUnique({
      where: {
        familyId_memberId: {
          familyId: request.familyId,
          memberId: req.user.memberId
        }
      }
    });

    if (!membership || !['FOUNDER', 'HISTORIAN'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient family permission level', status: 403 }
      });
    }

    // Resolve relative node to read generationNumber
    const relative = await prisma.familyMember.findUnique({
      where: { id: request.relatedToMemberId }
    });
    if (!relative) {
      return res.status(404).json({
        success: false,
        error: { message: 'Relative node no longer exists', status: 404 }
      });
    }

    // Calculate Generation Number using Module 3 rules
    const relGen = relative.generationNumber || 1;
    let generationNumber = 1;

    if (['FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER'].includes(request.relationshipType)) {
      generationNumber = relGen - 1;
    } else if (['SON', 'DAUGHTER', 'STEP_SON', 'STEP_DAUGHTER', 'ADOPTED_CHILD'].includes(request.relationshipType)) {
      generationNumber = relGen + 1;
    } else if (['GUARDIAN'].includes(request.relationshipType)) {
      generationNumber = relGen;
    } else if (['HUSBAND', 'WIFE', 'BROTHER', 'SISTER'].includes(request.relationshipType)) {
      generationNumber = relGen;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create FamilyMember profile
      const member = await tx.familyMember.create({
        data: {
          fullName: request.fullName,
          dob: request.dob,
          email: request.email,
          phone: request.phone,
          gender: request.gender,
          generationNumber,
          privacySettings: { create: {} }
        }
      });

      // 2. Link member to family
      await tx.familyMembership.create({
        data: {
          familyId: request.familyId,
          memberId: member.id,
          role: 'MEMBER'
        }
      });

      // 3. Connect User account reference if exists
      if (request.requesterUserId) {
        await tx.user.update({
          where: { id: request.requesterUserId },
          data: { familyMemberId: member.id }
        });
        
        // Link member back to user
        await tx.familyMember.update({
          where: { id: member.id },
          data: { user: { connect: { id: request.requesterUserId } } }
        });
      }

      // 4. Map Relationship direction rules.
      // Canonical stored direction:
      // - FATHER/MOTHER/STEP_*: personId is parent, relatedPersonId is child.
      // - HUSBAND/WIFE/BROTHER/SISTER: personId is the named role holder.
      // - ADOPTED_CHILD: personId is adoptive parent, relatedPersonId is child.
      // - GUARDIAN: personId is guardian, relatedPersonId is ward.
      let personId = relative.id;
      let relatedPersonId = member.id;
      let type = request.relationshipType;

      if (['FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER'].includes(request.relationshipType)) {
        personId = member.id;
        relatedPersonId = relative.id;
      } else if (['SON', 'DAUGHTER'].includes(request.relationshipType)) {
        personId = relative.id;
        relatedPersonId = member.id;
        type = relative.gender === 'F' ? 'MOTHER' : 'FATHER';
      } else if (['STEP_SON', 'STEP_DAUGHTER'].includes(request.relationshipType)) {
        personId = relative.id;
        relatedPersonId = member.id;
        type = relative.gender === 'F' ? 'STEP_MOTHER' : 'STEP_FATHER';
      } else if (request.relationshipType === 'ADOPTED_CHILD') {
        personId = relative.id;
        relatedPersonId = member.id;
        type = 'ADOPTED_CHILD';
      } else if (request.relationshipType === 'GUARDIAN') {
        personId = relative.id;
        relatedPersonId = member.id;
        type = 'GUARDIAN';
      } else if (['HUSBAND', 'WIFE'].includes(request.relationshipType)) {
        // "I am X's Husband/Wife" → NewPerson is the HUSBAND/WIFE of Relative
        personId = member.id;
        relatedPersonId = relative.id;
        type = request.relationshipType;
      } else if (['BROTHER', 'SISTER'].includes(request.relationshipType)) {
        // "I am X's Brother/Sister" → NewPerson is the BROTHER/SISTER of Relative
        personId = member.id;
        relatedPersonId = relative.id;
        type = request.relationshipType;

        const parentRelationships = await tx.relationship.findMany({
          where: {
            familyId: request.familyId,
            relatedPersonId: relative.id,
            type: { in: BIO_PARENT_TYPES }
          }
        });

        for (const parentRel of parentRelationships) {
          await tx.relationship.create({
            data: {
              familyId: request.familyId,
              personId: parentRel.personId,
              relatedPersonId: member.id,
              type: parentRel.type
            }
          }).catch(() => {});
        }
      }

      await tx.relationship.create({
        data: {
          familyId: request.familyId,
          personId,
          relatedPersonId,
          type
        }
      });

      // 5. Update Join Request Status
      await tx.joinRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          createdMemberId: member.id
        }
      });

      return member;
    });

    // Notify requester User
    if (request.requesterUserId) {
      await sendNotification(
        req.app,
        request.requesterUserId,
        'JOIN_ACCEPTED',
        'Join Request Approved',
        `Your request to join the ${request.family.name} family tree has been approved!`,
        result.id
      );

      // Emit real-time status change to requester
      const io = req.app.get('io');
      if (io) {
        io.to(`member_${request.requesterUserId}`).emit('joinRequest.statusChanged', {
          requestId,
          status: 'APPROVED',
          familyName: request.family.name,
          memberId: result.id
        });
      }
    }

    // Emit to family room so admin panel updates in real-time
    const ioAccept = req.app.get('io');
    if (ioAccept) {
      ioAccept.to(`family_${request.familyId}`).emit('joinRequest.statusChanged', {
        requestId,
        status: 'APPROVED',
        familyName: request.family.name
      });
    }

    // Trigger generation calculation
    await recalculateFamilyGenerations(request.familyId);

    res.json({
      success: true,
      member: result
    });
  } catch (err) {
    next(err);
  }
};

export const rejectJoinRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const request = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: { family: true }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: { message: 'Join request not found', status: 404 }
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: { message: `This join request has already been ${request.status.toLowerCase()}`, status: 400 }
      });
    }

    // Verify user is a historian or founder of the family
    const membership = await prisma.familyMembership.findUnique({
      where: {
        familyId_memberId: {
          familyId: request.familyId,
          memberId: req.user.memberId
        }
      }
    });

    if (!membership || !['FOUNDER', 'HISTORIAN'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient family permission level', status: 403 }
      });
    }

    await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' }
    });

    // Notify requester User of rejection
    if (request.requesterUserId) {
      const body = reason 
        ? `Your request to join the ${request.family.name} family tree was rejected. Reason: ${reason}`
        : `Your request to join the ${request.family.name} family tree was not accepted.`;

      await sendNotification(
        req.app,
        request.requesterUserId,
        'JOIN_REJECTED',
        'Join Request Declined',
        body,
        request.id
      );

      // Emit real-time status change to requester
      const io = req.app.get('io');
      if (io) {
        io.to(`member_${request.requesterUserId}`).emit('joinRequest.statusChanged', {
          requestId,
          status: 'REJECTED',
          familyName: request.family.name,
          reason: reason || null
        });
      }
    }

    // Emit to family room so admin panel updates in real-time
    const ioReject = req.app.get('io');
    if (ioReject) {
      ioReject.to(`family_${request.familyId}`).emit('joinRequest.statusChanged', {
        requestId,
        status: 'REJECTED',
        familyName: request.family.name
      });
    }

    res.json({
      success: true,
      message: 'Join request rejected successfully'
    });
  } catch (err) {
    next(err);
  }
};

export const getMyJoinRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const requests = await prisma.joinRequest.findMany({
      where: { requesterUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        family: {
          select: { id: true, name: true, surname: true, familyId: true }
        }
      }
    });

    const enriched = await Promise.all(
      requests.map(async (r) => {
        let historianName = null;
        if (r.createdMemberId) {
          const member = await prisma.familyMember.findUnique({
            where: { id: r.createdMemberId },
            select: { fullName: true }
          });
          historianName = member?.fullName ?? null;
        }
        return {
          requestId: r.id,
          status: r.status,
          familyName: r.family?.name || 'Unknown Family',
          familySurname: r.family?.surname || '',
          familyReadableId: r.family?.familyId || '',
          relatedToMemberId: r.relatedToMemberId,
          relationshipType: r.relationshipType,
          historianName,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt
        };
      })
    );

    res.json({
      success: true,
      requests: enriched
    });
  } catch (err) {
    next(err);
  }
};

export const editJoinRequestRelationship = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { relationshipType } = req.body;

    if (!relationshipType) {
      return res.status(400).json({
        success: false,
        error: { message: 'Relationship type is required', status: 400 }
      });
    }

    const request = await prisma.joinRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: { message: 'Join request not found', status: 404 }
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: { message: `This join request has already been ${request.status.toLowerCase()}`, status: 400 }
      });
    }

    // Verify user is a historian or founder of the family
    const membership = await prisma.familyMembership.findUnique({
      where: {
        familyId_memberId: {
          familyId: request.familyId,
          memberId: req.user.memberId
        }
      }
    });

    if (!membership || !['FOUNDER', 'HISTORIAN'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient family permission level', status: 403 }
      });
    }

    const updatedRequest = await prisma.joinRequest.update({
      where: { id: requestId },
      data: { relationshipType }
    });

    res.json({
      success: true,
      request: updatedRequest
    });
  } catch (err) {
    next(err);
  }
};
