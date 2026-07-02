import crypto from 'crypto';
import QRCode from 'qrcode';
import prisma from '../config/database.js';
import { bucket } from '../config/firebase.js';
import { recalculateFamilyGenerations } from '../services/generationCalculator.service.js';
import { sendNotification } from '../services/notification.service.js';

const generateFamilyReadableId = (surname) => {
  const cleanSurname = surname.trim().replace(/[^a-zA-Z]/g, '').toUpperCase();
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `${cleanSurname}-${digits}`;
};

export const getAdminDashboard = async (req, res, next) => {
  try {
    const { familyId } = req.query;

    if (!familyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Family ID query parameter is required', status: 400 }
      });
    }

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Calculations
    const pendingRequestsCount = await prisma.joinRequest.count({
      where: { familyId, status: 'PENDING' }
    });

    const totalMembersCount = await prisma.familyMember.count({
      where: {
        memberships: { some: { familyId } },
        isDeleted: false
      }
    });

    const memoriesCount = await prisma.memory.count({
      where: { familyId, isDeleted: false }
    });

    const addedThisMonth = await prisma.familyMember.count({
      where: {
        memberships: { some: { familyId } },
        createdAt: { gte: firstDayOfMonth },
        isDeleted: false
      }
    });

    const memoriesThisMonth = await prisma.memory.count({
      where: {
        familyId,
        createdAt: { gte: firstDayOfMonth },
        isDeleted: false
      }
    });

    const firebaseStatus = !!bucket ? 'active' : 'local';

    // Recent activity logs (Audit Logs)
    const recentActivity = await prisma.auditLog.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        actor: {
          select: { id: true, fullName: true, profilePhoto: true }
        }
      }
    });

    res.json({
      success: true,
      stats: {
        pendingRequestsCount,
        totalMembersCount,
        memoriesCount,
        addedThisMonth,
        memoriesThisMonth,
        firebaseStatus
      },
      recentActivity
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminMembers = async (req, res, next) => {
  try {
    const { familyId } = req.query;

    if (!familyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Family ID is required', status: 400 }
      });
    }

    const members = await prisma.familyMember.findMany({
      where: {
        memberships: { some: { familyId } }
      },
      orderBy: { fullName: 'asc' }
    });

    res.json({
      success: true,
      members
    });
  } catch (err) {
    next(err);
  }
};

export const softDeleteMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { familyId } = req.body;

    if (!familyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Family ID is required', status: 400 }
      });
    }

    const updated = await prisma.familyMember.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    // Write to AuditLog
    await prisma.auditLog.create({
      data: {
        familyId,
        actorMemberId: req.user.memberId,
        action: 'DELETED_MEMBER',
        details: JSON.stringify({
          memberId: id,
          memberName: updated.fullName
        })
      }
    });

    res.json({
      success: true,
      member: updated
    });
  } catch (err) {
    next(err);
  }
};

export const restoreMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { familyId } = req.body;

    if (!familyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Family ID is required', status: 400 }
      });
    }

    const updated = await prisma.familyMember.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null
      }
    });

    // Write to AuditLog
    await prisma.auditLog.create({
      data: {
        familyId,
        actorMemberId: req.user.memberId,
        action: 'RESTORED_MEMBER',
        details: JSON.stringify({
          memberId: id,
          memberName: updated.fullName
        })
      }
    });

    res.json({
      success: true,
      member: updated
    });
  } catch (err) {
    next(err);
  }
};

const inferMemberGender = async (familyId, memberId) => {
  // First: check if gender is explicitly set on the member record
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { gender: true }
  });
  if (member?.gender === 'M') return 'M';
  if (member?.gender === 'F') return 'F';
  if (member?.gender === 'Other') return 'O';

  // Fallback: infer gender from relationship graph
  const maleRel = await prisma.relationship.findFirst({
    where: {
      familyId,
      OR: [
        { personId: memberId, type: { in: ['FATHER', 'STEP_FATHER', 'HUSBAND', 'BROTHER'] } },
        { relatedPersonId: memberId, type: 'WIFE' }
      ]
    }
  });
  if (maleRel) return 'M';

  const femaleRel = await prisma.relationship.findFirst({
    where: {
      familyId,
      OR: [
        { personId: memberId, type: { in: ['MOTHER', 'STEP_MOTHER', 'WIFE', 'SISTER'] } },
        { relatedPersonId: memberId, type: 'HUSBAND' }
      ]
    }
  });
  if (femaleRel) return 'F';

  return 'O';
};

