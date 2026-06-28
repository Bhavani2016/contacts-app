const express = require('express');
const { v4: uuidv4 } = require('uuid');
const repository = require('../db');
const { validateContact } = require('../utils/validation');
const { validationError, notFound, conflict, badRequest } = require('../utils/errors');
const config = require('../config');

const router = express.Router();

function normalizeContactInput(body) {
  return {
    firstName: typeof body.firstName === 'string' ? body.firstName.trim() : body.firstName,
    lastName: typeof body.lastName === 'string' ? body.lastName.trim() : body.lastName,
    email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : body.email,
    phone: typeof body.phone === 'string' && body.phone.trim() !== '' ? body.phone.trim() : null,
    tags: Array.isArray(body.tags) ? body.tags.map((t) => t.trim()) : [],
  };
}

function parsePagination(query) {
  let page = parseInt(query.page, 10);
  let pageSize = parseInt(query.pageSize, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = config.defaultPageSize;
  if (pageSize > config.maxPageSize) pageSize = config.maxPageSize;
  return { page, pageSize };
}

const SORTABLE_FIELDS = ['firstName', 'lastName', 'email', 'createdAt', 'updatedAt'];

// POST /api/contacts
router.post('/', async (req, res, next) => {
  try {
    const { valid, errors } = validateContact(req.body, { partial: false });
    if (!valid) throw validationError(errors);

    const input = normalizeContactInput(req.body);

    const existing = await repository.findByEmail(input.email);
    if (existing) {
      throw conflict('A contact with this email already exists.', [
        { field: 'email', message: 'Email must be unique.' },
      ]);
    }

    const now = new Date().toISOString();
    const contact = {
      id: uuidv4(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    const created = await repository.create(contact);
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 'DUPLICATE_EMAIL') {
      return next(conflict('A contact with this email already exists.', [
        { field: 'email', message: 'Email must be unique.' },
      ]));
    }
    next(err);
  }
});

// GET /api/contacts?q=&page=&pageSize=&sort=&order=
router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const sort = SORTABLE_FIELDS.includes(req.query.sort) ? req.query.sort : 'createdAt';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';

    const { items, total } = await repository.list({ q, page, pageSize, sort, order });

    res.status(200).json({ items, page, pageSize, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/contacts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const contact = await repository.findById(req.params.id);
    if (!contact) throw notFound('Contact not found.');
    res.status(200).json(contact);
  } catch (err) {
    next(err);
  }
});

// PUT /api/contacts/:id  (full update)
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await repository.findById(req.params.id);
    if (!existing) throw notFound('Contact not found.');

    const { valid, errors } = validateContact(req.body, { partial: false });
    if (!valid) throw validationError(errors);

    const input = normalizeContactInput(req.body);

    if (input.email !== existing.email) {
      const conflicting = await repository.findByEmail(input.email);
      if (conflicting) {
        throw conflict('A contact with this email already exists.', [
          { field: 'email', message: 'Email must be unique.' },
        ]);
      }
    }

    const updated = await repository.update(req.params.id, input);
    res.status(200).json(updated);
  } catch (err) {
    if (err.code === 'DUPLICATE_EMAIL') {
      return next(conflict('A contact with this email already exists.', [
        { field: 'email', message: 'Email must be unique.' },
      ]));
    }
    next(err);
  }
});

// PATCH /api/contacts/:id (partial update)
router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await repository.findById(req.params.id);
    if (!existing) throw notFound('Contact not found.');

    if (!req.body || Object.keys(req.body).length === 0) {
      throw badRequest('Request body must include at least one field to update.');
    }

    const { valid, errors } = validateContact(req.body, { partial: true });
    if (!valid) throw validationError(errors);

    const input = normalizeContactInput({ ...existing, ...req.body });
    // Only carry over fields the caller actually sent, normalized.
    const patch = {};
    if (req.body.firstName !== undefined) patch.firstName = input.firstName;
    if (req.body.lastName !== undefined) patch.lastName = input.lastName;
    if (req.body.email !== undefined) patch.email = input.email;
    if (req.body.phone !== undefined) patch.phone = input.phone;
    if (req.body.tags !== undefined) patch.tags = input.tags;

    if (patch.email && patch.email !== existing.email) {
      const conflicting = await repository.findByEmail(patch.email);
      if (conflicting) {
        throw conflict('A contact with this email already exists.', [
          { field: 'email', message: 'Email must be unique.' },
        ]);
      }
    }

    const updated = await repository.update(req.params.id, patch);
    res.status(200).json(updated);
  } catch (err) {
    if (err.code === 'DUPLICATE_EMAIL') {
      return next(conflict('A contact with this email already exists.', [
        { field: 'email', message: 'Email must be unique.' },
      ]));
    }
    next(err);
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await repository.findById(req.params.id);
    if (!existing) throw notFound('Contact not found.');
    await repository.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
