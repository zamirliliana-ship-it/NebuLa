const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_test';
process.env.APPS_SCRIPT_URL = 'https://script.google.com/macros/s/test/exec';
process.env.APPS_SCRIPT_SECRET = 'a'.repeat(40);
process.env.OTP_PEPPER = 'b'.repeat(40);

const app = require('../dist/app').default;
const { registerSchema, refreshSessionSchema, accountTypeSchema } = require('../dist/schemas/auth.schema');
let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
});

test('health endpoint returns 200', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, status: 'ok' });
});

test('registration rejects invalid payloads', async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email', password: 'short', fullName: 'A' })
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, 'Datos inválidos.');
});

test('public registration schema rejects client-supplied roles', () => {
  const parsed = registerSchema.safeParse({
    email: 'person@example.com', password: 'a-very-long-password', fullName: 'Persona', role: 'admin'
  });
  assert.equal(parsed.success, false);
});

test('refresh schema validates refresh token shape', () => {
  assert.equal(refreshSessionSchema.safeParse({ refreshToken: 'x'.repeat(30) }).success, true);
  assert.equal(refreshSessionSchema.safeParse({ refreshToken: 'short' }).success, false);
  assert.equal(refreshSessionSchema.safeParse({ refreshToken: 'x'.repeat(30), role: 'admin' }).success, false);
});

test('protected user endpoint rejects missing bearer token', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, 'AUTH_REQUIRED');
});

test('logout endpoint rejects missing bearer token', async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, 'AUTH_REQUIRED');
});

test('account type schema accepts only public onboarding account types', () => {
  for (const accountType of ['autistic_person', 'parent_guardian', 'teacher']) {
    assert.equal(accountTypeSchema.safeParse({ accountType }).success, true);
  }
  assert.equal(accountTypeSchema.safeParse({ accountType: 'admin' }).success, false);
  assert.equal(accountTypeSchema.safeParse({ accountType: 'teacher', role: 'admin' }).success, false);
});
