import { PrismaClient } from '@prisma/client';
import { recalculateFamilyGenerations } from './src/services/generationCalculator.service.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * NADAMAPALLI Family Seed — Demo Tree for Faculty Presentation
 *
 * 4 generations, ~35 members, covering:
 *   - Deceased patriarchs (Gen 1)
 *   - Multiple sibling branches (Gen 2)
 *   - Cousin marriages across branches (Gen 3)
 *   - Youngest generation (Gen 4)
 *   - Historian + Member accounts for demo
 *
 * Family graph:
 *   Gen 1 ─ Krishna Nadamapalli + Lakshmi ──── Raghavaiah + Sarojini
 *            │                                    │
 *   Gen 2 ─ Mohan+Sunitha  Suresh+Padmavathi   Venkatesh+Kamala
 *            │   │   │       │    │              │    │
 *            │   │   │       │    └─Pradeep      │    └─Teja
 *            │   │   │       └─Rajesh+Kavitha
 *            │   │   └─Divya+Vinod
 *            │   └─Lakshmi+Ravi
 *            └─Kumar+Sunita → Aarav, Myra
 *
 *   Gen 3 ─ Siddharth+Anusha → Diya
 *            Pradeep+Shravya → Vivaan
 *            Rajesh+Kavitha → Tara, Arjun
 *            Teja+Pooja
 *
 *   Gen 4 ─ Diya, Vivaan, Tara, Arjun
 */

const FAMILY_NAME = 'Nadamapalli';
const FAMILY_ID = 'NADAMAPALLI-42069';

