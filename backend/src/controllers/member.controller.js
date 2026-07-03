import prisma from '../config/database.js';
import { calculateRelationship } from '../services/relationshipCalculator.service.js';
import { recalculateFamilyGenerations } from '../services/generationCalculator.service.js';

const isFutureDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date > today;
};

const isBefore = (value, comparison) => {
  if (!value || !comparison) return false;
  return new Date(value).getTime() < new Date(comparison).getTime();
};

// ─── GET /families/:familyId/members  (accessible to all family members) ───
export const getFamilyMembers = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    const memberships = await prisma.familyMembership.findMany({
      where: { familyId },
      include: { member: { select: { id: true, fullName: true, profilePhoto: true, isLiving: true } } }
    });
    const members = memberships
      .map(m => ({ ...m.member }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    res.json({ success: true, members });
  } catch (err) {
    next(err);
  }
};

// ─── GET /families/:familyId/relationship  (any authenticated member) ─────
export const findRelationship = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    const { sourceId, targetId } = req.query;

    if (!sourceId || !targetId) {
      return res.status(400).json({
        success: false,
        error: { message: 'sourceId and targetId are required', status: 400 }
      });
    }

    if (sourceId === targetId) {
      return res.json({ success: true, label: 'Self', path: [], explanation: 'Same person selected.' });
    }

    // Verify both members belong to this family
    const memberships = await prisma.familyMembership.findMany({
      where: { familyId, memberId: { in: [sourceId, targetId] } }
    });
    if (memberships.length < 2) {
      return res.status(404).json({
        success: false,
        error: { message: 'One or both members not found in this family', status: 404 }
      });
    }

    const result = await calculateRelationship(familyId, sourceId, targetId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getFamilyTree = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    const { shareableLink } = req.query;

    // Verify family exists
    const family = await prisma.family.findUnique({
      where: { id: familyId }
    });
    if (!family) {
      return res.status(404).json({
        success: false,
        error: { message: 'Family not found', status: 404 }
      });
    }

    // Determine viewer role
    let isLinkViewer = false;
    if (!req.user && shareableLink) {
      if (family.shareableLink === shareableLink) {
        isLinkViewer = true;
      } else {
        return res.status(403).json({
          success: false,
          error: { message: 'Invalid shareable link', status: 403 }
        });
      }
    } else if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required', status: 401 }
      });
    }

    // Fetch members belonging to this family
    const memberships = await prisma.familyMembership.findMany({
      where: { familyId },
      include: {
        member: {
          include: {
            user: { select: { email: true } }
          }
        }
      }
    });

    const members = memberships.map(m => {
      const member = {
        id:               m.member.id,
        fullName:         m.member.fullName,
        nickname:         m.member.nickname,
        profilePhoto:     m.member.profilePhoto,
        dob:              m.member.dob,
        deathDate:        m.member.deathDate,
        isLiving:         m.member.isLiving,
        generationNumber: m.member.generationNumber || 1,
        role:             m.role,
        isPrimary:        m.isPrimary
      };

      // Strip sensitive data for link viewers
      if (isLinkViewer) {
        member.email = null;
        member.dob = m.member.dob ? new Date(m.member.dob).getFullYear() + '-01-01' : null;
      } else {
        member.email = m.member.email || m.member.user?.email || null;
      }

      return member;
    });

    // Fetch relationships in this family
    const relationships = await prisma.relationship.findMany({
      where: { familyId },
      select: {
        id:              true,
        personId:        true,
        relatedPersonId: true,
        type:            true
      }
    });

    // Return raw data — the frontend treeLayout.js runs the layout algorithm
    res.json({
      success:       true,
      members,
      relationships,
      isLinkViewer
    });
  } catch (err) {
    next(err);
  }
};

