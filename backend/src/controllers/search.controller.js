import prisma from '../config/database.js';
import { calculateRelationship } from '../services/relationshipCalculator.service.js';

export const searchFamily = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    const { q, generation, village, occupation, bloodGroup, isDeceased } = req.query;
    const viewerId = req.user?.memberId;

    if (!viewerId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Authentication required for search', status: 403 }
      });
    }

    // 1. Verify family membership
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
        error: { message: 'Only family members can search the archive', status: 403 }
      });
    }

    const isHistorian = ['FOUNDER', 'HISTORIAN'].includes(membership.role);

    // 2. Build query filters
    const where = {
      memberships: {
        some: { familyId }
      },
      isDeleted: false
    };

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { surname: { contains: q, mode: 'insensitive' } }
      ];
    }

    if (generation) {
      where.generationNumber = parseInt(generation, 10);
    }

    if (village) {
      where.birthVillageCity = { contains: village, mode: 'insensitive' };
    }

    if (occupation) {
      where.occupation = { contains: occupation, mode: 'insensitive' };
    }

    if (bloodGroup) {
      where.bloodGroup = { equals: bloodGroup, mode: 'insensitive' };
    }

    if (isDeceased !== undefined && isDeceased !== '') {
      const deceasedBool = isDeceased === 'true' || isDeceased === true;
      where.isLiving = !deceasedBool;
    }

    // 3. Query records
    const members = await prisma.familyMember.findMany({
      where,
      include: {
        privacySettings: true
      }
    });

    // 4. Map results with relationship calculation and privacy filters
    const results = [];
    for (const m of members) {
      let rel = '';
      if (viewerId === m.id) {
        rel = 'You';
      } else {
        const computed = await calculateRelationship(familyId, viewerId, m.id);
        rel = computed?.label || computed || '';
      }

      const privacy = m.privacySettings;
      const isSelf = viewerId === m.id;

      const filtered = {
        id: m.id,
        fullName: m.fullName,
        profilePhoto: (privacy?.hidePhotos && !isSelf && !isHistorian) ? null : m.profilePhoto,
        generationNumber: m.generationNumber,
        birthVillageCity: m.birthVillageCity,
        isLiving: m.isLiving,
        relationship: rel
      };

      if (m.occupation) {
        if (!privacy?.hideOccupation || isSelf || isHistorian) {
          filtered.occupation = m.occupation;
        }
      }

      results.push(filtered);
    }

    res.json({
      success: true,
      results
    });
  } catch (err) {
    next(err);
  }
};
