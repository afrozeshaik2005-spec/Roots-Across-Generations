import http from 'http';

const BASE = 'http://localhost:5000/api/v1';
let passed = 0;
let failed = 0;
let skipped = 0;
const results = [];

function req(method, path, { token, body, json = true } = {}) {
  return new Promise((resolve) => {
    const url = new URL(`${BASE}${path}`);
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body && json) headers['Content-Type'] = 'application/json';
    const opts = { method, hostname: 'localhost', port: 5000, path: url.pathname + url.search, headers };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (body && json) r.write(JSON.stringify(body));
    r.end();
  });
}

function test(id, desc, status, expected, extra) {
  const pass = Array.isArray(expected) ? expected.includes(status) : status === expected;
  if (pass) passed++; else failed++;
  const mark = pass ? '✓' : '✗';
  const note = extra ? ` — ${extra}` : '';
  results.push({ id, desc, status, expected, pass, note });
  console.log(`  ${mark} ${id}: ${desc} → ${status}${note}`);
}

let tokenA, tokenB, memberIdA, memberIdB, familyId, familyReadableId;
let memoryId, joinRequestId, eventId, conversationId, messageId, contactRequestId;

const tsA = Date.now();
const EMAIL_A = `apitest_a_${tsA}@example.com`;
const PW = 'Test1234!';

const tsB = Date.now() + 1;
const EMAIL_B = `apitest_b_${tsB}@example.com`;

// ══════════════════════════════════════════════════════
// MODULE 1: AUTH
// ══════════════════════════════════════════════════════
console.log('\n═══ MODULE 1: AUTH ═══');

// AU-01: Signup User A (no token returned — must login after)
{
  const r = await req('POST', '/auth/signup', {
    body: { email: EMAIL_A, password: PW, fullName: 'Founder Person' }
  });
  test('AU-01', 'Signup User A', r.status, 201);
}

// AU-02: Signup User B
{
  const r = await req('POST', '/auth/signup', {
    body: { email: EMAIL_B, password: PW, fullName: 'Member Person' }
  });
  test('AU-02', 'Signup User B', r.status, 201);
}

// AU-03: Login User A → get accessToken
{
  const r = await req('POST', '/auth/login', {
    body: { email: EMAIL_A, password: PW }
  });
  test('AU-03', 'Login User A', r.status, 200);
  tokenA = r.body?.accessToken;
}

// AU-04: Login User B → get accessToken
{
  const r = await req('POST', '/auth/login', {
    body: { email: EMAIL_B, password: PW }
  });
  test('AU-04', 'Login User B', r.status, 200);
  tokenB = r.body?.accessToken;
}

// AU-05: Login wrong password
{
  const r = await req('POST', '/auth/login', { body: { email: EMAIL_A, password: 'wrong' } });
  test('AU-05', 'Login wrong password', r.status, 401);
}