export const addFamilyMember = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    const {
      fullName,
      nickname,
      dob,
      gender,
      birthPlace,
      birthVillageCity,
      bloodGroup,
      occupation,
      education,
      phone,
      email,
      isLiving,
      deathDate,
      causeOfDeath,
      bio,
      relativeId,
      relationshipType
    } = req.body;

    if (!fullName) {
      return res.status(400).json({
        success: false,
        error: { message: 'Full name is required', status: 400 }
      });
    }

    if (!dob) {
      return res.status(400).json({
        success: false,
        error: { message: 'Date of birth is required', status: 400 }
      });
    }

    if (!gender) {
      return res.status(400).json({
        success: false,
        error: { message: 'Gender is required', status: 400 }
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: { message: 'Phone is required', status: 400 }
      });
    }

    // Validate DOB and deathDate
    if (dob && isFutureDate(dob)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Date of birth cannot be in the future', status: 400 }
      });
    }
    if (deathDate && isFutureDate(deathDate)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Date of death cannot be in the future', status: 400 }
      });
    }
    if (dob && deathDate && isBefore(deathDate, dob)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Date of death cannot be before date of birth', status: 400 }
      });
    }

    // Verify family context
    const family = await prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      return res.status(404).json({
        success: false,
        error: { message: 'Family not found', status: 404 }
      });
    }

    // Resolve relative profile if provided
    let relative = null;
    if (relativeId) {
      relative = await prisma.familyMember.findUnique({
        where: { id: relativeId }
      });
      if (!relative) {
        return res.status(404).json({
          success: false,
          error: { message: 'Relative member reference not found', status: 404 }
        });
      }
    }

    // Calculate Generation Number based on new member's relationship to relative
    let generationNumber = 1;
    if (relative) {
      const relGen = relative.generationNumber || 1;
      if (['FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER'].includes(relationshipType)) {
        // New member is Parent of relative: generation = relative gen - 1
        generationNumber = relGen - 1;
      } else if (['CHILD', 'ADOPTED_CHILD', 'GUARDIAN'].includes(relationshipType)) {
        // New member is Child of relative: generation = relative gen + 1
        generationNumber = relGen + 1;
      } else if (['SPOUSE', 'HUSBAND', 'WIFE', 'BROTHER', 'SISTER', 'SIBLING'].includes(relationshipType)) {
        // Sibling or Spouse is on the same generation tier
        generationNumber = relGen;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create Member
      const newMember = await tx.familyMember.create({
        data: {
          fullName,
          nickname: nickname || null,
          dob: dob ? new Date(dob) : null,
          birthPlace: birthPlace || null,
          birthVillageCity: birthVillageCity || null,
          bloodGroup: bloodGroup || null,
          occupation: occupation || null,
          education: education || null,
          phone: phone || null,
          email: email || null,
          isLiving: isLiving !== undefined ? isLiving : true,
          deathDate: deathDate ? new Date(deathDate) : null,
          causeOfDeath: causeOfDeath || null,
          bio: bio || null,
          generationNumber,
          privacySettings: { create: {} }
        }
      });

      // Assign FamilyMembership
      await tx.familyMembership.create({
        data: {
          familyId,
          memberId: newMember.id,
          role: 'MEMBER'
        }
      });

      // Bind Relationship
      if (relative && relationshipType) {
        let personId = relative.id;
        let relatedPersonId = newMember.id;
        let finalType = relationshipType;

        if (['FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER'].includes(relationshipType)) {
          // New member is Parent (personId should be parent i.e. newMember, relatedPersonId should be child i.e. relative)
          personId = newMember.id;
          relatedPersonId = relative.id;
          finalType = relationshipType;
        } else if (['CHILD', 'ADOPTED_CHILD', 'GUARDIAN'].includes(relationshipType)) {
          // New member is Child (personId should be parent i.e. relative, relatedPersonId should be child i.e. newMember)
          personId = relative.id;
          relatedPersonId = newMember.id;
          
          if (relationshipType === 'CHILD') {
            // Find parent relative's gender to use FATHER or MOTHER
            const relativeGender = await tx.relationship.findFirst({
              where: {
                personId: relative.id,
                type: { in: ['FATHER', 'STEP_FATHER', 'HUSBAND'] }
              }
            }) ? 'M' : 'F';
            finalType = relativeGender === 'M' ? 'FATHER' : 'MOTHER';
          }
        } else if (['SPOUSE', 'HUSBAND', 'WIFE'].includes(relationshipType)) {
          personId = relative.id;
          relatedPersonId = newMember.id;
        } else if (['BROTHER', 'SISTER', 'SIBLING'].includes(relationshipType)) {
          personId = relative.id;
          relatedPersonId = newMember.id;
          
          // Optionally link new member to same parents as relative if parents exist
          const parentRelationships = await tx.relationship.findMany({
            where: {
              relatedPersonId: relative.id,
              type: { in: ['FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER', 'ADOPTED_CHILD'] }
            }
          });
          
          for (const parentRel of parentRelationships) {
            await tx.relationship.create({
              data: {
                familyId,
                personId: parentRel.personId,
                relatedPersonId: newMember.id,
                type: parentRel.type
              }
            }).catch(() => {}); // ignore duplicates
          }
        }

        await tx.relationship.create({
          data: {
            familyId,
            personId,
            relatedPersonId,
            type: finalType
          }
        });
      }

      return newMember;
    });

    // Trigger generation calculation
    await recalculateFamilyGenerations(familyId);

    // Emit relationship.updated to family room for real-time tree refresh
    const io = req.app.get('io');
    if (io) {
      io.to(`family_${familyId}`).emit('relationship.updated', {
        familyId,
        action: 'CREATED',
        memberId: result.id,
        memberName: result.fullName
      });
    }

    res.status(201).json({
      success: true,
      member: result
    });
  } catch (err) {
    next(err);
  }
};

