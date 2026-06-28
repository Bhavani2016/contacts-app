const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.DB_DRIVER = 'sqlite';
process.env.SQLITE_PATH = path.join(__dirname, 'test-data', 'test.db');

// Ensure a clean DB file for each test run
const dbDir = path.dirname(process.env.SQLITE_PATH);
if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });

const createApp = require('../src/app');
const repository = require('../src/db');

let server;
let baseUrl;

test.before(async () => {
  await repository.init();
  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  baseUrl = `http://localhost:${port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(dbDir, { recursive: true, force: true });
});

test.beforeEach(async () => {
  await repository.clearAll();
});

async function request(method, urlPath, body) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { status: res.status, body: json };
}

test('POST /api/contacts creates a contact and returns 201', async () => {
  const { status, body } = await request('POST', '/api/contacts', {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    phone: '+14155551234',
    tags: ['friend'],
  });
  assert.equal(status, 201);
  assert.equal(body.firstName, 'Jane');
  assert.equal(body.email, 'jane.doe@example.com');
  assert.ok(body.id);
  assert.ok(body.createdAt);
  assert.ok(body.updatedAt);
});

test('POST /api/contacts rejects invalid payload with 422', async () => {
  const { status, body } = await request('POST', '/api/contacts', {
    firstName: 'J',
    lastName: '',
    email: 'not-an-email',
  });
  assert.equal(status, 422);
  assert.equal(body.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(body.details));
  assert.ok(body.details.some((d) => d.field === 'firstName'));
  assert.ok(body.details.some((d) => d.field === 'lastName'));
  assert.ok(body.details.some((d) => d.field === 'email'));
});

test('POST /api/contacts rejects duplicate email with 409', async () => {
  await request('POST', '/api/contacts', {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'dup@example.com',
  });
  const { status, body } = await request('POST', '/api/contacts', {
    firstName: 'John',
    lastName: 'Doe',
    email: 'dup@example.com',
  });
  assert.equal(status, 409);
  assert.equal(body.code, 'CONFLICT');
});

test('GET /api/contacts/:id returns 404 for missing contact', async () => {
  const { status, body } = await request('GET', '/api/contacts/00000000-0000-0000-0000-000000000000');
  assert.equal(status, 404);
  assert.equal(body.code, 'NOT_FOUND');
});

test('GET /api/contacts supports pagination shape', async () => {
  for (let i = 0; i < 15; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await request('POST', '/api/contacts', {
      firstName: 'Test',
      lastName: `User${i}`,
      email: `user${i}@example.com`,
    });
  }
  const { status, body } = await request('GET', '/api/contacts?page=2&pageSize=10');
  assert.equal(status, 200);
  assert.equal(body.page, 2);
  assert.equal(body.pageSize, 10);
  assert.equal(body.total, 15);
  assert.equal(body.items.length, 5);
});

test('GET /api/contacts supports search by name/email', async () => {
  await request('POST', '/api/contacts', { firstName: 'Alice', lastName: 'Wonder', email: 'alice@example.com' });
  await request('POST', '/api/contacts', { firstName: 'Bob', lastName: 'Builder', email: 'bob@example.com' });

  const { body } = await request('GET', '/api/contacts?q=alice');
  assert.equal(body.total, 1);
  assert.equal(body.items[0].firstName, 'Alice');
});

test('PUT /api/contacts/:id fully updates a contact', async () => {
  const created = await request('POST', '/api/contacts', {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
  });
  const { status, body } = await request('PUT', `/api/contacts/${created.body.id}`, {
    firstName: 'Janet',
    lastName: 'Doe',
    email: 'janet@example.com',
    phone: '+14155559999',
    tags: ['updated'],
  });
  assert.equal(status, 200);
  assert.equal(body.firstName, 'Janet');
  assert.equal(body.email, 'janet@example.com');
  assert.deepEqual(body.tags, ['updated']);
});

test('PATCH /api/contacts/:id partially updates a contact', async () => {
  const created = await request('POST', '/api/contacts', {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane2@example.com',
  });
  const { status, body } = await request('PATCH', `/api/contacts/${created.body.id}`, {
    phone: '+14155550000',
  });
  assert.equal(status, 200);
  assert.equal(body.firstName, 'Jane');
  assert.equal(body.phone, '+14155550000');
});

test('DELETE /api/contacts/:id removes a contact and returns 204', async () => {
  const created = await request('POST', '/api/contacts', {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane3@example.com',
  });
  const del = await request('DELETE', `/api/contacts/${created.body.id}`);
  assert.equal(del.status, 204);

  const get = await request('GET', `/api/contacts/${created.body.id}`);
  assert.equal(get.status, 404);
});

test('PUT /api/contacts/:id on missing contact returns 404', async () => {
  const { status } = await request('PUT', '/api/contacts/00000000-0000-0000-0000-000000000000', {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'ghost@example.com',
  });
  assert.equal(status, 404);
});

test('phone validation rejects non-E.164 numbers', async () => {
  const { status, body } = await request('POST', '/api/contacts', {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'phonecheck@example.com',
    phone: '555-1234',
  });
  assert.equal(status, 422);
  assert.ok(body.details.some((d) => d.field === 'phone'));
});
