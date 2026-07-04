import { PrismaClient } from '@prisma/client';
import { recalculateFamilyGenerations } from './src/services/generationCalculator.service.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * CSV Importer for Roots Across Generations
 *
 * Reads 3 CSV files and imports them into the database:
 *   1. family_members.csv  → FamilyMember records
 *   2. relationships.csv   → Relationship records
 *   3. family_memberships.csv → FamilyMembership records
 *
 * Usage:
 *   node importFromCSV.js <path-to-csv-folder>
 *
 * Example:
 *   node importFromCSV.js ./import-data
 *
 * The folder must contain:
 *   - family_members.csv
 *   - relationships.csv
 *   - family_memberships.csv
 */

// ─── CSV Parser ─────────────────────────────────────────────────
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8').trim();
  const lines = content.split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

// ─── Validators ─────────────────────────────────────────────────
function validateDate(dateStr) {
  if (!dateStr || dateStr === '') return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function validateBoolean(val) {
  if (typeof val === 'boolean') return val;
  return String(val).toLowerCase() === 'true';
}

const VALID_RELATIONSHIP_TYPES = [
  'FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'HUSBAND', 'WIFE',
  'SON', 'DAUGHTER', 'GRANDFATHER', 'GRANDMOTHER', 'UNCLE', 'AUNT',
  'COUSIN', 'NEPHEW', 'NIECE', 'STEP_MOTHER', 'STEP_FATHER',
  'ADOPTED_CHILD', 'GUARDIAN', 'STEP_SON', 'STEP_DAUGHTER'
];

const VALID_ROLES = ['FOUNDER', 'HISTORIAN', 'MEMBER'];

// ─── Main Import ────────────────────────────────────────────────
async function main() {
  const csvFolder = process.argv[2];
  if (!csvFolder) {
    console.error('Usage: node importFromCSV.js <path-to-csv-folder>');
    console.error('Example: node importFromCSV.js ./import-data');
    process.exit(1);
  }

  const folderPath = path.resolve(csvFolder);
  const membersFile = path.join(folderPath, 'family_members.csv');
  const relationshipsFile = path.join(folderPath, 'relationships.csv');
  const membershipsFile = path.join(folderPath, 'family_memberships.csv');

  // Check files exist
  for (const f of [membersFile, relationshipsFile, membershipsFile]) {
    if (!fs.existsSync(f)) {
      console.error(`❌ Missing file: ${f}`);
      process.exit(1);
    }
  }

  console.log('📂 Reading CSV files...\n');
  const membersData = parseCSV(membersFile);
  const relationshipsData = parseCSV(relationshipsFile);
  const membershipsData = parseCSV(membershipsFile);

  console.log(`   Family Members:     ${membersData.length} rows`);
  console.log(`   Relationships:      ${relationshipsData.length} rows`);
  console.log(`   Memberships:        ${membershipsData.length} rows\n`);

  // ─── Step 1: Determine Family ──────────────────────────────────
  const familyId = membershipsData[0]?.familyId || 'IMPORT-FAMILY-001';
  let family = await prisma.family.findUnique({ where: { familyId } });

  if (family) {
    console.log(`🗑  Family "${family.name}" (${familyId}) already exists. Cleaning up...`);
    await prisma.familyMembership.deleteMany({ where: { familyId: family.id } });
    await prisma.relationship.deleteMany({ where: { familyId: family.id } });
    await prisma.joinRequest.deleteMany({ where: { familyId: family.id } });
    await prisma.auditLog.deleteMany({ where: { familyId: family.id } });
    await prisma.memoryTag.deleteMany({ where: { memory: { familyId: family.id } } });
    await prisma.memory.deleteMany({ where: { familyId: family.id } });
    await prisma.notification.deleteMany({ where: { user: { familyMemberId: { not: null } } } });

    const existingMembers = await prisma.familyMember.findMany({
      where: { memberships: { some: { familyId: family.id } } },
      select: { id: true }
    });
    for (const m of existingMembers) {
      await prisma.user.updateMany({ where: { familyMemberId: m.id }, data: { familyMemberId: null } });
      await prisma.familyMember.delete({ where: { id: m.id } });
    }
    await prisma.family.delete({ where: { id: family.id } });
    console.log('   Cleanup done.\n');
  }

  family = await prisma.family.create({
    data: {
      name: 'Imported Family',
      surname: 'IMPORTED',
      description: 'Family imported from CSV data',
      familyId,
      shareableLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${familyId}`
    }
  });
  console.log(`🏠 Created family: ${family.name} (${family.id})\n`);

  // ─── Step 2: Import Members ────────────────────────────────────
  console.log('📌 Importing family members...');
  const memberIdMap = {}; // CSV id → DB id

  let memberErrors = 0;
  for (const row of membersData) {
    try {
      const member = await prisma.familyMember.create({
        data: {
          fullName: row.fullName || 'Unknown',
          surname: row.surname || null,
          nickname: row.nickname || null,
          dob: validateDate(row.dob),
          birthPlace: row.birthPlace || null,
          birthVillageCity: row.birthVillageCity || null,
          bloodGroup: row.bloodGroup || null,
          occupation: row.occupation || null,
          education: row.education || null,
          phone: row.phone || null,
          email: row.email || null,
          generationNumber: row.generationNumber ? parseInt(row.generationNumber) : null,
          gender: row.gender || null,
          isLiving: validateBoolean(row.isLiving),
          deathDate: validateDate(row.deathDate),
          bio: row.bio || null,
          privacySettings: { create: {} }
        }
      });
      memberIdMap[row.id] = member.id;
    } catch (err) {
      memberErrors++;
      console.error(`   ⚠  Failed: ${row.id} (${row.fullName}): ${err.message}`);
    }
  }
  console.log(`   ✅ Imported: ${Object.keys(memberIdMap).length} members (${memberErrors} errors)\n`);

  // ─── Step 3: Import Relationships ──────────────────────────────
  console.log('📌 Importing relationships...');
  let relCount = 0;
  let relErrors = 0;
  const seenRels = new Set();

  for (const row of relationshipsData) {
    const personDbId = memberIdMap[row.personId];
    const relatedDbId = memberIdMap[row.relatedPersonId];

    if (!personDbId || !relatedDbId) {
      relErrors++;
      continue;
    }

    const type = row.type?.toUpperCase();
    if (!VALID_RELATIONSHIP_TYPES.includes(type)) {
      relErrors++;
      continue;
    }

    // Deduplicate
    const key = `${personDbId}-${relatedDbId}-${type}`;
    if (seenRels.has(key)) continue;
    seenRels.add(key);

    try {
      await prisma.relationship.create({
        data: {
          familyId: family.id,
          personId: personDbId,
          relatedPersonId: relatedDbId,
          type
        }
      });
      relCount++;
    } catch (err) {
      relErrors++;
    }
  }
  console.log(`   ✅ Imported: ${relCount} relationships (${relErrors} skipped/duplicate)\n`);

  // ─── Step 4: Import Memberships ────────────────────────────────
  console.log('📌 Importing family memberships...');
  let memCount = 0;
  let memErrors = 0;

  for (const row of membershipsData) {
    const memberDbId = memberIdMap[row.memberId];
    if (!memberDbId) {
      memErrors++;
      continue;
    }

    const role = row.role?.toUpperCase();
    if (!VALID_ROLES.includes(role)) {
      memErrors++;
      continue;
    }

    try {
      await prisma.familyMembership.create({
        data: {
          familyId: family.id,
          memberId: memberDbId,
          role,
          isPrimary: validateBoolean(row.isPrimary)
        }
      });
      memCount++;
    } catch (err) {
      memErrors++;
      console.error(`   ⚠  Membership failed: ${row.memberId}: ${err.message}`);
    }
  }
  console.log(`   ✅ Imported: ${memCount} memberships (${memErrors} errors)\n`);

  // ─── Step 5: Recalculate Generations ───────────────────────────
  console.log('🔄 Recalculating generations...');
  await recalculateFamilyGenerations(family.id);

  // ─── Summary ───────────────────────────────────────────────────
  const totalMembers = await prisma.familyMembership.count({ where: { familyId: family.id } });
  const totalRels = await prisma.relationship.count({ where: { familyId: family.id } });

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  IMPORT COMPLETE');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Family ID:      ${familyId}`);
  console.log(`  Members:        ${totalMembers}`);
  console.log(`  Relationships:  ${totalRels}`);
  console.log('═══════════════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error('❌ Import failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