import { bucket } from '../config/firebase.js';
import { uploadFile } from '../services/firebaseStorage.service.js';

export const getMemberProfile = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { sourceMemberId, familyId, shareableLink } = req.query;

    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: {
        privacySettings: true,
        timelineEvents: {
          orderBy: { eventDate: 'asc' }
        },
        memberships: {
          include: {
            family: {
              select: {
                id: true,
                name: true,
                surname: true
              }
            }
          }
        }
      }
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member profile not found', status: 404 }
      });
    }

    // Determine Viewer Role
    let viewerRole = null; // 'OWNER', 'HISTORIAN', 'FAMILY_MEMBER', 'LINK_VIEWER'

    // 1. Check Link Viewer Access
    if (shareableLink && familyId) {
      const family = await prisma.family.findUnique({
        where: { id: familyId }
      });
      if (family && family.shareableLink === shareableLink) {
        viewerRole = 'LINK_VIEWER';
      }
    }

    // 2. Check Logged-in User Role
    if (req.user) {
      if (req.user.memberId === memberId) {
        viewerRole = 'OWNER';
      } else {
        // Find common family memberships
        const memberFamilies = member.memberships.map(m => m.familyId);
        
        // Find viewer memberships in those families
        const viewerMemberships = await prisma.familyMembership.findMany({
          where: {
            memberId: req.user.memberId,
            familyId: { in: memberFamilies }
          }
        });

        if (viewerMemberships.length > 0) {
          // Check if viewer has Historian or Founder roles in any of these common families
          const hasHistorianRole = viewerMemberships.some(vm => ['FOUNDER', 'HISTORIAN'].includes(vm.role));
          viewerRole = hasHistorianRole ? 'HISTORIAN' : 'FAMILY_MEMBER';
        }
      }
    }

    if (!viewerRole) {
      return res.status(403).json({
        success: false,
        error: { message: 'Non-members cannot view profiles', status: 403 }
      });
    }

    // Fetch Spouse, Parents, Children lists
    const RELATIVE_SELECT = {
      id: true, fullName: true, profilePhoto: true, dob: true, isLiving: true, generationNumber: true
    };

    const parentsRels = await prisma.relationship.findMany({
      where: {
        relatedPersonId: memberId,
        type: { in: ['FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER', 'ADOPTED_CHILD'] }
      },
      include: { person: { select: RELATIVE_SELECT } }
    });

    const childrenRels = await prisma.relationship.findMany({
      where: {
        personId: memberId,
        type: { in: ['FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER', 'ADOPTED_CHILD'] }
      },
      include: { relatedPerson: { select: RELATIVE_SELECT } }
    });

    const spouseRels = await prisma.relationship.findMany({
      where: {
        OR: [
          { personId: memberId },
          { relatedPersonId: memberId }
        ],
        type: { in: ['HUSBAND', 'WIFE'] }
      },
      include: {
        person: { select: RELATIVE_SELECT },
        relatedPerson: { select: RELATIVE_SELECT }
      }
    });

    const mapRelBasic = (p) => ({
      id: p.id, fullName: p.fullName, profilePhoto: p.profilePhoto,
      dob: p.dob, isLiving: p.isLiving, generationNumber: p.generationNumber
    });

    const parents = parentsRels.map(r => ({ ...mapRelBasic(r.person), relationship: r.type, relId: r.id }));
    const children = childrenRels.map(r => ({ ...mapRelBasic(r.relatedPerson), relationship: r.type, relId: r.id }));
    const spouses = spouseRels.map(r => {
      const spouseNode = r.personId === memberId ? r.relatedPerson : r.person;
      return { ...mapRelBasic(spouseNode), relationship: r.type, relId: r.id };
    });

    // Fetch Siblings: members who share at least one parent
    const parentIds = parents.map(p => p.id);
    let siblings = [];
    if (parentIds.length > 0) {
      const siblingRels = await prisma.relationship.findMany({
        where: {
          personId: { in: parentIds },
          relatedPersonId: { not: memberId },
          type: { in: ['FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER', 'ADOPTED_CHILD'] }
        },
        include: { relatedPerson: { select: { id: true, fullName: true } } }
      });
      const seenSiblings = new Set();
      siblings = siblingRels.map(r => ({
        id: r.relatedPerson.id,
        fullName: r.relatedPerson.fullName
      })).filter(s => {
        if (seenSiblings.has(s.id)) return false;
        seenSiblings.add(s.id);
        return true;
      });
    }

    // Auto-generate Default Timeline Milestones
    const milestones = [];
    if (member.dob) {
      milestones.push({
        id: 'born',
        title: 'Born',
        description: member.birthPlace ? `Born in ${member.birthPlace}` : 'Entered the world',
        eventDate: member.dob,
        iconType: 'BORN',
        isCustom: false
      });
    }
    if (!member.isLiving && member.deathDate) {
      milestones.push({
        id: 'death',
        title: 'Deceased 🕊',
        description: member.causeOfDeath ? `Passed away due to ${member.causeOfDeath}` : 'Passed away',
        eventDate: member.deathDate,
        iconType: 'DEATH',
        isCustom: false
      });
    }

    // Merge Milestones with custom events and sort chronologically
    const dbEvents = member.timelineEvents.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      eventDate: e.eventDate,
      iconType: e.type,
      isCustom: true
    }));

    const timeline = [...milestones, ...dbEvents].sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

    // Auto-calculate relationship context if requested
    let calculatedRel = '';
    if (sourceMemberId && familyId) {
      calculatedRel = await calculateRelationship(familyId, sourceMemberId, memberId);
    }

    // Apply Privacy Filters
    const privacy = member.privacySettings;
    const baseProfile = {
      id: member.id,
      fullName: member.fullName,
      nickname: member.nickname,
      dob: member.dob,
      birthPlace: member.birthPlace,
      birthVillageCity: member.birthVillageCity,
      bloodGroup: member.bloodGroup,
      occupation: member.occupation,
      education: member.education,
      phone: member.phone,
      email: member.email,
      isLiving: member.isLiving,
      deathDate: member.deathDate,
      causeOfDeath: member.causeOfDeath,
      bio: member.bio,
      profilePhoto: member.profilePhoto,
      parents,
      children,
      spouses,
      siblings,
      generationNumber: member.generationNumber,
      families: member.memberships.map(m => m.family),
      timeline,
      calculatedRelationship: calculatedRel?.label || calculatedRel || '',
      calculatedRelationshipPath: calculatedRel?.path || [],
      calculatedRelationshipExplanation: calculatedRel?.explanation || '',
      role: viewerRole
    };

    if (viewerRole === 'OWNER' || viewerRole === 'HISTORIAN') {
      return res.json({ success: true, member: baseProfile });
    }

    if (viewerRole === 'FAMILY_MEMBER') {
      if (privacy?.hidePhone) baseProfile.phone = null;
      if (privacy?.hideEmail) baseProfile.email = null;
      if (privacy?.hideDob) baseProfile.dob = null;
      if (privacy?.hideOccupation) baseProfile.occupation = null;
      if (privacy?.hidePhotos) baseProfile.profilePhoto = null;
      return res.json({ success: true, member: baseProfile });
    }

    if (viewerRole === 'LINK_VIEWER') {
      // Link viewers see basic info with full date fields for frontend compatibility
      // but sensitive fields (phone, email, occupation, etc.) are excluded
      const linkProfile = {
        id: member.id,
        fullName: member.fullName,
        nickname: member.nickname,
        isLiving: member.isLiving,
        dob: member.dob,
        deathDate: member.deathDate,
        birthYear: member.dob ? new Date(member.dob).getFullYear() : null,
        deathYear: (!member.isLiving && member.deathDate) ? new Date(member.deathDate).getFullYear() : null,
        profilePhoto: privacy?.hidePhotos ? null : member.profilePhoto,
        generationNumber: member.generationNumber,
        spouses,
        parents,
        children,
        siblings,
        calculatedRelationship: calculatedRel?.label || calculatedRel || '',
        calculatedRelationshipPath: calculatedRel?.path || [],
        calculatedRelationshipExplanation: calculatedRel?.explanation || '',
        role: viewerRole
      };
      return res.json({ success: true, member: linkProfile });
    }

  } catch (err) {
    next(err);
  }
};

