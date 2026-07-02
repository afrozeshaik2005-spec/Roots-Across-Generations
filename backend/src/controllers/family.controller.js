import crypto from 'crypto';
import QRCode from 'qrcode';
import xlsx from 'xlsx';
import prisma from '../config/database.js';
import { createFamilySchema } from '../validators/family.validator.js';
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

// Helper to generate readable ID: SURNAME-XXXXX where XXXXX is a 5-digit number
const generateFamilyReadableId = (surname) => {
  const cleanSurname = surname.trim().replace(/[^a-zA-Z]/g, '').toUpperCase();
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `${cleanSurname}-${digits}`;
};

export const createFamily = async (req, res, next) => {
  try {
    const validation = createFamilySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed', status: 400, details: validation.error.format() }
      });
    }

    const { name, surname, description, originVillageCity, founderProfile } = req.body;
    const userId = req.user.id;

    // 1. Resolve or Create FamilyMember profile for the user
    let member = await prisma.familyMember.findFirst({
      where: { user: { id: userId } }
    });

    if (!member) {
      if (!founderProfile) {
        return res.status(400).json({
          success: false,
          error: { message: 'Founder profile details are required to complete onboarding', status: 400 }
        });
      }

      const missingProfileFields = ['fullName', 'dob', 'gender', 'phone'].filter((field) => !String(founderProfile[field] || '').trim());
      if (missingProfileFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: { message: `Missing required founder profile fields: ${missingProfileFields.join(', ')}`, status: 400 }
        });
      }

      if (isFutureDate(founderProfile.dob)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Date of birth cannot be in the future', status: 400 }
        });
      }

      member = await prisma.familyMember.create({
        data: {
          fullName: founderProfile.fullName,
          nickname: founderProfile.nickname || null,
          dob: founderProfile.dob ? new Date(founderProfile.dob) : null,
          birthPlace: founderProfile.birthPlace || null,
          birthVillageCity: founderProfile.birthVillageCity || null,
          bloodGroup: founderProfile.bloodGroup || null,
          occupation: founderProfile.occupation || null,
          education: founderProfile.education || null,
          phone: founderProfile.phone || null,
          email: founderProfile.email || req.user.email,
          gender: founderProfile.gender || null,
          bio: founderProfile.bio || null,
          generationNumber: 1, // Founder is generation 1
          user: { connect: { id: userId } },
          privacySettings: { create: {} }
        }
      });
    }

    // 2. Generate identifiers
    const familyId = generateFamilyReadableId(surname);
    const shareableSlug = crypto.randomUUID();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareableLink = `${frontendUrl}/join/${familyId}`;
    
    // Generate QR Code data URL of the shareableLink
    const qrCodeUrl = await QRCode.toDataURL(shareableLink);

    // 3. Create Family and Membership in transaction
    const family = await prisma.$transaction(async (tx) => {
      const newFamily = await tx.family.create({
        data: {
          name,
          surname: surname.toUpperCase(),
          description: description || null,
          originVillageCity: originVillageCity || null,
          familyId,
          shareableLink,
          qrCodeUrl
        }
      });

      await tx.familyMembership.create({
        data: {
          familyId: newFamily.id,
          memberId: member.id,
          role: 'FOUNDER',
          isPrimary: true
        }
      });

      // Update user's member reference if not set
      await tx.user.update({
        where: { id: userId },
        data: { familyMemberId: member.id }
      });

      return newFamily;
    });

    res.status(201).json({
      success: true,
      family
    });
  } catch (err) {
    next(err);
  }
};

