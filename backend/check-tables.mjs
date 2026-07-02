import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tables = [
  '"User"', '"Session"', '"Family"', '"FamilyMember"', '"FamilyMembership"',
  '"Relationship"', '"JoinRequest"', '"Memory"', '"MemoryTag"', '"TimelineEvent"',
  '"Notification"', '"NotificationPreferences"', '"Conversation"', '"Message"',
  '"PrivacySettings"', '"AuditLog"', '"ContactRequest"'
];

console.log('═══ DATABASE TABLE ROW COUNTS ═══\n');

for (const table of tables) {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM ${table}`);
    const name = table.replace(/"/g, '');
    console.log(`  ${name.padEnd(25)} ${result[0].count}`);
  } catch (e) {
    const name = table.replace(/"/g, '');
    console.log(`  ${name.padEnd(25)} ERROR: ${e.message}`);
  }
}

console.log('\n═══ MIGRATION STATUS ═══\n');

try {
  const migrations = await prisma.$queryRawUnsafe(
    `SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at`
  );
  migrations.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.migration_name} — ${m.finished_at ? 'Applied' : 'Pending'}`);
  });
  console.log(`\n  Total: ${migrations.length} migrations applied`);
} catch (e) {
  console.log(`  ERROR: ${e.message}`);
}

await prisma.$disconnect();