export const updateMemberProfile = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const {
      fullName,
      nickname,
      gender,
      dob,
      birthPlace,
      birthVillageCity,
      bloodGroup,
      occupation,
      education,
      phone,
      email,
      isLiving,
      deathDate,
      causeOfDeath,
      bio
    } = req.body;

    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: { memberships: true }
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member profile not found', status: 404 }
      });
    }

    // Editing Rules check
    let isAuthorized = false;

    // Rule 1: A user can edit their OWN profile if they are living
    if (req.user.memberId === memberId && member.isLiving) {
      isAuthorized = true;
    } else {
      // Rule 2: Historian/Founder can edit deceased profiles or edit factual details
      const memberFamilies = member.memberships.map(m => m.familyId);
      const viewerMemberships = await prisma.familyMembership.findMany({
        where: {
          memberId: req.user.memberId,
          familyId: { in: memberFamilies }
        }
      });
      const hasHistorianRole = viewerMemberships.some(vm => ['FOUNDER', 'HISTORIAN'].includes(vm.role));

      if (hasHistorianRole) {
        // Locked from editing by others UNLESS they are deceased or correcting details
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized to modify this profile', status: 403 }
      });
    }

    // Validate DOB and deathDate
    if (dob && isFutureDate(dob)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Date of birth cannot be in the future', status: 400 }
      });
    }
    if (deathDate && isFutureDate(deathDate)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Date of death cannot be in the future', status: 400 }
      });
    }
    if (dob && deathDate && isBefore(deathDate, dob)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Date of death cannot be before date of birth', status: 400 }
      });
    }

    const updated = await prisma.familyMember.update({
      where: { id: memberId },
      data: {
        fullName,
        nickname: nickname || null,
        dob: dob ? new Date(dob) : null,
        birthPlace: birthPlace || null,
        birthVillageCity: birthVillageCity || null,
        bloodGroup: bloodGroup || null,
        occupation: occupation || null,
        education: education || null,
        phone: phone || null,
        email: email || null,
        isLiving: isLiving !== undefined ? isLiving : true,
        deathDate: deathDate ? new Date(deathDate) : null,
        causeOfDeath: causeOfDeath || null,
        bio: bio || null,
        gender: gender || null
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

export const updatePrivacySettings = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { hidePhone, hideEmail, hideDob, hideOccupation, hidePhotos } = req.body;

    // Rule: Neither can edit another member's privacy settings. ONLY owner can edit!
    if (req.user.memberId !== memberId) {
      return res.status(403).json({
        success: false,
        error: { message: 'You can only update your own privacy settings', status: 403 }
      });
    }

    const updated = await prisma.privacySettings.upsert({
      where: { memberId },
      update: {
        hidePhone: hidePhone ?? false,
        hideEmail: hideEmail ?? false,
        hideDob: hideDob ?? false,
        hideOccupation: hideOccupation ?? false,
        hidePhotos: hidePhotos ?? false
      },
      create: {
        memberId,
        hidePhone: hidePhone ?? false,
        hideEmail: hideEmail ?? false,
        hideDob: hideDob ?? false,
        hideOccupation: hideOccupation ?? false,
        hidePhotos: hidePhotos ?? false
      }
    });

    res.json({
      success: true,
      privacy: updated
    });
  } catch (err) {
    next(err);
  }
};

export const addTimelineEvent = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { title, description, eventDate, type: eventType } = req.body;

    if (!title || !eventDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Title and event date are required', status: 400 }
      });
    }

    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: { memberships: true }
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member profile not found', status: 404 }
      });
    }

    // Verify authorized (Owner or Historian of their family)
    let isAuthorized = req.user.memberId === memberId;
    if (!isAuthorized) {
      const commonFamilies = member.memberships.map(m => m.familyId);
      const viewerMemberships = await prisma.familyMembership.findMany({
        where: {
          memberId: req.user.memberId,
          familyId: { in: commonFamilies }
        }
      });
      isAuthorized = viewerMemberships.some(vm => ['FOUNDER', 'HISTORIAN'].includes(vm.role));
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized to add timeline events', status: 403 }
      });
    }

    const event = await prisma.timelineEvent.create({
      data: {
        memberId,
        title,
        description: description || null,
        eventDate: new Date(eventDate),
        type: eventType || 'CUSTOM',
        isCustom: true
      }
    });

    res.status(201).json({
      success: true,
      event
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTimelineEvent = async (req, res, next) => {
  try {
    const { memberId, eventId } = req.params;

    const event = await prisma.timelineEvent.findUnique({
      where: { id: eventId }
    });

    if (!event || event.memberId !== memberId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Timeline event not found for this member', status: 404 }
      });
    }

    // Verify authorized (Owner or Historian of their family)
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: { memberships: true }
    });

    let isAuthorized = req.user.memberId === memberId;
    if (!isAuthorized && member) {
      const commonFamilies = member.memberships.map(m => m.familyId);
      const viewerMemberships = await prisma.familyMembership.findMany({
        where: {
          memberId: req.user.memberId,
          familyId: { in: commonFamilies }
        }
      });
      isAuthorized = viewerMemberships.some(vm => ['FOUNDER', 'HISTORIAN'].includes(vm.role));
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized to remove timeline events', status: 403 }
      });
    }

    await prisma.timelineEvent.delete({
      where: { id: eventId }
    });

    res.json({
      success: true,
      message: 'Timeline event deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

export const uploadProfilePhoto = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No image file attached', status: 400 }
      });
    }



    const member = await prisma.familyMember.findUnique({
      where: { id: memberId }
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member profile not found', status: 404 }
      });
    }

    // Verify ownership or editor role (Historian/Founder)
    let hasPermission = req.user.memberId === memberId;
    if (!hasPermission) {
      const targetMemberships = await prisma.familyMembership.findMany({
        where: { memberId }
      });
      const targetFamilyIds = targetMemberships.map(m => m.familyId);

      const userEditorMembership = await prisma.familyMembership.findFirst({
        where: {
          memberId: req.user.memberId,
          familyId: { in: targetFamilyIds },
          role: { in: ['FOUNDER', 'HISTORIAN'] }
        }
      });
      if (userEditorMembership) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: { message: 'You do not have permission to upload photos for this member', status: 403 }
      });
    }

    const photoUrl = await uploadFile(req.file, 'avatars');

    const updated = await prisma.familyMember.update({
      where: { id: memberId },
      data: { profilePhoto: photoUrl }
    });

    res.json({
      success: true,
      profilePhoto: photoUrl
    });
  } catch (err) {
    next(err);
  }
};

