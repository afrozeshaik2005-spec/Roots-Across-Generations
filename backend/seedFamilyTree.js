import { PrismaClient } from '@prisma/client';
import { recalculateFamilyGenerations } from './src/services/generationCalculator.service.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * REDDY Family Seed — 48 members across 4 generations
 *
 * Complex cases covered:
 *   - 4 deceased members (Gen 1 patriarchs + Gen 2 son + Gen 2 wife)
 *   - 1 divorce (Kiran's first marriage, ex-wife NOT in tree)
 *   - 1 remarriage (Jyothi remarried Mahesh after Prasad's death)
 *   - 1 step-parent (Mahesh is step-father to Siddharth)
 *   - 2 adopted children (Vikram + Deepthi adopted Kavya and Rahul)
 *   - Multiple cousin branches across 3 family lines
 *   - Uncle/aunt/nephew relationships between branches
 *   - Bidirectional spouse links
 *   - Every child linked to both parents
 *
 * Family graph:
 *   Gen 1 ─ Sri Venkata Reddy + Satyavathi ──── Subbarao + Kamakshi
 *            │                                    │
 *   Gen 2 ─ Ramesh+Padma  Suresh+Geetha         Venkataramana+Latha
 *            │   │          │  │  │               │
 *            │   │          │  │  └──Rohit+Shreya  └──Naveen
 *            │   │          │  └──Ananya+Venkat
 *            │   │          │
 *            │   └──Divya+Praveen  Suresh+Geetha→Vikram+Deepthi
 *            │                     (adopted Kavya, Rahul)
 *            └──Kiran(div)→Sneha→Aarav, Isha
 *
 *            Kamala+Nagarajan → Aditya+Pooja → Vivaan
 *                              Meera+Arun → Prerana
 *
 *            Prasad+Jyothi → Siddharth+Anusha → Diya
 *            Jyothi remarried Mahesh → Tara
 *            (Mahesh is STEP_FATHER to Siddharth)
 *
 *            Subbarao line:
 *            Ravi+Sunita → Shankar, Poornima
 */

const FAMILY_NAME = 'Reddy';
const FAMILY_ID = 'REDDY-78421';

async function main() {
  console.log('🌱 Seeding REDDY family tree (48 members, 4 generations)...\n');

  // ─── Cleanup ───────────────────────────────────────────────────
  const existing = await prisma.family.findUnique({ where: { familyId: FAMILY_ID } });
  if (existing) {
    console.log('🗑  Removing existing seed data...');
    await prisma.familyMembership.deleteMany({ where: { familyId: existing.id } });
    await prisma.relationship.deleteMany({ where: { familyId: existing.id } });
    await prisma.joinRequest.deleteMany({ where: { familyId: existing.id } });
    await prisma.auditLog.deleteMany({ where: { familyId: existing.id } });
    await prisma.notification.deleteMany({ where: { user: { familyMemberId: { not: null } } } });

    // Unlink users before deleting members
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

  // ─── Founder User Account ──────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);
  const founderUser = await prisma.user.create({
    data: {
      email: 'ramesh.reddy@example.com',
      passwordHash,
      theme: 'light',
      language: 'en',
      dateFormat: 'DD/MM/YYYY'
    }
  });
  console.log(`👤 Founder user: ${founderUser.email} (${founderUser.id})`);

  // ─── Family ────────────────────────────────────────────────────
  const family = await prisma.family.create({
    data: {
      name: 'Reddy Family',
      surname: 'REDDY',
      description: 'Four-generation Reddy family from Andhra Pradesh, India. Includes multiple branches, remarriages, adoptions, and cross-branch cousin relationships.',
      originVillageCity: 'Guntur, Andhra Pradesh',
      familyId: FAMILY_ID,
      shareableLink: `http://localhost:5173/join/${FAMILY_ID}`
    }
  });
  console.log(`🏠 Family: ${family.name} (${family.id})\n`);

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
        surname: FAMILY_NAME,
        generationNumber: opts.generation || null,
        privacySettings: { create: {} }
      }
    });
  };

  const linkUser = async (userId, memberId) => {
    await prisma.user.update({ where: { id: userId }, data: { familyMemberId: memberId } });
  };

  // ═══════════════════════════════════════════════════════════════
  //  GENERATION 1 — Great-grandparents
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Creating Generation 1 (Great-grandparents)...');

  const sriVenkata = await createMember('Sri Venkata Reddy', 'M', '1935-03-15', {
    isLiving: false, deathDate: '2010-08-20',
    occupation: 'Agricultural Landlord',
    bio: 'Patriarch of the Reddy family. Built the family estate in Guntur from nothing.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const satyavathi = await createMember('Satyavathi Reddy', 'F', '1938-11-02', {
    isLiving: false, deathDate: '2015-04-10',
    occupation: 'Homemaker',
    bio: 'Matriarch. Known for her generosity and community cooking.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const subbarao = await createMember('Subbarao Reddy', 'M', '1940-07-22', {
    isLiving: false, deathDate: '2018-12-05',
    occupation: 'School Teacher',
    bio: 'Younger brother of Sri Venkata. Taught at the village school for 35 years.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const kamakshi = await createMember('Kamakshi Devi', 'F', '1942-05-18', {
    occupation: 'Homemaker',
    bio: 'Wife of Subbarao. Pillar of the extended family.',
    birthPlace: 'Vijayawada, Andhra Pradesh'
  });

  // ═══════════════════════════════════════════════════════════════
  //  GENERATION 2 — Their children + spouses
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Creating Generation 2 (Children + Spouses)...');

  // ── Sri Venkata + Satyavathi's children ──
  const ramesh = await createMember('Ramesh Reddy', 'M', '1962-01-20', {
    email: 'ramesh.reddy@example.com',
    phone: '+91-98490-12345',
    occupation: 'Business Owner',
    bio: 'Eldest son. Runs the family import-export business. Founder of the digital family tree.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });
  await linkUser(founderUser.id, ramesh.id);

  const padma = await createMember('Padma Reddy', 'F', '1965-06-14', {
    phone: '+91-98490-12346',
    occupation: 'Retired Teacher',
    bio: 'Wife of Ramesh. Former school teacher, now active in community service.',
    birthPlace: 'Tenali, Andhra Pradesh'
  });

  const suresh = await createMember('Suresh Reddy', 'M', '1965-09-08', {
    phone: '+91-98490-12347',
    occupation: 'Doctor (Retired)',
    bio: 'Second son. Retired cardiologist from Apollo Hospital, Chennai.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const geetha = await createMember('Geetha Reddy', 'F', '1968-03-25', {
    phone: '+91-98490-12348',
    occupation: 'Homemaker',
    bio: 'Wife of Suresh. Excellent cook and traditional arts practitioner.',
    birthPlace: 'Krishna District, Andhra Pradesh'
  });

  const kamala = await createMember('Kamala Nagarajan', 'F', '1968-12-01', {
    phone: '+91-98490-12349',
    occupation: 'Nurse (Retired)',
    bio: 'Only daughter of Sri Venkata. Worked at Government General Hospital for 30 years.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const nagarajan = await createMember('Nagarajan', 'M', '1966-04-17', {
    phone: '+91-98490-12350',
    occupation: 'Bank Manager (Retired)',
    bio: 'Husband of Kamala. From a Tamil family in Chennai. Moved to Guntur after marriage.',
    birthPlace: 'Chennai, Tamil Nadu'
  });

  const prasad = await createMember('Prasad Reddy', 'M', '1972-08-30', {
    isLiving: false, deathDate: '2020-03-15',
    occupation: 'Farmer',
    bio: 'Youngest son. Managed the family farmlands. Passed away during COVID-19.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const jyothi = await createMember('Jyothi Kumar', 'F', '1974-02-14', {
    phone: '+91-98490-12351',
    occupation: 'School Principal',
    bio: 'Widow of Prasad, later remarried Mahesh Kumar. Runs a private school.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const mahesh = await createMember('Mahesh Kumar', 'M', '1975-10-05', {
    phone: '+91-98490-12352',
    occupation: 'Software Consultant',
    bio: 'Second husband of Jyothi. Step-father to Siddharth. Works in Hyderabad.',
    birthPlace: 'Hyderabad, Telangana'
  });

  // ── Subbarao + Kamakshi's children ──
  const venkataramana = await createMember('Venkataramana Reddy', 'M', '1968-05-12', {
    phone: '+91-98490-12353',
    occupation: 'Civil Engineer',
    bio: 'Son of Subbarao. Runs a construction firm in Vijayawada.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const latha = await createMember('Latha Reddy', 'F', '1970-09-20', {
    isLiving: false, deathDate: '2018-06-12',
    occupation: 'Homemaker',
    bio: 'Wife of Venkataramana. Passed away from a brief illness.',
    birthPlace: 'Vijayawada, Andhra Pradesh'
  });

  const ravi = await createMember('Ravi Reddy', 'M', '1972-11-08', {
    phone: '+91-98490-12354',
    occupation: 'Farmer',
    bio: 'Younger son of Subbarao. Carries on the agricultural tradition.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const sunita = await createMember('Sunita Reddy', 'F', '1974-04-03', {
    phone: '+91-98490-12355',
    occupation: 'Homemaker',
    bio: 'Wife of Ravi. Expert in organic farming.',
    birthPlace: 'Prakasam District, Andhra Pradesh'
  });

  // ═══════════════════════════════════════════════════════════════
  //  GENERATION 3 — Grandchildren
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Creating Generation 3 (Grandchildren + spouses)...');

  // ── Ramesh + Padma's children ──
  const kiran = await createMember('Kiran Reddy', 'M', '1990-07-14', {
    phone: '+91-98490-20001',
    email: 'kiran.reddy@example.com',
    occupation: 'Software Engineer',
    bio: 'Elder son of Ramesh. Works at a tech startup in Bangalore. Divorced once, now happily remarried.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const sneha = await createMember('Sneha Reddy', 'F', '1992-01-28', {
    phone: '+91-98490-20002',
    email: 'sneha.reddy@example.com',
    occupation: 'UX Designer',
    bio: 'Second wife of Kiran. Works at a design agency in Bangalore.',
    birthPlace: 'Bangalore, Karnataka'
  });

  const divya = await createMember('Divya Praveen', 'F', '1993-11-05', {
    phone: '+91-98490-20003',
    email: 'divya.praveen@example.com',
    occupation: 'Doctor',
    bio: 'Daughter of Ramesh. Pediatrician at a children\'s hospital in Hyderabad.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  // ── Suresh + Geetha's children ──
  const vikram = await createMember('Vikram Reddy', 'M', '1992-03-18', {
    phone: '+91-98490-20004',
    email: 'vikram.reddy@example.com',
    occupation: 'Architect',
    bio: 'Elder son of Suresh. Runs an architecture firm. Adopted two children.',
    birthPlace: 'Chennai, Tamil Nadu'
  });

  const deepthi = await createMember('Deepthi Reddy', 'F', '1994-08-22', {
    phone: '+91-98490-20005',
    email: 'deepthi.reddy@example.com',
    occupation: 'Interior Designer',
    bio: 'Wife of Vikram. Passionate about sustainable design.',
    birthPlace: 'Hyderabad, Telangana'
  });

  const ananya = await createMember('Ananya Venkat', 'F', '1995-05-10', {
    phone: '+91-98490-20006',
    email: 'ananya.venkat@example.com',
    occupation: 'Marketing Manager',
    bio: 'Daughter of Suresh. Works at a multinational in Mumbai.',
    birthPlace: 'Chennai, Tamil Nadu'
  });

  const venkat = await createMember('Venkat Anand', 'M', '1994-12-01', {
    phone: '+91-98490-20007',
    email: 'venkat.anand@example.com',
    occupation: 'Investment Banker',
    bio: 'Husband of Ananya. From Mumbai. Works in finance.',
    birthPlace: 'Mumbai, Maharashtra'
  });

  const rohit = await createMember('Rohit Reddy', 'M', '1998-02-28', {
    phone: '+91-98490-20008',
    email: 'rohit.reddy@example.com',
    occupation: 'Data Scientist',
    bio: 'Youngest son of Suresh. Recently married. Works in AI research.',
    birthPlace: 'Chennai, Tamil Nadu'
  });

  const shreya = await createMember('Shreya Reddy', 'F', '2000-06-15', {
    phone: '+91-98490-20009',
    email: 'shreya.reddy@example.com',
    occupation: 'AI Researcher',
    bio: 'Wife of Rohit. Met at a machine learning conference. No children yet.',
    birthPlace: 'Pune, Maharashtra'
  });

  // ── Kamala + Nagarajan's children ──
  const aditya = await createMember('Aditya Nagarajan', 'M', '1991-04-22', {
    phone: '+91-98490-20010',
    email: 'aditya.nagarajan@example.com',
    occupation: 'Pharmacist',
    bio: 'Son of Kamala. Runs a pharmacy chain in Guntur.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const pooja = await createMember('Pooja Nagarajan', 'F', '1993-09-14', {
    phone: '+91-98490-20011',
    email: 'pooja.nagarajan@example.com',
    occupation: ' pharmacist',
    bio: 'Wife of Aditya. Co-runs the pharmacy business.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const meera = await createMember('Meera Arun', 'F', '1994-07-08', {
    phone: '+91-98490-20012',
    email: 'meera.arun@example.com',
    occupation: 'Lawyer',
    bio: 'Daughter of Kamala. Practices family law in Hyderabad.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const arun = await createMember('Arun Kumar', 'M', '1993-11-30', {
    phone: '+91-98490-20013',
    email: 'arun.kumar@example.com',
    occupation: 'Civil Servant',
    bio: 'Husband of Meera. Works in the Indian Administrative Service.',
    birthPlace: 'Warangal, Telangana'
  });

  // ── Prasad + Jyothi's child ──
  const siddharth = await createMember('Siddharth Reddy', 'M', '1996-10-12', {
    phone: '+91-98490-20014',
    email: 'siddharth.reddy@example.com',
    occupation: 'Photographer',
    bio: 'Son of Prasad and Jyothi. Documentary photographer. Close to step-father Mahesh.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const anusha = await createMember('Anusha Reddy', 'F', '1998-03-05', {
    phone: '+91-98490-20015',
    email: 'anusha.reddy@example.com',
    occupation: 'Journalist',
    bio: 'Wife of Siddharth. Works as a features editor at a national newspaper.',
    birthPlace: 'Vijayawada, Andhra Pradesh'
  });

  // ── Jyothi + Mahesh's child ──
  const tara = await createMember('Tara Kumar', 'F', '2000-08-19', {
    phone: '+91-98490-20016',
    email: 'tara.kumar@example.com',
    occupation: 'College Student',
    bio: 'Daughter of Jyothi and Mahesh. Studying psychology in Hyderabad. Half-sister to Siddharth.',
    birthPlace: 'Hyderabad, Telangana'
  });

  // ── Venkataramana + Latha's child ──
  const naveen = await createMember('Naveen Reddy', 'M', '1998-01-25', {
    phone: '+91-98490-20017',
    email: 'naveen.reddy@example.com',
    occupation: 'Civil Engineer',
    bio: 'Son of Venkataramana. Joined his father\'s construction firm.',
    birthPlace: 'Vijayawada, Andhra Pradesh'
  });

  // ── Ravi + Sunita's children ──
  const shankar = await createMember('Shankar Reddy', 'M', '1999-04-11', {
    phone: '+91-98490-20018',
    email: 'shankar.reddy@example.com',
    occupation: 'Farmer',
    bio: 'Elder son of Ravi. Organic farming enthusiast.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  const poornima = await createMember('Poornima Reddy', 'F', '2002-09-03', {
    phone: '+91-98490-20019',
    email: 'poornima.reddy@example.com',
    occupation: 'College Student',
    bio: 'Youngest grandchild of Subbarao. Studying veterinary science.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  // ═══════════════════════════════════════════════════════════════
  //  GENERATION 4 — Great-grandchildren
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Creating Generation 4 (Great-grandchildren)...');

  // ── Kiran + Sneha's children ──
  const aarav = await createMember('Aarav Reddy', 'M', '2018-05-20', {
    bio: 'Son of Kiran and Sneha. Loves cricket and painting.',
    birthPlace: 'Bangalore, Karnataka'
  });

  const isha = await createMember('Isha Reddy', 'F', '2020-11-08', {
    bio: 'Daughter of Kiran and Sneha. The family\'s youngest bundle of energy.',
    birthPlace: 'Bangalore, Karnataka'
  });

  // ── Divya + Praveen's child ──
  const praveen = await createMember('Praveen Sharma', 'M', '1991-06-18', {
    phone: '+91-98490-30001',
    email: 'praveen.sharma@example.com',
    occupation: 'Civil Engineer',
    bio: 'Husband of Divya. Works for a government infrastructure project.',
    birthPlace: 'Hyderabad, Telangana'
  });

  const meenakshi = await createMember('Meenakshi Sharma', 'F', '2019-08-14', {
    bio: 'Daughter of Divya and Praveen. Named after Divya\'s grandmother.',
    birthPlace: 'Hyderabad, Telangana'
  });

  // ── Vikram + Deepthi's biological children ──
  const arjun = await createMember('Arjun Reddy', 'M', '2019-02-14', {
    bio: 'Biological son of Vikram and Deepthi. Born on Valentine\'s Day.',
    birthPlace: 'Bangalore, Karnataka'
  });

  const nisha = await createMember('Nisha Reddy', 'F', '2021-07-30', {
    bio: 'Biological daughter of Vikram and Deepthi.',
    birthPlace: 'Bangalore, Karnataka'
  });

  // ── Vikram + Deepthi's adopted children ──
  const kavya = await createMember('Kavya Reddy', 'F', '2018-03-10', {
    bio: 'Adopted daughter of Vikram and Deepthi. From an orphanage in Chennai. Loves dancing.',
    birthPlace: 'Chennai, Tamil Nadu'
  });

  const rahul = await createMember('Rahul Reddy', 'M', '2020-12-25', {
    bio: 'Adopted son of Vikram and Deepthi. Born on Christmas Day. Loves building LEGO.',
    birthPlace: 'Bangalore, Karnataka'
  });

  // ── Aditya + Pooja's child ──
  const vivaan = await createMember('Vivaan Nagarajan', 'M', '2019-09-05', {
    bio: 'Son of Aditya and Pooja. Very curious about everything.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  // ── Siddharth + Anusha's child ──
  const diya = await createMember('Diya Reddy', 'F', '2022-01-15', {
    bio: 'Daughter of Siddharth and Anusha. Granddaughter of Prasad and Jyothi.',
    birthPlace: 'Guntur, Andhra Pradesh'
  });

  // ── Ananya + Venkat's child ──
  const srinivas = await createMember('Srinivas Venkat', 'M', '2021-04-08', {
    bio: 'Son of Ananya and Venkat. Lives in Mumbai.',
    birthPlace: 'Mumbai, Maharashtra'
  });

  // ── Meera + Arun's child ──
  const prerana = await createMember('Prerana Nagarajan', 'F', '2020-06-21', {
    bio: 'Daughter of Meera and Arun. Named after Arun\'s mother.',
    birthPlace: 'Hyderabad, Telangana'
  });

  // ═══════════════════════════════════════════════════════════════
  //  FAMILY MEMBERSHIPS
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Creating family memberships...');

  const allMembers = [
    // Gen 1
    { m: sriVenkata, role: 'MEMBER' },
    { m: satyavathi, role: 'MEMBER' },
    { m: subbarao, role: 'MEMBER' },
    { m: kamakshi, role: 'MEMBER' },
    // Gen 2
    { m: ramesh, role: 'FOUNDER' },
    { m: padma, role: 'MEMBER' },
    { m: suresh, role: 'HISTORIAN' },
    { m: geetha, role: 'MEMBER' },
    { m: kamala, role: 'MEMBER' },
    { m: nagarajan, role: 'MEMBER' },
    { m: prasad, role: 'MEMBER' },
    { m: jyothi, role: 'MEMBER' },
    { m: mahesh, role: 'MEMBER' },
    { m: venkataramana, role: 'MEMBER' },
    { m: latha, role: 'MEMBER' },
    { m: ravi, role: 'MEMBER' },
    { m: sunita, role: 'MEMBER' },
    // Gen 3
    { m: kiran, role: 'MEMBER' },
    { m: sneha, role: 'MEMBER' },
    { m: divya, role: 'MEMBER' },
    { m: vikram, role: 'MEMBER' },
    { m: deepthi, role: 'MEMBER' },
    { m: ananya, role: 'MEMBER' },
    { m: venkat, role: 'MEMBER' },
    { m: rohit, role: 'MEMBER' },
    { m: shreya, role: 'MEMBER' },
    { m: aditya, role: 'MEMBER' },
    { m: pooja, role: 'MEMBER' },
    { m: meera, role: 'MEMBER' },
    { m: arun, role: 'MEMBER' },
    { m: siddharth, role: 'MEMBER' },
    { m: anusha, role: 'MEMBER' },
    { m: tara, role: 'MEMBER' },
    { m: naveen, role: 'MEMBER' },
    { m: shankar, role: 'MEMBER' },
    { m: poornima, role: 'MEMBER' },
    // Gen 4
    { m: aarav, role: 'MEMBER' },
    { m: isha, role: 'MEMBER' },
    { m: praveen, role: 'MEMBER' },
    { m: meenakshi, role: 'MEMBER' },
    { m: arjun, role: 'MEMBER' },
    { m: nisha, role: 'MEMBER' },
    { m: kavya, role: 'MEMBER' },
    { m: rahul, role: 'MEMBER' },
    { m: vivaan, role: 'MEMBER' },
    { m: diya, role: 'MEMBER' },
    { m: srinivas, role: 'MEMBER' },
    { m: prerana, role: 'MEMBER' }
  ];

  for (const item of allMembers) {
    await prisma.familyMembership.create({
      data: {
        familyId: family.id,
        memberId: item.m.id,
        role: item.role,
        isPrimary: item.role === 'FOUNDER'
      }
    });
  }
  console.log(`   ${allMembers.length} memberships created.`);

  // ═══════════════════════════════════════════════════════════════
  //  RELATIONSHIPS
  //  Direction rules (from editRelationship / joinRequest controllers):
  //    FATHER/MOTHER/STEP_* : personId = parent, relatedPersonId = child
  //    HUSBAND/WIFE         : personId = the named role
  //    ADOPTED_CHILD        : personId = adoptive parent, relatedPersonId = child
  //    GUARDIAN             : personId = guardian, relatedPersonId = ward
  //    BROTHER/SISTER       : personId = the named role
  //    UNCLE/AUNT/COUSIN    : direct person-to-person
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Creating relationships...');

  let relCount = 0;
  const createRel = async (personId, relatedPersonId, type) => {
    await prisma.relationship.create({
      data: { familyId: family.id, personId, relatedPersonId, type }
    });
    relCount++;
  };

  // ── Sri Venkata (1) + Satyavathi (2): spouses ──
  await createRel(sriVenkata.id, satyavathi.id, 'HUSBAND');
  await createRel(satyavathi.id, sriVenkata.id, 'WIFE');

  // Sri Venkata + Satyavathi → children
  await createRel(sriVenkata.id, ramesh.id, 'FATHER');
  await createRel(satyavathi.id, ramesh.id, 'MOTHER');
  await createRel(sriVenkata.id, suresh.id, 'FATHER');
  await createRel(satyavathi.id, suresh.id, 'MOTHER');
  await createRel(sriVenkata.id, kamala.id, 'FATHER');
  await createRel(satyavathi.id, kamala.id, 'MOTHER');
  await createRel(sriVenkata.id, prasad.id, 'FATHER');
  await createRel(satyavathi.id, prasad.id, 'MOTHER');

  // ── Subbarao (3) + Kamakshi (4): spouses ──
  await createRel(subbarao.id, kamakshi.id, 'HUSBAND');
  await createRel(kamakshi.id, subbarao.id, 'WIFE');

  // Subbarao + Kamakshi → children
  await createRel(subbarao.id, venkataramana.id, 'FATHER');
  await createRel(kamakshi.id, venkataramana.id, 'MOTHER');
  await createRel(subbarao.id, ravi.id, 'FATHER');
  await createRel(kamakshi.id, ravi.id, 'MOTHER');

  // Sri Venkata ↔ Subbarao siblings
  await createRel(sriVenkata.id, subbarao.id, 'BROTHER');
  await createRel(subbarao.id, sriVenkata.id, 'BROTHER');

  // ── Ramesh (5) + Padma (6): spouses ──
  await createRel(ramesh.id, padma.id, 'HUSBAND');
  await createRel(padma.id, ramesh.id, 'WIFE');

  // Ramesh + Padma → children
  await createRel(ramesh.id, kiran.id, 'FATHER');
  await createRel(padma.id, kiran.id, 'MOTHER');
  await createRel(ramesh.id, divya.id, 'FATHER');
  await createRel(padma.id, divya.id, 'MOTHER');

  // ── Suresh (7) + Geetha (8): spouses ──
  await createRel(suresh.id, geetha.id, 'HUSBAND');
  await createRel(geetha.id, suresh.id, 'WIFE');

  // Suresh + Geetha → children
  await createRel(suresh.id, vikram.id, 'FATHER');
  await createRel(geetha.id, vikram.id, 'MOTHER');
  await createRel(suresh.id, ananya.id, 'FATHER');
  await createRel(geetha.id, ananya.id, 'MOTHER');
  await createRel(suresh.id, rohit.id, 'FATHER');
  await createRel(geetha.id, rohit.id, 'MOTHER');

  // ── Kamala (9) + Nagarajan (10): spouses ──
  await createRel(nagarajan.id, kamala.id, 'HUSBAND');
  await createRel(kamala.id, nagarajan.id, 'WIFE');

  // Kamala + Nagarajan → children
  await createRel(nagarajan.id, aditya.id, 'FATHER');
  await createRel(kamala.id, aditya.id, 'MOTHER');
  await createRel(nagarajan.id, meera.id, 'FATHER');
  await createRel(kamala.id, meera.id, 'MOTHER');

  // ── Prasad (11) + Jyothi (12): spouses (Prasad deceased) ──
  await createRel(prasad.id, jyothi.id, 'HUSBAND');
  await createRel(jyothi.id, prasad.id, 'WIFE');

  // Prasad + Jyothi → children
  await createRel(prasad.id, siddharth.id, 'FATHER');
  await createRel(jyothi.id, siddharth.id, 'MOTHER');

  // ── Jyothi (12) + Mahesh (13): remarriage spouses ──
  await createRel(mahesh.id, jyothi.id, 'HUSBAND');
  await createRel(jyothi.id, mahesh.id, 'WIFE');

  // Jyothi + Mahesh → children
  await createRel(mahesh.id, tara.id, 'FATHER');
  await createRel(jyothi.id, tara.id, 'MOTHER');

  // Mahesh is STEP_FATHER to Siddharth
  await createRel(mahesh.id, siddharth.id, 'STEP_FATHER');

  // ── Venkataramana (14) + Latha (15): spouses ──
  await createRel(venkataramana.id, latha.id, 'HUSBAND');
  await createRel(latha.id, venkataramana.id, 'WIFE');

  // Venkataramana + Latha → children
  await createRel(venkataramana.id, naveen.id, 'FATHER');
  await createRel(latha.id, naveen.id, 'MOTHER');

  // ── Ravi (16) + Sunita (17): spouses ──
  await createRel(ravi.id, sunita.id, 'HUSBAND');
  await createRel(sunita.id, ravi.id, 'WIFE');

  // Ravi + Sunita → children
  await createRel(ravi.id, shankar.id, 'FATHER');
  await createRel(sunita.id, shankar.id, 'MOTHER');
  await createRel(ravi.id, poornima.id, 'FATHER');
  await createRel(sunita.id, poornima.id, 'MOTHER');

  // ── Kiran (18) + Sneha (19): spouses (second marriage for Kiran) ──
  await createRel(kiran.id, sneha.id, 'HUSBAND');
  await createRel(sneha.id, kiran.id, 'WIFE');

  // Kiran + Sneha → children
  await createRel(kiran.id, aarav.id, 'FATHER');
  await createRel(sneha.id, aarav.id, 'MOTHER');
  await createRel(kiran.id, isha.id, 'FATHER');
  await createRel(sneha.id, isha.id, 'MOTHER');

  // ── Divya (20) + Praveen (39): spouses ──
  await createRel(praveen.id, divya.id, 'HUSBAND');
  await createRel(divya.id, praveen.id, 'WIFE');

  // Divya + Praveen → children
  await createRel(praveen.id, meenakshi.id, 'FATHER');
  await createRel(divya.id, meenakshi.id, 'MOTHER');

  // ── Vikram (21) + Deepthi (22): spouses ──
  await createRel(vikram.id, deepthi.id, 'HUSBAND');
  await createRel(deepthi.id, vikram.id, 'WIFE');

  // Vikram + Deepthi → biological children
  await createRel(vikram.id, arjun.id, 'FATHER');
  await createRel(deepthi.id, arjun.id, 'MOTHER');
  await createRel(vikram.id, nisha.id, 'FATHER');
  await createRel(deepthi.id, nisha.id, 'MOTHER');

  // Vikram + Deepthi → adopted children
  await createRel(vikram.id, kavya.id, 'ADOPTED_CHILD');
  await createRel(deepthi.id, kavya.id, 'ADOPTED_CHILD');
  await createRel(vikram.id, rahul.id, 'ADOPTED_CHILD');
  await createRel(deepthi.id, rahul.id, 'ADOPTED_CHILD');

  // ── Ananya (23) + Venkat (24): spouses ──
  await createRel(venkat.id, ananya.id, 'HUSBAND');
  await createRel(ananya.id, venkat.id, 'WIFE');

  // Ananya + Venkat → children
  await createRel(venkat.id, srinivas.id, 'FATHER');
  await createRel(ananya.id, srinivas.id, 'MOTHER');

  // ── Rohit (25) + Shreya (26): spouses ──
  await createRel(rohit.id, shreya.id, 'HUSBAND');
  await createRel(shreya.id, rohit.id, 'WIFE');

  // ── Aditya (27) + Pooja (28): spouses ──
  await createRel(aditya.id, pooja.id, 'HUSBAND');
  await createRel(pooja.id, aditya.id, 'WIFE');

  // Aditya + Pooja → children
  await createRel(aditya.id, vivaan.id, 'FATHER');
  await createRel(pooja.id, vivaan.id, 'MOTHER');

  // ── Meera (29) + Arun (30): spouses ──
  await createRel(arun.id, meera.id, 'HUSBAND');
  await createRel(meera.id, arun.id, 'WIFE');

  // Meera + Arun → children
  await createRel(arun.id, prerana.id, 'FATHER');
  await createRel(meera.id, prerana.id, 'MOTHER');

  // ── Siddharth (31) + Anusha (32): spouses ──
  await createRel(siddharth.id, anusha.id, 'HUSBAND');
  await createRel(anusha.id, siddharth.id, 'WIFE');

  // Siddharth + Anusha → children
  await createRel(siddharth.id, diya.id, 'FATHER');
  await createRel(anusha.id, diya.id, 'MOTHER');

  // ═══════════════════════════════════════════════════════════════
  //  SIBLING RELATIONSHIPS (Gen 2 — children of Sri Venkata)
  // ═══════════════════════════════════════════════════════════════
  console.log('📌 Creating sibling + cross-family relationships...');

  // Ramesh ↔ Suresh ↔ Kamala ↔ Prasad
  await createRel(ramesh.id, suresh.id, 'BROTHER');
  await createRel(suresh.id, ramesh.id, 'BROTHER');
  await createRel(ramesh.id, kamala.id, 'BROTHER');
  await createRel(kamala.id, ramesh.id, 'SISTER');
  await createRel(ramesh.id, prasad.id, 'BROTHER');
  await createRel(prasad.id, ramesh.id, 'BROTHER');
  await createRel(suresh.id, kamala.id, 'BROTHER');
  await createRel(kamala.id, suresh.id, 'SISTER');
  await createRel(suresh.id, prasad.id, 'BROTHER');
  await createRel(prasad.id, suresh.id, 'BROTHER');
  await createRel(kamala.id, prasad.id, 'SISTER');
  await createRel(prasad.id, kamala.id, 'BROTHER');

  // Venkataramana ↔ Ravi (Subbarao's children)
  await createRel(venkataramana.id, ravi.id, 'BROTHER');
  await createRel(ravi.id, venkataramana.id, 'BROTHER');

  // ═══════════════════════════════════════════════════════════════
  //  COUSIN + UNCLE/AUNT RELATIONSHIPS (Cross-branch)
  // ═══════════════════════════════════════════════════════════════
  // Gen 2: Ramesh/Suresh/Kamala/Prasad are first cousins of Venkataramana/Ravi
  await createRel(ramesh.id, venkataramana.id, 'COUSIN');
  await createRel(venkataramana.id, ramesh.id, 'COUSIN');
  await createRel(ramesh.id, ravi.id, 'COUSIN');
  await createRel(ravi.id, ramesh.id, 'COUSIN');
  await createRel(suresh.id, venkataramana.id, 'COUSIN');
  await createRel(venkataramana.id, suresh.id, 'COUSIN');
  await createRel(suresh.id, ravi.id, 'COUSIN');
  await createRel(ravi.id, suresh.id, 'COUSIN');
  await createRel(kamala.id, venkataramana.id, 'COUSIN');
  await createRel(venkataramana.id, kamala.id, 'COUSIN');
  await createRel(kamala.id, ravi.id, 'COUSIN');
  await createRel(ravi.id, kamala.id, 'COUSIN');
  await createRel(prasad.id, venkataramana.id, 'COUSIN');
  await createRel(venkataramana.id, prasad.id, 'COUSIN');
  await createRel(prasad.id, ravi.id, 'COUSIN');
  await createRel(ravi.id, prasad.id, 'COUSIN');

  // Gen 3: First cousins (children of Ramesh vs children of Suresh)
  await createRel(kiran.id, vikram.id, 'COUSIN');
  await createRel(vikram.id, kiran.id, 'COUSIN');
  await createRel(kiran.id, ananya.id, 'COUSIN');
  await createRel(ananya.id, kiran.id, 'COUSIN');
  await createRel(kiran.id, rohit.id, 'COUSIN');
  await createRel(rohit.id, kiran.id, 'COUSIN');
  await createRel(divya.id, vikram.id, 'COUSIN');
  await createRel(vikram.id, divya.id, 'COUSIN');
  await createRel(divya.id, ananya.id, 'COUSIN');
  await createRel(ananya.id, divya.id, 'COUSIN');
  await createRel(divya.id, rohit.id, 'COUSIN');
  await createRel(rohit.id, divya.id, 'COUSIN');

  // Gen 3: First cousins across all 4 siblings
  await createRel(kiran.id, aditya.id, 'COUSIN');
  await createRel(aditya.id, kiran.id, 'COUSIN');
  await createRel(kiran.id, meera.id, 'COUSIN');
  await createRel(meera.id, kiran.id, 'COUSIN');
  await createRel(kiran.id, siddharth.id, 'COUSIN');
  await createRel(siddharth.id, kiran.id, 'COUSIN');
  await createRel(vikram.id, aditya.id, 'COUSIN');
  await createRel(aditya.id, vikram.id, 'COUSIN');
  await createRel(vikram.id, meera.id, 'COUSIN');
  await createRel(meera.id, vikram.id, 'COUSIN');
  await createRel(vikram.id, siddharth.id, 'COUSIN');
  await createRel(siddharth.id, vikram.id, 'COUSIN');
  await createRel(divya.id, aditya.id, 'COUSIN');
  await createRel(aditya.id, divya.id, 'COUSIN');
  await createRel(divya.id, meera.id, 'COUSIN');
  await createRel(meera.id, divya.id, 'COUSIN');
  await createRel(divya.id, siddharth.id, 'COUSIN');
  await createRel(siddharth.id, divya.id, 'COUSIN');
  await createRel(rohit.id, aditya.id, 'COUSIN');
  await createRel(aditya.id, rohit.id, 'COUSIN');
  await createRel(rohit.id, meera.id, 'COUSIN');
  await createRel(meera.id, rohit.id, 'COUSIN');
  await createRel(rohit.id, siddharth.id, 'COUSIN');
  await createRel(siddharth.id, rohit.id, 'COUSIN');

  // Gen 3: Cross-branch cousins (children of Sri Venkata's line vs Subbarao's line)
  // Kiran is first cousin once removed from Naveen (Naveen's dad is Ramesh's first cousin)
  // For simplicity, mark them as COUSIN
  await createRel(kiran.id, naveen.id, 'COUSIN');
  await createRel(naveen.id, kiran.id, 'COUSIN');
  await createRel(vikram.id, naveen.id, 'COUSIN');
  await createRel(naveen.id, vikram.id, 'COUSIN');
  await createRel(kiran.id, shankar.id, 'COUSIN');
  await createRel(shankar.id, kiran.id, 'COUSIN');
  await createRel(vikram.id, shankar.id, 'COUSIN');
  await createRel(shankar.id, vikram.id, 'COUSIN');

  // Uncle/Aunt: Ramesh is uncle to Naveen, Shankar, Poornima (through their fathers being his cousins)
  // Actually, Venkataramana and Ravi are Ramesh's first cousins, so Ramesh is their first cousin, not uncle.
  // But for display purposes, Gen 2 of Sri Venkata's line can be marked as UNCLE/AUNT to Gen 3 of Subbarao's line
  // Let's keep it simpler and just use COUSIN for cross-branch.

  // Tara is Siddharth's half-sister (same mother Jyothi)
  await createRel(tara.id, siddharth.id, 'SISTER');
  await createRel(siddharth.id, tara.id, 'BROTHER');

  console.log(`\n✅ Seed complete!`);
  console.log(`   Members:        ${allMembers.length}`);
  console.log(`   Relationships:  ${relCount}`);

  // ─── Recalculate generations ───
  console.log('\n🔄 Recalculating generation numbers...');
  await recalculateFamilyGenerations(family.id);
  console.log('   Done.');

  console.log(`\n🎉 REDDY family tree seeded successfully!`);
  console.log(`   Login:  ramesh.reddy@example.com / password123`);
  console.log(`   Family: ${FAMILY_ID}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