export const editRelationship = async (req, res, next) => {
  try {
    const { familyId, personId, relatedPersonId, type } = req.body;

    if (!familyId || !personId || !relatedPersonId || !type) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing relationship parameters', status: 400 }
      });
    }

    let finalPersonId = personId;
    let finalRelatedPersonId = relatedPersonId;
    let finalType = type;

    // Normalization of relationship inputs to fit underlying parent-child model
    if (type === 'SON' || type === 'DAUGHTER') {
      // Source member (personId) is the Son/Daughter of Target member (relatedPersonId)
      // Normalized: Target (relatedPersonId) is Parent of Source (personId)
      finalPersonId = relatedPersonId;
      finalRelatedPersonId = personId;
      const parentGender = await inferMemberGender(familyId, relatedPersonId);
      finalType = parentGender === 'F' ? 'MOTHER' : 'FATHER';
    } else if (type === 'ADOPTED_CHILD') {
      // Source member (personId) is the Adopted Child of Target member (relatedPersonId)
      // Normalized: Target (relatedPersonId) is Parent of Source (personId)
      finalPersonId = relatedPersonId;
      finalRelatedPersonId = personId;
      finalType = 'ADOPTED_CHILD';
    } else if (type === 'GUARDIAN') {
      // Source member (personId) is the Ward of Target member (relatedPersonId)
      // Normalized: Target (relatedPersonId) is Guardian of Source (personId)
      finalPersonId = relatedPersonId;
      finalRelatedPersonId = personId;
      finalType = 'GUARDIAN';
    }

    // Check if a relationship already exists in either direction to prevent duplicate/conflicting records
    const existing = await prisma.relationship.findFirst({
      where: {
        familyId,
        OR: [
          { personId: finalPersonId, relatedPersonId: finalRelatedPersonId },
          { personId: finalRelatedPersonId, relatedPersonId: finalPersonId }
        ]
      }
    });

    let relationship;
    if (existing) {
      relationship = await prisma.relationship.update({
        where: { id: existing.id },
        data: {
          personId: finalPersonId,
          relatedPersonId: finalRelatedPersonId,
          type: finalType
        }
      });
    } else {
      relationship = await prisma.relationship.create({
        data: {
          familyId,
          personId: finalPersonId,
          relatedPersonId: finalRelatedPersonId,
          type: finalType
        }
      });
    }

    // Write to AuditLog
    await prisma.auditLog.create({
      data: {
        familyId,
        actorMemberId: req.user.memberId,
        action: 'EDITED_RELATIONSHIP',
        details: JSON.stringify({
          personId: finalPersonId,
          relatedPersonId: finalRelatedPersonId,
          type: finalType
        })
      }
    });

    // Trigger generation calculation
    await recalculateFamilyGenerations(familyId);

    // Emit relationship.updated to family room for real-time tree refresh
    const io = req.app.get('io');
    if (io) {
      io.to(`family_${familyId}`).emit('relationship.updated', {
        familyId,
        relationshipId: relationship.id,
        action: existing ? 'UPDATED' : 'CREATED',
        personId: finalPersonId,
        relatedPersonId: finalRelatedPersonId,
        type: finalType
      });
    }

    // Notify all family members with user accounts about the relationship change
    const familyMembers = await prisma.familyMembership.findMany({
      where: { familyId },
      include: { member: { include: { user: { select: { id: true } } } } }
    });

    const actorMember = await prisma.familyMember.findUnique({
      where: { id: req.user.memberId },
      select: { fullName: true }
    });
    const actorName = actorMember?.fullName || 'A historian';

    for (const fm of familyMembers) {
      const userId = fm.member?.user?.id;
      if (userId && userId !== req.user.id) {
        await sendNotification(
          req.app,
          userId,
          'PROFILE_UPDATED',
          'Relationship Updated',
          `${actorName} updated a family relationship in your tree.`,
          relationship.id
        ).catch(() => {});
      }
    }

    res.json({
      success: true,
      relationship
    });
  } catch (err) {
    next(err);
  }
};