// ─── Core Family helpers ────────────────────────────────────────────────────

const MEMBER_SELECT = {
  id: true,
  fullName: true,
  profilePhoto: true,
  dob: true,
  isLiving: true,
  deathDate: true,
  gender: true,
  privacySettings: true
};

const PARENT_TYPES = ['FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER', 'ADOPTED_CHILD', 'GUARDIAN'];
const BIOLOGICAL_PARENT_TYPES = ['FATHER', 'MOTHER'];
const CHILD_TYPES = ['FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER', 'ADOPTED_CHILD', 'GUARDIAN'];
const SPOUSE_TYPES = ['HUSBAND', 'WIFE'];

function resolveViewerRole(req, member, { familyId, shareableLink }, linkViewerGranted) {
  let viewerRole = linkViewerGranted ? 'LINK_VIEWER' : null;

  if (req.user) {
    if (req.user.memberId === member.id) {
      viewerRole = 'OWNER';
    } else if (!viewerRole || viewerRole === 'LINK_VIEWER') {
      const memberFamilies = member.memberships.map(m => m.familyId);
      const viewerMemberships = req.user.memberships?.filter(vm =>
        memberFamilies.includes(vm.familyId)
      ) || [];

      if (viewerMemberships.length > 0) {
        const hasHistorianRole = viewerMemberships.some(vm =>
          ['FOUNDER', 'HISTORIAN'].includes(vm.role)
        );
        viewerRole = hasHistorianRole ? 'HISTORIAN' : 'FAMILY_MEMBER';
      }
    }
  }

  return viewerRole;
}