// ─── Demo Credentials ──────────────────────────────────────
// HISTORIAN: krishna.nadamapalli@example.com / demo1234
// MEMBER:    mohan.nadamapalli@example.com  / demo1234
// ────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding NADAMAPALLI demo family tree...\n');

  // ─── Cleanup ───────────────────────────────────────────────────
  const existing = await prisma.family.findUnique({ where: { familyId: FAMILY_ID } });
  if (existing) {
    console.log('🗑  Removing existing demo data...');
    await prisma.familyMembership.deleteMany({ where: { familyId: existing.id } });
    await prisma.relationship.deleteMany({ where: { familyId: existing.id } });
    await prisma.joinRequest.deleteMany({ where: { familyId: existing.id } });
    await prisma.auditLog.deleteMany({ where: { familyId: existing.id } });
    await prisma.notification.deleteMany({ where: { user: { familyMemberId: { not: null } } } });

    const members = await prisma.familyMember.findMany({
      where: { memberships: { some: { familyId: existing.id } } },
      select: { id: true }
    });
    for (const m of members) {
      await prisma.user.updateMany({ where: { familyMemberId: m.id }, data: { familyMemberId: null } });
      await prisma.familyMember.delete({ where: { id: m.id } });
    }
    await prisma.family.delete({ where: { id: existing.id } });
    console.log('   Done.\n');
  }

  // ─── User Accounts ─────────────────────────────────────────────
  // Remove any leftover users from prior partial runs
  await prisma.user.deleteMany({ where: { email: { in: ['krishna.nadamapalli@example.com', 'mohan.nadamapalli@example.com'] } } });

  const passwordHash = await bcrypt.hash('demo1234', 10);

  const historianUser = await prisma.user.create({
    data: {
      email: 'krishna.nadamapalli@example.com',
      passwordHash,
      theme: 'light',
      language: 'en',
      dateFormat: 'DD/MM/YYYY'
    }
  });
  console.log(`👤 Historian: ${historianUser.email} / demo1234`);

  const memberUser = await prisma.user.create({
    data: {
      email: 'mohan.nadamapalli@example.com',
      passwordHash,
      theme: 'light',
      language: 'en',
      dateFormat: 'DD/MM/YYYY'
    }
  });
  console.log(`👤 Member:    ${memberUser.email} / demo1234\n`);

  // ─── Family ────────────────────────────────────────────────────
  const family = await prisma.family.create({
    data: {
      name: 'Nadamapalli Family',
      surname: 'NADAMAPALLI',
      description: 'Four-generation Nadamapalli family from Andhra Pradesh, India. Demo tree for faculty presentation showcasing lineage tracking, cultural verification, and privacy controls.',
      originVillageCity: 'Vijayawada, Andhra Pradesh',
      familyId: FAMILY_ID,
      shareableLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${FAMILY_ID}`
    }
  });
  console.log(`🏠 Family: ${family.name} (${family.id})`);
  console.log(`🔗 Shareable: ${family.shareableLink}\n`);

  // ─── Helper ────────────────────────────────────────────────────
  const createMember = async (fullName, gender, dob, opts = {}) => {
    return prisma.familyMember.create({
      data: {
        fullName,
        gender,
        dob: dob ? new Date(dob) : null,
        isLiving: opts.isLiving !== undefined ? opts.isLiving : true,
        deathDate: opts.deathDate ? new Date(opts.deathDate) : null,
        email: opts.email || null,
        phone: opts.phone || null,
        occupation: opts.occupation || null,
        bio: opts.bio || null,
        birthPlace: opts.birthPlace || null,
        bloodGroup: opts.bloodGroup || null,
        surname: FAMILY_NAME,
        generationNumber: opts.generation || null,
        privacySettings: { create: {} }
      }
    });
  };

  const linkUser = async (userId, memberId) => {
    await prisma.user.update({ where: { id: userId }, data: { familyMemberId: memberId } });
  };

  const addRelationship = async (personId, relatedPersonId, type) => {
    return prisma.relationship.create({
      data: { familyId: family.id, personId, relatedPersonId, type }
    });
  };

  const addMembership = async (memberId, role, isPrimary = false) => {
    return prisma.familyMembership.create({
      data: { familyId: family.id, memberId, role, isPrimary }
    });
  };

  // ═══════════════════════════════════════════════════════════════
  //  GENERATION 1 — Great-grandparents (Patriarchs)
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Generation 1 — Great-grandparents');

  const krishna = await createMember('Krishna Nadamapalli', 'M', '1932-08-15', {
    isLiving: false, deathDate: '2015-03-22',
    occupation: 'Agricultural Landowner',
    bio: 'Patriarch of the Nadamapalli family. Built the family farmland in Vijayawada. Known for his integrity and community leadership.',
    birthPlace: 'Vijayawada, Andhra Pradesh',
    bloodGroup: 'O+',
    generation: 1
  });
  await linkUser(historianUser.id, krishna.id);

  const lakshmi = await createMember('Lakshmi Nadamapalli', 'F', '1935-12-01', {
    isLiving: false, deathDate: '2018-07-10',
    occupation: 'Homemaker',
    bio: 'Matriarch. Raised 5 children while managing the household. Known for traditional cooking and weaving.',
    birthPlace: 'Guntur, Andhra Pradesh',
    bloodGroup: 'A+',
    generation: 1
  });

  const raghavaiah = await createMember('Raghavaiah Nadamapalli', 'M', '1938-03-20', {
    isLiving: false, deathDate: '2020-11-05',
    occupation: 'Government Clerk',
    bio: 'Younger brother of Krishna. Worked in the Revenue Department for 35 years.',
    birthPlace: 'Vijayawada, Andhra Pradesh',
    generation: 1
  });

  const sarojini = await createMember('Sarojini Nadamapalli', 'F', '1940-09-14', {
    isLiving: true,
    occupation: 'Retired Teacher',
    bio: 'Wife of Raghavaiah. Still active in the local temple committee.',
    birthPlace: 'Krishna District, Andhra Pradesh',
    generation: 1
  });

  // Gen 1 relationships
  await addRelationship(krishna.id, lakshmi.id, 'HUSBAND');
  await addRelationship(lakshmi.id, krishna.id, 'WIFE');
  await addRelationship(raghavaiah.id, sarojini.id, 'HUSBAND');
  await addRelationship(sarojini.id, raghavaiah.id, 'WIFE');
  await addRelationship(krishna.id, raghavaiah.id, 'BROTHER');
  await addRelationship(raghavaiah.id, krishna.id, 'BROTHER');

  // ═══════════════════════════════════════════════════════════════
  //  GENERATION 2 — Parents + Spouses
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Generation 2 — Parents + Spouses');

  // Krishna + Lakshmi's children
  const mohan = await createMember('Mohan Nadamapalli', 'M', '1960-05-10', {
    email: 'mohan.nadamapalli@example.com',
    phone: '+91-98853-01111',
    occupation: 'Business Owner (Textiles)',
    bio: 'Eldest son. Runs Nadamapalli Textiles in Vijayawada. Active family historian.',
    birthPlace: 'Vijayawada, Andhra Pradesh',
    bloodGroup: 'O+',
    generation: 2
  });
  await linkUser(memberUser.id, mohan.id);

  const sunitha = await createMember('Sunitha Nadamapalli', 'F', '1963-02-18', {
    phone: '+91-98853-01112',
    occupation: 'Homemaker',
    bio: 'Wife of Mohan. Expert in traditional Kalamkari art.',
    birthPlace: 'Tenali, Andhra Pradesh',
    generation: 2
  });

  const suresh = await createMember('Suresh Nadamapalli', 'M', '1963-11-25', {
    phone: '+91-98853-01113',
    occupation: 'Doctor (Cardiologist)',
    bio: 'Second son. Senior cardiologist at Apollo Hospitals, Chennai.',
    birthPlace: 'Vijayawada, Andhra Pradesh',
    bloodGroup: 'B+',
    generation: 2
  });

  const padmavathi = await createMember('Padmavathi Nadamapalli', 'F', '1966-07-30', {
    phone: '+91-98853-01114',
    occupation: 'Pharmacist',
    bio: 'Wife of Suresh. Runs a medical shop in Chennai.',
    birthPlace: 'Chennai, Tamil Nadu',
    generation: 2
  });

  const venkatesh = await createMember('Venkatesh Nadamapalli', 'M', '1966-04-12', {
    phone: '+91-98853-01115',
    occupation: 'Software Engineer (Retired)',
    bio: 'Third son. Worked at TCS for 25 years. Now manages family investments.',
    birthPlace: 'Vijayawada, Andhra Pradesh',
    generation: 2
  });

  const kamala = await createMember('Kamala Nadamapalli', 'F', '1969-01-08', {
    phone: '+91-98853-01116',
    occupation: 'Bank Manager (Retired)',
    bio: 'Wife of Venkatesh. Retired from SBI Vijayawada branch.',
    birthPlace: 'Vijayawada, Andhra Pradesh',
    generation: 2
  });

  // Raghavaiah + Sarojini's children
  const kumar = await createMember('Kumar Nadamapalli', 'M', '1968-08-20', {
    phone: '+91-98853-01117',
    occupation: 'Engineer (PWD)',
    bio: 'Only son of Raghavaiah. Works in Public Works Department.',
    birthPlace: 'Vijayawada, Andhra Pradesh',
    generation: 2
  });

  const sunita = await createMember('Sunita Nadamapalli', 'F', '1971-05-15', {
    phone: '+91-98853-01118',
    occupation: 'School Teacher',
    bio: 'Wife of Kumar. Teaches at Sri Vidya Mandir School.',
    birthPlace: 'Guntur, Andhra Pradesh',
    generation: 2
  });

  // Gen 2 relationships — Children to parents
  await addRelationship(krishna.id, mohan.id, 'FATHER');
  await addRelationship(mohan.id, krishna.id, 'SON');
  await addRelationship(lakshmi.id, mohan.id, 'MOTHER');
  await addRelationship(mohan.id, lakshmi.id, 'SON');

  await addRelationship(krishna.id, suresh.id, 'FATHER');
  await addRelationship(suresh.id, krishna.id, 'SON');
  await addRelationship(lakshmi.id, suresh.id, 'MOTHER');
  await addRelationship(suresh.id, lakshmi.id, 'SON');

  await addRelationship(krishna.id, venkatesh.id, 'FATHER');
  await addRelationship(venkatesh.id, krishna.id, 'SON');
  await addRelationship(lakshmi.id, venkatesh.id, 'MOTHER');
  await addRelationship(venkatesh.id, lakshmi.id, 'SON');

  await addRelationship(raghavaiah.id, kumar.id, 'FATHER');
  await addRelationship(kumar.id, raghavaiah.id, 'SON');
  await addRelationship(sarojini.id, kumar.id, 'MOTHER');
  await addRelationship(kumar.id, sarojini.id, 'SON');

  // Sibling relationships
  await addRelationship(mohan.id, suresh.id, 'BROTHER');
  await addRelationship(suresh.id, mohan.id, 'BROTHER');
  await addRelationship(mohan.id, venkatesh.id, 'BROTHER');
  await addRelationship(venkatesh.id, mohan.id, 'BROTHER');
  await addRelationship(suresh.id, venkatesh.id, 'BROTHER');
  await addRelationship(venkatesh.id, suresh.id, 'BROTHER');

  // Spouse relationships
  await addRelationship(mohan.id, sunitha.id, 'HUSBAND');
  await addRelationship(sunitha.id, mohan.id, 'WIFE');
  await addRelationship(suresh.id, padmavathi.id, 'HUSBAND');
  await addRelationship(padmavathi.id, suresh.id, 'WIFE');
  await addRelationship(venkatesh.id, kamala.id, 'HUSBAND');
  await addRelationship(kamala.id, venkatesh.id, 'WIFE');
  await addRelationship(kumar.id, sunita.id, 'HUSBAND');
  await addRelationship(sunita.id, kumar.id, 'WIFE');

  // ═══════════════════════════════════════════════════════════════
  //  GENERATION 3 — Grandchildren + Spouses
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Generation 3 — Grandchildren + Spouses');

  // Mohan + Sunitha's children
  const siddharth = await createMember('Siddharth Nadamapalli', 'M', '1988-06-15', {
    phone: '+91-98853-02221',
    occupation: 'Software Architect',
    bio: 'Elder son of Mohan. Works at Google Hyderabad. Family tree app creator.',
    birthPlace: 'Vijayawada, Andhra Pradesh',
    bloodGroup: 'O+',
    generation: 3
  });

  const anusha = await createMember('Anusha Nadamapalli', 'F', '1990-09-22', {
    phone: '+91-98853-02222',
    occupation: 'UX Designer',
    bio: 'Wife of Siddharth. Works at Microsoft Hyderabad.',
    birthPlace: 'Hyderabad, Telangana',
    generation: 3
  });

  const divya = await createMember('Divya Vinod', 'F', '1991-03-08', {
    phone: '+91-98853-02223',
    occupation: 'Chartered Accountant',
    bio: 'Daughter of Mohan. Married to Vinod, works at Deloitte.',
    birthPlace: 'Vijayawada, Andhra Pradesh',
    generation: 3
  });

  const vinod = await createMember('Vinod Kumar', 'M', '1989-07-14', {
    phone: '+91-98853-02224',
    occupation: 'Lawyer',
    bio: 'Husband of Divya. Practicing advocate at Vijayawada High Court.',
    birthPlace: 'Vijayawada, Andhra Pradesh',
    generation: 3
  });

  // Suresh + Padmavathi's children
  const pradeep = await createMember('Pradeep Nadamapalli', 'M', '1990-01-20', {
    phone: '+91-98853-02225',
    occupation: 'Doctor (Neurologist)',
    bio: 'Son of Suresh. Following father\'s medical footsteps.',
    birthPlace: 'Chennai, Tamil Nadu',
    bloodGroup: 'B+',
    generation: 3
  });

  const shravya = await createMember('Shravya Nadamapalli', 'F', '1992-11-05', {
    phone: '+91-98853-02226',
    occupation: 'Dentist',
    bio: 'Wife of Pradeep. Runs a dental clinic in Chennai.',
    birthPlace: 'Bangalore, Karnataka',
    generation: 3
  });

  const rajesh = await createMember('Rajesh Nadamapalli', 'M', '1992-08-18', {
    phone: '+91-98853-02227',
    occupation: 'Data Scientist',
    bio: 'Son of Suresh. Works at Amazon AWS.',
    birthPlace: 'Chennai, Tamil Nadu',
    generation: 3
  });

  const kavitha = await createMember('Kavitha Nadamapalli', 'F', '1994-04-25', {
    phone: '+91-98853-02228',
    occupation: 'Marketing Manager',
    bio: 'Wife of Rajesh. Works at Flipkart.',
    birthPlace: 'Bangalore, Karnataka',
    generation: 3
  });

  // Venkatesh + Kamala's children
  const teja = await createMember('Teja Nadamapalli', 'M', '1993-12-10', {
    phone: '+91-98853-02229',
    occupation: 'Startup Founder',
    bio: 'Son of Venkatesh. Founded a fintech startup in Hyderabad.',
    birthPlace: 'Vijayawada, Andhra Pradesh',
    generation: 3
  });

  const pooja = await createMember('Pooja Nadamapalli', 'F', '1995-06-28', {
    phone: '+91-98853-02230',
    occupation: 'Content Writer',
    bio: 'Wife of Teja. Freelance writer and blogger.',
    birthPlace: 'Hyderabad, Telangana',
    generation: 3
  });

  // Kumar + Sunita's children
  const deepak = await createMember('Deepak Nadamapalli', 'M', '1994-10-05', {
    phone: '+91-98853-02231',
    occupation: 'Civil Engineer',
    bio: 'Son of Kumar. Works in government infrastructure projects.',
    birthPlace: 'Vijayawada, Andhra Pradesh',
    generation: 3
  });

  // Gen 3 relationships — Children to parents
  await addRelationship(mohan.id, siddharth.id, 'FATHER');
  await addRelationship(siddharth.id, mohan.id, 'SON');
  await addRelationship(sunitha.id, siddharth.id, 'MOTHER');
  await addRelationship(siddharth.id, sunitha.id, 'SON');

  await addRelationship(mohan.id, divya.id, 'FATHER');
  await addRelationship(divya.id, mohan.id, 'DAUGHTER');
  await addRelationship(sunitha.id, divya.id, 'MOTHER');
  await addRelationship(divya.id, sunitha.id, 'DAUGHTER');

  await addRelationship(suresh.id, pradeep.id, 'FATHER');
  await addRelationship(pradeep.id, suresh.id, 'SON');
  await addRelationship(padmavathi.id, pradeep.id, 'MOTHER');
  await addRelationship(pradeep.id, padmavathi.id, 'SON');

  await addRelationship(suresh.id, rajesh.id, 'FATHER');
  await addRelationship(rajesh.id, suresh.id, 'SON');
  await addRelationship(padmavathi.id, rajesh.id, 'MOTHER');
  await addRelationship(rajesh.id, padmavathi.id, 'SON');

  await addRelationship(venkatesh.id, teja.id, 'FATHER');
  await addRelationship(teja.id, venkatesh.id, 'SON');
  await addRelationship(kamala.id, teja.id, 'MOTHER');
  await addRelationship(teja.id, kamala.id, 'SON');

  await addRelationship(kumar.id, deepak.id, 'FATHER');
  await addRelationship(deepak.id, kumar.id, 'SON');
  await addRelationship(sunita.id, deepak.id, 'MOTHER');
  await addRelationship(deepak.id, sunita.id, 'SON');

  // Sibling relationships Gen 3
  await addRelationship(siddharth.id, divya.id, 'BROTHER');
  await addRelationship(divya.id, siddharth.id, 'SISTER');
  await addRelationship(pradeep.id, rajesh.id, 'BROTHER');
  await addRelationship(rajesh.id, pradeep.id, 'BROTHER');

  // Cousin relationships (cross-branch)
  await addRelationship(siddharth.id, pradeep.id, 'BROTHER');
  await addRelationship(pradeep.id, siddharth.id, 'BROTHER');
  await addRelationship(siddharth.id, rajesh.id, 'BROTHER');
  await addRelationship(rajesh.id, siddharth.id, 'BROTHER');
  await addRelationship(siddharth.id, teja.id, 'BROTHER');
  await addRelationship(teja.id, siddharth.id, 'BROTHER');
  await addRelationship(divya.id, pradeep.id, 'SISTER');
  await addRelationship(pradeep.id, divya.id, 'BROTHER');
  await addRelationship(divya.id, rajesh.id, 'SISTER');
  await addRelationship(rajesh.id, divya.id, 'BROTHER');
  await addRelationship(divya.id, teja.id, 'SISTER');
  await addRelationship(teja.id, divya.id, 'BROTHER');

  // Spouse relationships Gen 3
  await addRelationship(siddharth.id, anusha.id, 'HUSBAND');
  await addRelationship(anusha.id, siddharth.id, 'WIFE');
  await addRelationship(divya.id, vinod.id, 'WIFE');
  await addRelationship(vinod.id, divya.id, 'HUSBAND');
  await addRelationship(pradeep.id, shravya.id, 'HUSBAND');
  await addRelationship(shravya.id, pradeep.id, 'WIFE');
  await addRelationship(rajesh.id, kavitha.id, 'HUSBAND');
  await addRelationship(kavitha.id, rajesh.id, 'WIFE');
  await addRelationship(teja.id, pooja.id, 'HUSBAND');
  await addRelationship(pooja.id, teja.id, 'WIFE');

  // ═══════════════════════════════════════════════════════════════
  //  GENERATION 4 — Great-grandchildren
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Generation 4 — Great-grandchildren');

  const diya = await createMember('Diya Nadamapalli', 'F', '2018-03-14', {
    occupation: 'Student',
    bio: 'Daughter of Siddharth and Anusha.',
    birthPlace: 'Hyderabad, Telangana',
    generation: 4
  });

  const vivan = await createMember('Vivaan Nadamapalli', 'M', '2020-07-22', {
    occupation: 'Toddler',
    bio: 'Son of Pradeep and Shravya.',
    birthPlace: 'Chennai, Tamil Nadu',
    generation: 4
  });

  const tara = await createMember('Tara Nadamapalli', 'F', '2019-11-30', {
    occupation: 'Student',
    bio: 'Daughter of Rajesh and Kavitha.',
    birthPlace: 'Bangalore, Karnataka',
    generation: 4
  });

  const arjun = await createMember('Arjun Nadamapalli', 'M', '2022-01-15', {
    occupation: 'Toddler',
    bio: 'Son of Rajesh and Kavitha.',
    birthPlace: 'Bangalore, Karnataka',
    generation: 4
  });

  const myra = await createMember('Myra Nadamapalli', 'F', '2021-09-08', {
    occupation: 'Toddler',
    bio: 'Daughter of Kumar and Sunita (via Deepak).',
    birthPlace: 'Vijayawada, Andhra Pradesh',
    generation: 4
  });

  // Gen 4 relationships — Children to parents
  await addRelationship(siddharth.id, diya.id, 'FATHER');
  await addRelationship(diya.id, siddharth.id, 'DAUGHTER');
  await addRelationship(anusha.id, diya.id, 'MOTHER');
  await addRelationship(diya.id, anusha.id, 'DAUGHTER');

  await addRelationship(pradeep.id, vivan.id, 'FATHER');
  await addRelationship(vivan.id, pradeep.id, 'SON');
  await addRelationship(shravya.id, vivan.id, 'MOTHER');
  await addRelationship(vivan.id, shravya.id, 'SON');

  await addRelationship(rajesh.id, tara.id, 'FATHER');
  await addRelationship(tara.id, rajesh.id, 'DAUGHTER');
  await addRelationship(kavitha.id, tara.id, 'MOTHER');
  await addRelationship(tara.id, kavitha.id, 'DAUGHTER');

  await addRelationship(rajesh.id, arjun.id, 'FATHER');
  await addRelationship(arjun.id, rajesh.id, 'SON');
  await addRelationship(kavitha.id, arjun.id, 'MOTHER');
  await addRelationship(arjun.id, kavitha.id, 'SON');

  await addRelationship(deepak.id, myra.id, 'FATHER');
  await addRelationship(myra.id, deepak.id, 'DAUGHTER');
  await addRelationship(sunita.id, myra.id, 'MOTHER');
  await addRelationship(myra.id, sunita.id, 'DAUGHTER');

  // Sibling relationships Gen 4
  await addRelationship(tara.id, arjun.id, 'SISTER');
  await addRelationship(arjun.id, tara.id, 'BROTHER');

  // ═══════════════════════════════════════════════════════════════
  //  MEMBERSHIPS — Assign roles
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Assigning family memberships...');

  await addMembership(krishna.id, 'FOUNDER', true);
  await addMembership(mohan.id, 'HISTORIAN');
  await addMembership(sunitha.id, 'MEMBER');
  await addMembership(suresh.id, 'MEMBER');
  await addMembership(padmavathi.id, 'MEMBER');
  await addMembership(venkatesh.id, 'MEMBER');
  await addMembership(kamala.id, 'MEMBER');
  await addMembership(kumar.id, 'MEMBER');
  await addMembership(sunita.id, 'MEMBER');
  await addMembership(siddharth.id, 'MEMBER');
  await addMembership(anusha.id, 'MEMBER');
  await addMembership(divya.id, 'MEMBER');
  await addMembership(vinod.id, 'MEMBER');
  await addMembership(pradeep.id, 'MEMBER');
  await addMembership(shravya.id, 'MEMBER');
  await addMembership(rajesh.id, 'MEMBER');
  await addMembership(kavitha.id, 'MEMBER');
  await addMembership(teja.id, 'MEMBER');
  await addMembership(pooja.id, 'MEMBER');
  await addMembership(deepak.id, 'MEMBER');
  await addMembership(diya.id, 'MEMBER');
  await addMembership(vivan.id, 'MEMBER');
  await addMembership(tara.id, 'MEMBER');
  await addMembership(arjun.id, 'MEMBER');
  await addMembership(myra.id, 'MEMBER');

  // ═══════════════════════════════════════════════════════════════
  //  GENERATION RECALCULATION
  // ═══════════════════════════════════════════════════════════════
  console.log('\n🔄 Recalculating generations...');
  await recalculateFamilyGenerations(family.id);

  // ═══════════════════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════════════════
  const memberCount = await prisma.familyMembership.count({ where: { familyId: family.id } });
  const relCount = await prisma.relationship.count({ where: { familyId: family.id } });

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  NADAMAPALLI DEMO TREE — READY');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Family ID:      ${FAMILY_ID}`);
  console.log(`  Members:        ${memberCount}`);
  console.log(`  Relationships:  ${relCount}`);
  console.log(`  Generations:    4`);
  console.log('───────────────────────────────────────────────────');
  console.log('  CREDENTIALS:');
  console.log('───────────────────────────────────────────────────');
  console.log('  Historian:  krishna.nadamapalli@example.com');
  console.log('              Password: demo1234');
  console.log('  Member:     mohan.nadamapalli@example.com');
  console.log('              Password: demo1234');
  console.log('───────────────────────────────────────────────────');
  console.log('  Family ID for join: ' + FAMILY_ID);
  console.log('═══════════════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