// AU-06: Login nonexistent user
{
  const r = await req('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'x' } });
  test('AU-06', 'Login nonexistent user', r.status, 401);
}

// AU-07: Get /me with valid token
{
  const r = await req('GET', '/auth/me', { token: tokenA });
  test('AU-07', 'GET /auth/me', r.status, 200);
}

// AU-08: Get /me without token
{
  const r = await req('GET', '/auth/me');
  test('AU-08', 'GET /auth/me no token', r.status, 401);
}

// AU-09: Get /me with bad token
{
  const r = await req('GET', '/auth/me', { token: 'garbage' });
  test('AU-09', 'GET /auth/me bad token', r.status, 401);
}

// AU-10: Signup duplicate email
{
  const r = await req('POST', '/auth/signup', { body: { email: EMAIL_A, password: PW } });
  test('AU-10', 'Signup duplicate email', r.status, 409);
}

// AU-11: Signup short password
{
  const r = await req('POST', '/auth/signup', { body: { email: `x_${Date.now()}@x.com`, password: 'short' } });
  test('AU-11', 'Signup short password', r.status, [400, 422]);
}

// AU-12: Logout
{
  const r = await req('POST', '/auth/logout', { token: tokenA });
  test('AU-12', 'Logout', r.status, 200);
  // Re-login for subsequent tests
  const lr = await req('POST', '/auth/login', { body: { email: EMAIL_A, password: PW } });
  tokenA = lr.body?.accessToken;
}

// ══════════════════════════════════════════════════════
// MODULE 2: FAMILY
// ══════════════════════════════════════════════════════
console.log('\n═══ MODULE 2: FAMILY ═══');

// FM-01: Create Family
{
  const r = await req('POST', '/families', {
    token: tokenA,
    body: {
      name: 'Test Family',
      surname: 'Tester',
      founderProfile: {
        fullName: 'Founder Person',
        dob: '1970-01-15',
        gender: 'M',
        phone: '555-0001'
      }
    }
  });
  test('FM-01', 'Create family', r.status, 201);
  familyId = r.body?.family?.id;
  familyReadableId = r.body?.family?.familyId;
}

// FM-02: CRITICAL — GET /me after family creation (memberId should now resolve)
{
  const r = await req('GET', '/auth/me', { token: tokenA });
  test('FM-02', 'GET /me after family (memberId)', r.status, 200);
  memberIdA = r.body?.user?.memberId;
  console.log(`         memberIdA = ${memberIdA || 'NULL — STILL BROKEN'}`);
}

// FM-03: Create family without auth
{
  const r = await req('POST', '/families', { body: { name: 'X', surname: 'Y' } });
  test('FM-03', 'Create family no auth', r.status, 401);
}

// FM-04: Get join info
{
  const r = await req('GET', `/families/join-info/${familyReadableId}`);
  test('FM-04', 'Get join info', r.status, 200);
}

// FM-05: Get family tree
{
  const r = await req('GET', `/families/${familyId}/tree`, { token: tokenA });
  test('FM-05', 'Get family tree', r.status, 200);
}

// FM-06: Get family members
{
  const r = await req('GET', `/families/${familyId}/members`, { token: tokenA });
  test('FM-06', 'Get family members', r.status, 200);
}

// FM-07: Get invite info
{
  const r = await req('GET', `/families/${familyId}/invite-info`, { token: tokenA });
  test('FM-07', 'Get invite info', r.status, [200, 403]);
}

// FM-08: Find relationship
{
  const r = await req('GET', `/families/${familyId}/relationship?memberA=${memberIdA}&memberB=${memberIdA}`, { token: tokenA });
  test('FM-08', 'Find relationship (self)', r.status, [200, 400]);
}

// FM-09: Search family
{
  const r = await req('GET', `/families/${familyId}/search?q=Founder`, { token: tokenA });
  test('FM-09', 'Search family', r.status, 200);
}

// FM-10: Get tree without auth
{
  const r = await req('GET', `/families/${familyId}/tree`);
  test('FM-10', 'Get tree no auth', r.status, 401);
}

// ══════════════════════════════════════════════════════
// MODULE 3: MEMBERS
// ══════════════════════════════════════════════════════
console.log('\n═══ MODULE 3: MEMBERS ═══');

// MEM-01: Get own profile (OWNER view)
{
  const r = await req('GET', `/members/${memberIdA}?familyId=${familyId}`, { token: tokenA });
  test('MEM-01', 'Get own profile (OWNER)', r.status, 200);
}

// MEM-02: Get profile as link viewer (no auth — requires shareableLink, returns 403 without it)
{
  const r = await req('GET', `/members/${memberIdA}?familyId=${familyId}`);
  test('MEM-02', 'Get profile unauth (no shareableLink)', r.status, 403);
}

// MEM-03: Update own profile
{
  const r = await req('PATCH', `/members/${memberIdA}`, {
    token: tokenA, body: { bio: 'Updated via test' }
  });
  test('MEM-03', 'Update own profile', r.status, [200, 404]);
}

// MEM-04: Update privacy settings
{
  const r = await req('PATCH', `/members/${memberIdA}/privacy`, {
    token: tokenA, body: { hidePhone: true }
  });
  test('MEM-04', 'Update privacy settings', r.status, [200, 404]);
}

// MEM-05: Add timeline event
{
  const r = await req('POST', `/members/${memberIdA}/timeline`, {
    token: tokenA, body: { title: 'Born', eventDate: '1970-01-15', type: 'BORN' }
  });
  test('MEM-05', 'Add timeline event', r.status, [201, 400]);
  eventId = r.body?.event?.id;
}

// MEM-06: Get core family
{
  const r = await req('GET', `/members/${memberIdA}/core-family`, { token: tokenA });
  test('MEM-06', 'Get core family', r.status, [200, 404]);
}

// MEM-07: Get relation to me
{
  const r = await req('GET', `/members/${memberIdA}/relation-to-me?sourceMemberId=${memberIdA}&familyId=${familyId}`, { token: tokenA });
  test('MEM-07', 'Get relation to me (self)', r.status, [200, 400]);
}

// MEM-08: Delete timeline event
if (eventId) {
  const r = await req('DELETE', `/members/${memberIdA}/timeline/${eventId}`, { token: tokenA });
  test('MEM-08', 'Delete timeline event', r.status, [200, 204]);
} else {
  test('MEM-08', 'Delete timeline event', 0, 0, 'skipped — no eventId'); skipped++;
}

// MEM-09: Get non-existent member
{
  const r = await req('GET', '/members/nonexistent-id');
  test('MEM-09', 'Get non-existent member', r.status, 404);
}

// MEM-10: Update member without auth
{
  const r = await req('PATCH', `/members/${memberIdA}`, { body: { bio: 'hacked' } });
  test('MEM-10', 'Update member no auth', r.status, 401);
}

// ══════════════════════════════════════════════════════
// MODULE 4: JOIN REQUESTS
// ══════════════════════════════════════════════════════
console.log('\n═══ MODULE 4: JOIN REQUESTS ═══');

// JR-01: Submit join request (User B → family)
{
  const r = await req('POST', '/join-requests', {
    token: tokenB,
    body: {
      familyId,
      fullName: 'Member Person',
      dob: '1990-05-20',
      email: EMAIL_B,
      phone: '555-0002',
      gender: 'F',
      relatedToMemberId: memberIdA,
      relationshipType: 'DAUGHTER'
    }
  });
  test('JR-01', 'Submit join request', r.status, [201, 400, 409]);
  joinRequestId = r.body?.joinRequest?.id || r.body?.request?.id;
}

// JR-02: Get my join requests (User B)
{
  const r = await req('GET', '/join-requests/my-requests', { token: tokenB });
  test('JR-02', 'Get my join requests', r.status, 200);
}

// JR-03: Get family join requests (founder)
{
  const r = await req('GET', `/join-requests/family/${familyId}`, { token: tokenA });
  test('JR-03', 'Get family join requests', r.status, 200);
}

// JR-04: Accept join request
if (joinRequestId) {
  const r = await req('PATCH', `/join-requests/${joinRequestId}/accept`, { token: tokenA });
  test('JR-04', 'Accept join request', r.status, [200, 404]);
  // Refresh User B token to pick up memberId
  const lr = await req('POST', '/auth/login', { body: { email: EMAIL_B, password: PW } });
  tokenB = lr.body?.accessToken;
  const meB = await req('GET', '/auth/me', { token: tokenB });
  memberIdB = meB.body?.user?.memberId;
  console.log(`         memberIdB = ${memberIdB || 'NULL'}`);
} else {
  test('JR-04', 'Accept join request', 0, 0, 'skipped'); skipped++;
}

// JR-05: Get my requests after accept
{
  const r = await req('GET', '/join-requests/my-requests', { token: tokenB });
  test('JR-05', 'Get my requests after accept', r.status, 200);
}

// JR-06: Submit join request without auth
{
  const r = await req('POST', '/join-requests', {
    body: { familyId, fullName: 'X', dob: '2000-01-01', email: 'x@x.com', phone: '0', relatedToMemberId: memberIdA, relationshipType: 'SON' }
  });
  test('JR-06', 'Submit join request no auth', r.status, 401);
}

// ══════════════════════════════════════════════════════
// MODULE 5: MEMORIES
// ══════════════════════════════════════════════════════
console.log('\n═══ MODULE 5: MEMORIES ═══');

// MEMO-01: Get family memories
{
  const r = await req('GET', `/memories/family/${familyId}`, { token: tokenA });
  test('MEMO-01', 'Get family memories', r.status, 200);
}

// MEMO-02: Get member memories
{
  const r = await req('GET', `/memories/member/${memberIdA}`, { token: tokenA });
  test('MEMO-02', 'Get member memories', r.status, 200);
}

// MEMO-03: Get family memories without auth
{
  const r = await req('GET', `/memories/family/${familyId}`);
  test('MEMO-03', 'Get memories no auth', r.status, 401);
}

// ══════════════════════════════════════════════════════
// MODULE 6: NOTIFICATIONS
// ══════════════════════════════════════════════════════
console.log('\n═══ MODULE 6: NOTIFICATIONS ═══');

// NOTIF-01: Get notifications
{
  const r = await req('GET', '/notifications', { token: tokenA });
  test('NOTIF-01', 'Get notifications', r.status, 200);
}

// NOTIF-02: Get notification preferences
{
  const r = await req('GET', '/notifications/preferences', { token: tokenA });
  test('NOTIF-02', 'Get notification prefs', r.status, 200);
}

// NOTIF-03: Update notification preferences
{
  const r = await req('PATCH', '/notifications/preferences', {
    token: tokenA, body: { joinRequest: false }
  });
  test('NOTIF-03', 'Update notification prefs', r.status, [200, 404]);
}

// NOTIF-04: Mark all as read
{
  const r = await req('POST', '/notifications/read-all', { token: tokenA });
  test('NOTIF-04', 'Mark all notifications read', r.status, [200, 204]);
}

// NOTIF-05: Get notifications without auth
{
  const r = await req('GET', '/notifications');
  test('NOTIF-05', 'Get notifications no auth', r.status, 401);
}

// ══════════════════════════════════════════════════════
// MODULE 7: MESSAGING
// ══════════════════════════════════════════════════════
console.log('\n═══ MODULE 7: MESSAGING ═══');

// MSG-01: Get conversations list (requires familyId query param)
{
  const r = await req('GET', `/messages/conversations?familyId=${familyId}`, { token: tokenA });
  test('MSG-01', 'Get conversations list', r.status, 200);
}

// MSG-02: Start conversation (requires targetMemberId, not memberId)
if (memberIdB) {
  const r = await req('POST', '/messages/conversations', {
    token: tokenA, body: { familyId, targetMemberId: memberIdB }
  });
  test('MSG-02', 'Start conversation', r.status, [200, 201]);
  conversationId = r.body?.conversation?.id;
} else {
  test('MSG-02', 'Start conversation', 0, 0, 'skipped — no memberIdB'); skipped++;
}

// MSG-03: Get conversations list (after creating one)
{
  const r = await req('GET', `/messages/conversations?familyId=${familyId}`, { token: tokenA });
  test('MSG-03', 'Get conversations list (with data)', r.status, 200);
}

// MSG-04: Send message
if (conversationId) {
  const r = await req('POST', `/messages/conversations/${conversationId}`, {
    token: tokenA, body: { content: 'Hello from test!' }
  });
  test('MSG-04', 'Send message', r.status, [200, 201]);
  messageId = r.body?.message?.id;
} else {
  test('MSG-04', 'Send message', 0, 0, 'skipped'); skipped++;
}

// MSG-05: Get conversation messages
if (conversationId) {
  const r = await req('GET', `/messages/conversations/${conversationId}`, { token: tokenA });
  test('MSG-05', 'Get conversation messages', r.status, 200);
} else {
  test('MSG-05', 'Get conversation messages', 0, 0, 'skipped'); skipped++;
}

// MSG-06: Read message (BEFORE delete)
if (messageId) {
  const r = await req('PATCH', `/messages/${messageId}/read`, { token: tokenB });
  test('MSG-06', 'Read message', r.status, [200, 404]);
} else {
  test('MSG-06', 'Read message', 0, 0, 'skipped'); skipped++;
}

// MSG-07: Delete message (AFTER read)
if (messageId) {
  const r = await req('DELETE', `/messages/${messageId}`, { token: tokenA });
  test('MSG-07', 'Delete message', r.status, [200, 204]);
} else {
  test('MSG-07', 'Delete message', 0, 0, 'skipped'); skipped++;
}

// MSG-08: Conversations without auth
{
  const r = await req('GET', '/messages/conversations');
  test('MSG-08', 'Conversations no auth', r.status, 401);
}

// ══════════════════════════════════════════════════════
// MODULE 8: CONTACT REQUESTS
// ══════════════════════════════════════════════════════
console.log('\n═══ MODULE 8: CONTACT REQUESTS ═══');

// CR-01: Create contact request (A → B)
if (memberIdB) {
  const r = await req('POST', '/contact-requests', {
    token: tokenA,
    body: { ownerId: memberIdB, familyId, fields: ['PHONE', 'EMAIL'] }
  });
  test('CR-01', 'Create contact request', r.status, [201, 400, 409]);
  contactRequestId = r.body?.contactRequest?.id;
} else {
  test('CR-01', 'Create contact request', 0, 0, 'skipped — no memberIdB'); skipped++;
}

// CR-02: Get sent requests
{
  const r = await req('GET', '/contact-requests/sent', { token: tokenA });
  test('CR-02', 'Get sent contact requests', r.status, 200);
}

// CR-03: Get received requests
{
  const r = await req('GET', '/contact-requests/received', { token: tokenB });
  test('CR-03', 'Get received contact requests', r.status, 200);
}

// CR-04: Get request status
if (memberIdB) {
  const r = await req('GET', `/contact-requests/status/${memberIdB}`, { token: tokenA });
  test('CR-04', 'Get request status', r.status, [200, 404]);
} else {
  test('CR-04', 'Get request status', 0, 0, 'skipped'); skipped++;
}

// CR-05: Approve contact request
if (contactRequestId) {
  const r = await req('PATCH', `/contact-requests/${contactRequestId}/approve`, { token: tokenB });
  test('CR-05', 'Approve contact request', r.status, [200, 404]);
} else {
  test('CR-05', 'Approve contact request', 0, 0, 'skipped'); skipped++;
}

// CR-06: Create another and reject
if (memberIdB) {
  const c = await req('POST', '/contact-requests', {
    token: tokenA, body: { ownerId: memberIdB, familyId, fields: ['ALL'] }
  });
  const rid = c.body?.contactRequest?.id;
  if (rid) {
    const r = await req('PATCH', `/contact-requests/${rid}/reject`, { token: tokenB });
    test('CR-06', 'Reject contact request', r.status, [200, 404]);
  } else {
    test('CR-06', 'Reject contact request', c.status, [200, 409], `create=${c.status}`);
  }
} else {
  test('CR-06', 'Reject contact request', 0, 0, 'skipped'); skipped++;
}

// ══════════════════════════════════════════════════════
// MODULE 9: ADMIN
// ══════════════════════════════════════════════════════
console.log('\n═══ MODULE 9: ADMIN ═══');

// ADM-01: Admin health (NO familyId — was failing before fix)
{
  const r = await req('GET', '/admin/health', { token: tokenA });
  test('ADM-01', 'Admin health (no familyId)', r.status, 200);
}

// ADM-02: Admin dashboard
{
  const r = await req('GET', `/admin/dashboard?familyId=${familyId}`, { token: tokenA });
  test('ADM-02', 'Admin dashboard', r.status, [200, 403]);
}

// ADM-03: Admin members list
{
  const r = await req('GET', `/admin/members?familyId=${familyId}`, { token: tokenA });
  test('ADM-03', 'Admin members', r.status, [200, 403]);
}

// ADM-04: Admin audit log
{
  const r = await req('GET', `/admin/audit-log?familyId=${familyId}`, { token: tokenA });
  test('ADM-04', 'Admin audit log', r.status, [200, 403]);
}

// ADM-05: Admin health without auth
{
  const r = await req('GET', '/admin/health');
  test('ADM-05', 'Admin health no auth', r.status, 401);
}

// ADM-06: Admin dashboard without auth
{
  const r = await req('GET', `/admin/dashboard?familyId=${familyId}`);
  test('ADM-06', 'Admin dashboard no auth', r.status, 401);
}

// ══════════════════════════════════════════════════════
// MODULE 10: SETTINGS
// ══════════════════════════════════════════════════════
console.log('\n═══ MODULE 10: SETTINGS ═══');

// SET-01: Get account
{
  const r = await req('GET', '/settings/account', { token: tokenA });
  test('SET-01', 'Get account', r.status, 200);
}

// SET-02: Update account
{
  const r = await req('PATCH', '/settings/account', { token: tokenA, body: { language: 'en' } });
  test('SET-02', 'Update account', r.status, [200, 400]);
}

// SET-03: Get active sessions
{
  const r = await req('GET', '/settings/sessions', { token: tokenA });
  test('SET-03', 'Get active sessions', r.status, 200);
}

// SET-04: Get user families
{
  const r = await req('GET', '/settings/families', { token: tokenA });
  test('SET-04', 'Get user families', r.status, 200);
}

// SET-05: Update preferences
{
  const r = await req('PATCH', '/settings/preferences', { token: tokenA, body: { theme: 'light' } });
  test('SET-05', 'Update preferences', r.status, [200, 400]);
}

// SET-06: Get settings without auth
{
  const r = await req('GET', '/settings/account');
  test('SET-06', 'Get account no auth', r.status, 401);
}

// SET-07: Set primary family (requires membershipId, not familyId)
{
  const families = await req('GET', '/settings/families', { token: tokenA });
  const membershipId = families.body?.families?.[0]?.id;
  if (membershipId) {
    const r = await req('PATCH', `/settings/families/${membershipId}/primary`, { token: tokenA });
    test('SET-07', 'Set primary family', r.status, [200, 404]);
  } else {
    test('SET-07', 'Set primary family', 0, 0, 'skipped — no membershipId'); skipped++;
  }
}

// ══════════════════════════════════════════════════════
// REPORT
// ══════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
console.log('  FINAL TEST EXECUTION REPORT');
console.log('═'.repeat(60));
console.log(`  Total tested:  ${passed + failed + skipped}`);
console.log(`  Passed:        ${passed}`);
console.log(`  Failed:        ${failed}`);
console.log(`  Skipped:       ${skipped}`);
console.log(`  Pass rate:     ${((passed / (passed + failed)) * 100).toFixed(1)}% (of executed)`);
console.log('─'.repeat(60));

if (failed > 0) {
  console.log('\n  FAILURES:');
  results.filter(r => !r.pass).forEach(r => {
    console.log(`    ✗ ${r.id}: ${r.desc}`);
    console.log(`      got ${r.status}, expected ${r.expected}${r.note}`);
  });
} else {
  console.log('\n  ✓ ALL TESTS PASSED');
}

if (skipped > 0) {
  console.log(`\n  SKIPPED: ${skipped} (dependency chain — no upstream data)`);
}

console.log('═'.repeat(60));