function sanitizeRelativeFields(member, viewerRole, viewerMemberId) {
  const privacy = member.privacySettings;
  const isSelf = member.id === viewerMemberId;

  const base = {
    id: member.id,
    fullName: member.fullName,
    profilePhoto: member.profilePhoto,
    dob: member.dob,
    isLiving: member.isLiving,
    deathDate: member.deathDate,
    gender: member.gender
  };

  if (viewerRole === 'OWNER' || viewerRole === 'HISTORIAN' || isSelf) {
    return base;
  }

  if (viewerRole === 'FAMILY_MEMBER') {
    if (privacy?.hidePhotos) base.profilePhoto = null;
    if (privacy?.hideDob) base.dob = null;
    return base;
  }

  if (viewerRole === 'LINK_VIEWER') {
    if (privacy?.hidePhotos) base.profilePhoto = null;
    if (privacy?.hideDob) {
      base.dob = null;
    }
    return base;
  }

  return base;
}

function childGenderLabel(gender) {
  if (gender === 'M') return 'Son';
  if (gender === 'F') return 'Daughter';
  return 'Child';
}

function siblingGenderLabel(gender) {
  if (gender === 'M') return 'Brother';
  if (gender === 'F') return 'Sister';
  return 'Sibling';
}

function spouseGenderLabel(gender, type) {
  if (type === 'HUSBAND') return 'Husband';
  if (type === 'WIFE') return 'Wife';
  if (gender === 'M') return 'Husband';
  if (gender === 'F') return 'Wife';
  return 'Spouse';
}