export const importFamily = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'Excel file upload is required', status: 400 }
      });
    }

    const { name, surname, description, originVillageCity, founderName } = req.body;
    if (!name || !surname) {
      return res.status(400).json({
        success: false,
        error: { message: 'Family name and surname are required', status: 400 }
      });
    }

    const userId = req.user.id;

    // 1. Resolve or Create Founder profile
    let founder = await prisma.familyMember.findFirst({
      where: { user: { id: userId } }
    });

    if (!founder) {
      founder = await prisma.familyMember.create({
        data: {
          fullName: founderName || req.user.email.split('@')[0],
          email: req.user.email,
          generationNumber: 1,
          user: { connect: { id: userId } },
          privacySettings: { create: {} }
        }
      });
    }

    // Parse Excel Buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const membersSheet = workbook.Sheets['Members'] || workbook.Sheets[workbook.SheetNames[0]];
    const relationshipsSheet = workbook.Sheets['Relationships'] || workbook.Sheets[workbook.SheetNames[1]];

    const membersData = xlsx.utils.sheet_to_json(membersSheet);
    const relationshipsData = relationshipsSheet ? xlsx.utils.sheet_to_json(relationshipsSheet) : [];

    console.log('📊 Starting Excel parse. Members sheet rows:', membersData.length, 'Relationships sheet rows:', relationshipsData.length);

    // 2. Generate unique family credentials
    const familyId = generateFamilyReadableId(surname);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareableLink = `${frontendUrl}/join/${familyId}`;
    const qrCodeUrl = await QRCode.toDataURL(shareableLink);

    console.log('⚡ Starting Prisma transaction for family import. Readable ID:', familyId);

    // Create family and import members
    const result = await prisma.$transaction(async (tx) => {
      const newFamily = await tx.family.create({
        data: {
          name,
          surname: surname.toUpperCase(),
          description: description || null,
          originVillageCity: originVillageCity || null,
          familyId,
          shareableLink,
          qrCodeUrl
        }
      });

      console.log('✅ Family record created. ID:', newFamily.id);

      // Add founder to the family membership
      await tx.familyMembership.create({
        data: {
          familyId: newFamily.id,
          memberId: founder.id,
          role: 'FOUNDER',
          isPrimary: true
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: { familyMemberId: founder.id }
      });

      const memberMap = new Map(); // Name -> Database ID
      memberMap.set(founder.fullName.toLowerCase(), founder.id);

      // Create imported members
      for (const row of membersData) {
        const fullName = row.fullName || row.Name;
        if (!fullName || fullName.toLowerCase() === founder.fullName.toLowerCase()) continue;

      const dobVal = row.dob || row.DOB;
      const deathDateVal = row.deathDate || row.DeathDate;
        if (isFutureDate(dobVal)) {
          throw new Error(`Invalid future date of birth for imported member ${fullName}`);
        }
        if (isFutureDate(deathDateVal)) {
          throw new Error(`Invalid future death date for imported member ${fullName}`);
        }
        if (dobVal && deathDateVal && isBefore(deathDateVal, dobVal)) {
          throw new Error(`Death date cannot be before date of birth for imported member ${fullName}`);
        }

        const importedMember = await tx.familyMember.create({
          data: {
            fullName,
            nickname: row.nickname || row.Nickname || null,
            dob: dobVal ? new Date(dobVal) : null,
            birthPlace: row.birthPlace || row.BirthPlace || null,
            birthVillageCity: row.birthVillageCity || row.Village || null,
            bloodGroup: row.bloodGroup || row.BloodGroup || null,
            occupation: row.occupation || row.Occupation || null,
            education: row.education || row.Education || null,
            phone: row.phone || row.Phone || null,
            email: row.email || row.Email || null,
            gender: row.gender || row.Gender || null,
            isLiving: row.isLiving !== undefined ? (String(row.isLiving).toLowerCase() === 'true' || String(row.isLiving).toLowerCase() === 'yes') : true,
            deathDate: deathDateVal ? new Date(deathDateVal) : null,
            causeOfDeath: row.causeOfDeath || row.CauseOfDeath || null,
            bio: row.bio || row.Bio || null,
            generationNumber: row.generationNumber ? parseInt(row.generationNumber) : null,
            privacySettings: { create: {} }
          }
        });

        await tx.familyMembership.create({
          data: {
            familyId: newFamily.id,
            memberId: importedMember.id,
            role: 'MEMBER',
            isPrimary: false
          }
        });

        memberMap.set(fullName.toLowerCase(), importedMember.id);
        console.log(`👤 Created member: ${fullName} (ID: ${importedMember.id})`);
      }

      // Create relationships
      let relationshipsImported = 0;
      for (const row of relationshipsData) {
        const personName = row.personName || row.MemberName || row.Name;
        const relatedName = row.relatedPersonName || row.RelatedMemberName || row.RelatedName;
        const typeRaw = row.type || row.Type;

        if (!personName || !relatedName || !typeRaw) continue;

        const personId = memberMap.get(personName.toLowerCase());
        const relatedPersonId = memberMap.get(relatedName.toLowerCase());

        if (personId && relatedPersonId) {
          // Verify valid RelationshipType enum key
          let type = typeRaw.toUpperCase();
          let pId = personId;
          let rId = relatedPersonId;

          if (type === 'SPOUSE') {
            type = 'HUSBAND';
          }

          // Since the spreadsheet represents "MemberName's Father is RelatedMemberName", 
          // RelatedMemberName (rId) is the parent and MemberName (pId) is the child.
          // In our database schema, personId is the parent and relatedPersonId is the child.
          if (['FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER'].includes(type)) {
            pId = relatedPersonId;
            rId = personId;
          }

          await tx.relationship.create({
            data: {
              familyId: newFamily.id,
              personId: pId,
              relatedPersonId: rId,
              type
            }
          });
          relationshipsImported++;
          console.log(`🔗 Created relationship: ${personName} --[${type}]--> ${relatedName}`);
        }
      }

      return {
        family: newFamily,
        membersCount: memberMap.size,
        relationshipsCount: relationshipsImported
      };
    });

    console.log('🎉 Transaction complete! Result:', result);

    // Trigger generation calculation
    await recalculateFamilyGenerations(result.family.id);

    res.status(201).json({
      success: true,
      family: result.family,
      summary: {
        totalMembersImported: result.membersCount - 1,
        totalRelationshipsImported: result.relationshipsCount
      }
    });
  } catch (err) {
    console.error('❌ ERROR in importFamily:', err);
    next(err);
  }
};

export const getJoinInfo = async (req, res, next) => {
  try {
    const { familyId } = req.params;

    const family = await prisma.family.findFirst({
      where: {
        OR: [
          { familyId: familyId },
          { id: familyId }
        ]
      },
      select: {
        id: true,
        name: true,
        surname: true,
        description: true,
        originVillageCity: true,
        coverPhoto: true,
        familyId: true,
        shareableLink: true,
        qrCodeUrl: true,
        memberships: {
          select: {
            member: {
              select: {
                id: true,
                fullName: true,
                profilePhoto: true
              }
            }
          }
        }
      }
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        error: { message: 'Family not found', status: 404 }
      });
    }

    res.json({
      success: true,
      family
    });
  } catch (err) {
    next(err);
  }
};

export const getInviteInfo = async (req, res, next) => {
  try {
    const { familyId } = req.params;

    const family = await prisma.family.findFirst({
      where: {
        OR: [
          { familyId: familyId },
          { id: familyId }
        ]
      },
      select: {
        shareableLink: true,
        qrCodeUrl: true,
        name: true,
        familyId: true
      }
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        error: { message: 'Family not found', status: 404 }
      });
    }

    res.json({
      success: true,
      shareableLink: family.shareableLink,
      qrCodeUrl: family.qrCodeUrl,
      familyName: family.name,
      readableFamilyId: family.familyId
    });
  } catch (err) {
    next(err);
  }
};