export const deleteRelationship = async (req, res, next) => {
  try {
    const { familyId, relationshipId } = req.body;

    if (!familyId || !relationshipId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Family ID and Relationship ID are required', status: 400 }
      });
    }

    const relationship = await prisma.relationship.findUnique({
      where: { id: relationshipId }
    });

    if (!relationship) {
      return res.status(404).json({
        success: false,
        error: { message: 'Relationship not found', status: 404 }
      });
    }

    if (relationship.familyId !== familyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Relationship does not belong to this family', status: 400 }
      });
    }

    // Delete the relationship
    await prisma.relationship.delete({
      where: { id: relationshipId }
    });

    // Write to AuditLog
    await prisma.auditLog.create({
      data: {
        familyId,
        actorMemberId: req.user.memberId,
        action: 'DELETED_RELATIONSHIP',
        details: JSON.stringify({
          relationshipId,
          personId: relationship.personId,
          relatedPersonId: relationship.relatedPersonId,
          type: relationship.type
        })
      }
    });

    // Trigger generation calculation
    await recalculateFamilyGenerations(familyId);

    // Emit relationship.updated to family room for real-time tree refresh
    const io = req.app.get('io');
    if (io) {
      io.to(`family_${familyId}`).emit('relationship.updated', {
        familyId,
        relationshipId,
        action: 'DELETED',
        personId: relationship.personId,
        relatedPersonId: relationship.relatedPersonId,
        type: relationship.type
      });
    }

    res.json({
      success: true,
      message: 'Relationship deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminAuditLog = async (req, res, next) => {
  try {
    const { familyId, page = 1, limit = 20 } = req.query;

    if (!familyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Family ID is required', status: 400 }
      });
    }

    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);

    const logs = await prisma.auditLog.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * l,
      take: l,
      include: {
        actor: {
          select: { id: true, fullName: true, profilePhoto: true }
        }
      }
    });

    const total = await prisma.auditLog.count({ where: { familyId } });

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: p,
        limit: l,
        pages: Math.ceil(total / l)
      }
    });
  } catch (err) {
    next(err);
  }
};

export const appointHistorian = async (req, res, next) => {
  try {
    const { familyId, memberId } = req.body;

    if (!familyId || !memberId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Family ID and Member ID are required', status: 400 }
      });
    }

    // Update role to HISTORIAN
    const membership = await prisma.familyMembership.update({
      where: {
        familyId_memberId: {
          familyId,
          memberId
        }
      },
      data: {
        role: 'HISTORIAN'
      },
      include: {
        member: { select: { fullName: true } }
      }
    });

    // Write to AuditLog
    await prisma.auditLog.create({
      data: {
        familyId,
        actorMemberId: req.user.memberId,
        action: 'EDITED_PROFILE',
        details: JSON.stringify({
          appointedHistorianId: memberId,
          appointedHistorianName: membership.member.fullName
        })
      }
    });

    res.json({
      success: true,
      membership
    });
  } catch (err) {
    next(err);
  }
};

export const updateFamilySettings = async (req, res, next) => {
  try {
    const { familyId, name, description, originVillageCity, coverPhoto, regenerateLinks } = req.body;

    if (!familyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Family ID is required', status: 400 }
      });
    }

    const currentFamily = await prisma.family.findUnique({
      where: { id: familyId }
    });

    if (!currentFamily) {
      return res.status(404).json({
        success: false,
        error: { message: 'Family not found', status: 404 }
      });
    }

    const data = {
      name: name || currentFamily.name,
      description: description !== undefined ? description : currentFamily.description,
      originVillageCity: originVillageCity !== undefined ? originVillageCity : currentFamily.originVillageCity,
      coverPhoto: coverPhoto !== undefined ? coverPhoto : currentFamily.coverPhoto
    };

    if (regenerateLinks === true || regenerateLinks === 'true') {
      const newFamilyId = generateFamilyReadableId(name || currentFamily.surname || 'FAMILY');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      data.familyId = newFamilyId;
      data.shareableLink = `${frontendUrl}/join/${newFamilyId}`;
      data.qrCodeUrl = await QRCode.toDataURL(data.shareableLink);
    }

    const updated = await prisma.family.update({
      where: { id: familyId },
      data
    });

    // Write to AuditLog
    await prisma.auditLog.create({
      data: {
        familyId,
        actorMemberId: req.user.memberId,
        action: 'EDITED_PROFILE',
        details: JSON.stringify({
          updatedFamilySettings: true,
          regenerateLinks
        })
      }
    });

    res.json({
      success: true,
      family: updated
    });
  } catch (err) {
    next(err);
  }
};

export const getHealthCheck = async (req, res, next) => {
  try {
    const firebaseStatus = !!bucket ? 'active' : 'local';
    res.json({
      success: true,
      firebaseStatus
    });
  } catch (err) {
    next(err);
  }
};
