const { Pool } = require('pg');
const config = require('../config');

let pool;

function getPool() {
  if (pool) return pool;
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL must be set when DB_DRIVER=postgres');
  }
  pool = new Pool({
    connectionString: config.databaseUrl,
    // Most managed Postgres offerings (Azure, RDS, Cloud SQL) require SSL.
    // rejectUnauthorized:false keeps this simple for managed CA chains;
    // tighten this with a CA bundle for stricter environments.
    ssl: config.databaseUrl.includes('sslmode=disable')
      ? false
      : { rejectUnauthorized: false },
  });
  return pool;
}

async function migrate() {
  const conn = getPool();
  await conn.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id UUID PRIMARY KEY,
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(32),
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
    CREATE INDEX IF NOT EXISTS idx_contacts_last_name ON contacts(last_name);
  `);
}

function rowToContact(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    tags: row.tags || [],
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

const SORT_COLUMNS = {
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const postgresRepository = {
  async init() {
    await migrate();
  },

  async create(contact) {
    const conn = getPool();
    try {
      await conn.query(
        `INSERT INTO contacts (id, first_name, last_name, email, phone, tags, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          contact.id,
          contact.firstName,
          contact.lastName,
          contact.email,
          contact.phone || null,
          JSON.stringify(contact.tags || []),
          contact.createdAt,
          contact.updatedAt,
        ]
      );
    } catch (err) {
      if (err.code === '23505') {
        const dupErr = new Error('Email already exists');
        dupErr.code = 'DUPLICATE_EMAIL';
        throw dupErr;
      }
      throw err;
    }
    return this.findById(contact.id);
  },

  async findById(id) {
    const conn = getPool();
    const { rows } = await conn.query('SELECT * FROM contacts WHERE id = $1', [id]);
    return rowToContact(rows[0]);
  },

  async findByEmail(email) {
    const conn = getPool();
    const { rows } = await conn.query('SELECT * FROM contacts WHERE email = $1', [email]);
    return rowToContact(rows[0]);
  },

  async list({ q, page, pageSize, sort, order }) {
    const conn = getPool();
    const sortCol = SORT_COLUMNS[sort] || SORT_COLUMNS.createdAt;
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    let where = '';
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1`;
    }

    const totalResult = await conn.query(`SELECT COUNT(*)::int as count FROM contacts ${where}`, params);
    const total = totalResult.rows[0].count;

    const limitParamIdx = params.length + 1;
    const offsetParamIdx = params.length + 2;
    const offset = (page - 1) * pageSize;
    const { rows } = await conn.query(
      `SELECT * FROM contacts ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
      [...params, pageSize, offset]
    );

    return { items: rows.map(rowToContact), total };
  },

  async update(id, fields) {
    const conn = getPool();
    const existing = await this.findById(id);
    if (!existing) return null;

    const merged = {
      firstName: fields.firstName !== undefined ? fields.firstName : existing.firstName,
      lastName: fields.lastName !== undefined ? fields.lastName : existing.lastName,
      email: fields.email !== undefined ? fields.email : existing.email,
      phone: fields.phone !== undefined ? fields.phone : existing.phone,
      tags: fields.tags !== undefined ? fields.tags : existing.tags,
      updatedAt: new Date().toISOString(),
    };

    try {
      await conn.query(
        `UPDATE contacts SET first_name = $1, last_name = $2, email = $3,
           phone = $4, tags = $5, updated_at = $6 WHERE id = $7`,
        [
          merged.firstName,
          merged.lastName,
          merged.email,
          merged.phone || null,
          JSON.stringify(merged.tags || []),
          merged.updatedAt,
          id,
        ]
      );
    } catch (err) {
      if (err.code === '23505') {
        const dupErr = new Error('Email already exists');
        dupErr.code = 'DUPLICATE_EMAIL';
        throw dupErr;
      }
      throw err;
    }
    return this.findById(id);
  },

  async remove(id) {
    const conn = getPool();
    const result = await conn.query('DELETE FROM contacts WHERE id = $1', [id]);
    return result.rowCount > 0;
  },

  async clearAll() {
    const conn = getPool();
    await conn.query('DELETE FROM contacts');
  },
};

module.exports = postgresRepository;
