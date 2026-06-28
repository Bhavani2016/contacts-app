const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

let db;

function getDb() {
  if (db) return db;
  const dir = path.dirname(config.sqlitePath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  db = new DatabaseSync(config.sqlitePath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

function migrate() {
  const conn = getDb();
  conn.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
    tags: JSON.parse(row.tags || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Maps logical sortable fields to actual columns to prevent SQL injection via sort param.
const SORT_COLUMNS = {
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

function isUniqueConstraintError(err) {
  return /UNIQUE constraint failed/.test(err.message || '');
}

const sqliteRepository = {
  init() {
    migrate();
  },

  async create(contact) {
    const conn = getDb();
    const stmt = conn.prepare(`
      INSERT INTO contacts (id, first_name, last_name, email, phone, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    try {
      stmt.run(
        contact.id,
        contact.firstName,
        contact.lastName,
        contact.email,
        contact.phone || null,
        JSON.stringify(contact.tags || []),
        contact.createdAt,
        contact.updatedAt
      );
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        const dupErr = new Error('Email already exists');
        dupErr.code = 'DUPLICATE_EMAIL';
        throw dupErr;
      }
      throw err;
    }
    return this.findById(contact.id);
  },

  async findById(id) {
    const conn = getDb();
    const row = conn.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    return rowToContact(row);
  },

  async findByEmail(email) {
    const conn = getDb();
    const row = conn.prepare('SELECT * FROM contacts WHERE email = ?').get(email);
    return rowToContact(row);
  },

  async list({ q, page, pageSize, sort, order }) {
    const conn = getDb();
    const sortCol = SORT_COLUMNS[sort] || SORT_COLUMNS.createdAt;
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    let where = '';
    const likeParam = q ? `%${q}%` : null;
    if (q) {
      where = `WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?`;
    }

    const countParams = q ? [likeParam, likeParam, likeParam] : [];
    const total = conn
      .prepare(`SELECT COUNT(*) as count FROM contacts ${where}`)
      .get(...countParams).count;

    const offset = (page - 1) * pageSize;
    const listParams = q ? [likeParam, likeParam, likeParam, pageSize, offset] : [pageSize, offset];
    const rows = conn
      .prepare(`SELECT * FROM contacts ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`)
      .all(...listParams);

    return {
      items: rows.map(rowToContact),
      total,
    };
  },

  async update(id, fields) {
    const conn = getDb();
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

    const stmt = conn.prepare(`
      UPDATE contacts
      SET first_name = ?, last_name = ?, email = ?, phone = ?, tags = ?, updated_at = ?
      WHERE id = ?
    `);
    try {
      stmt.run(
        merged.firstName,
        merged.lastName,
        merged.email,
        merged.phone || null,
        JSON.stringify(merged.tags || []),
        merged.updatedAt,
        id
      );
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        const dupErr = new Error('Email already exists');
        dupErr.code = 'DUPLICATE_EMAIL';
        throw dupErr;
      }
      throw err;
    }
    return this.findById(id);
  },

  async remove(id) {
    const conn = getDb();
    const result = conn.prepare('DELETE FROM contacts WHERE id = ?').run(id);
    return result.changes > 0;
  },

  async clearAll() {
    const conn = getDb();
    conn.prepare('DELETE FROM contacts').run();
  },
};

module.exports = sqliteRepository;