function parentTypeLabel(type) {
  const labels = {
    FATHER: 'Father',
    MOTHER: 'Mother',
    STEP_FATHER: 'Step-Father',
    STEP_MOTHER: 'Step-Mother',
    ADOPTED_CHILD: 'Adoptive Parent',
    GUARDIAN: 'Guardian'
  };
  return labels[type] || type;
}

function childTypeLabel(type, childGender) {
  const base = childGenderLabel(childGender);
  if (type === 'STEP_FATHER' || type === 'STEP_MOTHER') return `Step-${base}`;
  if (type === 'ADOPTED_CHILD') return `Adopted ${base}`;
  if (type === 'GUARDIAN') return 'Ward';
  return base;
}

function grandparentLabel(type, side) {
  const sidePrefix = side === 'paternal' ? 'Paternal' : 'Maternal';
  if (type === 'FATHER') return `${sidePrefix} Grandfather`;
  if (type === 'MOTHER') return `${sidePrefix} Grandmother`;
  return `${sidePrefix} Grandparent`;
}

function toRelative(member, relationshipLabel, viewerRole, viewerMemberId) {
  return {
    ...sanitizeRelativeFields(member, viewerRole, viewerMemberId),
    relationshipLabel
  };
}

async function fetchGrandparents(parentId, side, familyIds, viewerRole, viewerMemberId) {
  if (!parentId) return [];

  const gpRels = await prisma.relationship.findMany({
    where: {
      familyId: { in: familyIds },
      relatedPersonId: parentId,
      type: { in: BIOLOGICAL_PARENT_TYPES }
    },
    include: { person: { select: MEMBER_SELECT } }
  });

  return gpRels.map(r => toRelative(
    r.person,
    grandparentLabel(r.type, side),
    viewerRole,
    viewerMemberId
  ));
}

async function fetchBiologicalSiblings(memberId, bioParentIds, familyIds, viewerRole, viewerMemberId) {
  if (bioParentIds.length === 0) return [];

  const siblingSets = await Promise.all(
    bioParentIds.map(parentId =>
      prisma.relationship.findMany({
        where: {
          familyId: { in: familyIds },
          personId: parentId,
          relatedPersonId: { not: memberId },
          type: { in: BIOLOGICAL_PARENT_TYPES }
        },
        include: { relatedPerson: { select: MEMBER_SELECT } }
      })
    )
  );

  const siblingCounts = new Map();
  for (const rels of siblingSets) {
    for (const r of rels) {
      siblingCounts.set(r.relatedPerson.id, (siblingCounts.get(r.relatedPerson.id) || 0) + 1);
    }
  }

  const requiredMatches = bioParentIds.length;
  const seen = new Set();
  const siblings = [];

  for (const rels of siblingSets) {
    for (const r of rels) {
      const sib = r.relatedPerson;
      if (seen.has(sib.id)) continue;
      if (siblingCounts.get(sib.id) !== requiredMatches) continue;
      seen.add(sib.id);
      siblings.push(toRelative(
        sib,
        siblingGenderLabel(sib.gender),
        viewerRole,
        viewerMemberId
      ));
    }
  }

  return siblings;
}

export const getCoreFamily = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { familyId, shareableLink } = req.query;

    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: {
        privacySettings: true,
        memberships: {
          include: {
            family: { select: { id: true, name: true, surname: true, shareableLink: true } }
          }
        }
      }
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member profile not found', status: 404 }
      });
    }

    let linkViewerGranted = false;
    if (shareableLink && familyId) {
      const family = await prisma.family.findUnique({ where: { id: familyId } });
      if (family && family.shareableLink === shareableLink) {
        linkViewerGranted = true;
      }
    }

    const viewerRole = resolveViewerRole(req, member, { familyId, shareableLink }, linkViewerGranted);
    if (!viewerRole) {
      return res.status(403).json({
        success: false,
        error: { message: 'Non-members cannot view profiles', status: 403 }
      });
    }

    const familyIds = familyId
      ? [familyId]
      : member.memberships.map(m => m.familyId);

    if (familyId && !familyIds.every(id => member.memberships.some(m => m.familyId === id))) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found in this family', status: 404 }
      });
    }

    const rels = await prisma.relationship.findMany({
      where: {
        familyId: { in: familyIds },
        OR: [{ personId: memberId }, { relatedPersonId: memberId }]
      },
      include: {
        person: { select: MEMBER_SELECT },
        relatedPerson: { select: MEMBER_SELECT }
      }
    });

    const viewerMemberId = req.user?.memberId || null;

    const parents = [];
    const children = [];
    const spouses = [];
    let biologicalFatherId = null;
    let biologicalMotherId = null;

    for (const r of rels) {
      if (r.relatedPersonId === memberId && PARENT_TYPES.includes(r.type)) {
        const label = parentTypeLabel(r.type);
        parents.push({ ...toRelative(r.person, label, viewerRole, viewerMemberId), type: r.type });
        if (r.type === 'FATHER') biologicalFatherId = r.person.id;
        if (r.type === 'MOTHER') biologicalMotherId = r.person.id;
      }

      if (r.personId === memberId && CHILD_TYPES.includes(r.type)) {
        const label = childTypeLabel(r.type, r.relatedPerson.gender);
        children.push({ ...toRelative(r.relatedPerson, label, viewerRole, viewerMemberId), type: r.type });
      }

      if (SPOUSE_TYPES.includes(r.type) && (r.personId === memberId || r.relatedPersonId === memberId)) {
        const spouseNode = r.personId === memberId ? r.relatedPerson : r.person;
        const label = spouseGenderLabel(spouseNode.gender, r.type);
        if (!spouses.some(s => s.id === spouseNode.id)) {
          spouses.push({ ...toRelative(spouseNode, label, viewerRole, viewerMemberId), type: r.type });
        }
      }
    }

    const bioParentIds = [biologicalFatherId, biologicalMotherId].filter(Boolean);

    const [paternalGrandparents, maternalGrandparents, siblings] = await Promise.all([
      fetchGrandparents(biologicalFatherId, 'paternal', familyIds, viewerRole, viewerMemberId),
      fetchGrandparents(biologicalMotherId, 'maternal', familyIds, viewerRole, viewerMemberId),
      fetchBiologicalSiblings(memberId, bioParentIds, familyIds, viewerRole, viewerMemberId)
    ]);

    const father = parents.find(p => p.type === 'FATHER') || null;
    const mother = parents.find(p => p.type === 'MOTHER') || null;
    const otherParents = parents.filter(p => !['FATHER', 'MOTHER'].includes(p.type));

    const targetMember = {
      ...sanitizeRelativeFields(member, viewerRole, viewerMemberId),
      relationshipLabel: 'Self'
    };

    res.json({
      success: true,
      targetMember,
      coreFamily: {
        paternalGrandparents,
        maternalGrandparents,
        father,
        mother,
        otherParents,
        siblings,
        spouses,
        children
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getRelationToMe = async (req, res, next) => {
  try {
    const { targetMemberId } = req.params;
    // Support link viewers: accept sourceMemberId as query param
    // For authenticated users, fall back to req.user.memberId
    const sourceMemberId = req.query.sourceMemberId || req.user?.memberId;

    if (!sourceMemberId) {
      return res.status(400).json({
        success: false,
        error: { message: 'You must have an associated family member profile to calculate relationships', status: 400 }
      });
    }

    // Find the family that both members belong to
    const targetMembership = await prisma.familyMembership.findFirst({
      where: { memberId: targetMemberId }
    });

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        error: { message: 'Target family member not found', status: 404 }
      });
    }

    const relationship = await calculateRelationship(targetMembership.familyId, sourceMemberId, targetMemberId);

    res.json({
      success: true,
      relationshipLabel: relationship?.label || relationship || '',
      relationshipPath: relationship?.path || [],
      relationshipExplanation: relationship?.explanation || ''
    });
  } catch (err) {
    next(err);
  }
};
