// Matches the client-side validation rules exactly so server enforcement
// never surprises a user who already passed the form's own checks.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// E.164: + followed by 8 to 15 digits, first digit 1-9.
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Validates a contact payload.
 * @param {object} body - raw request body
 * @param {object} opts
 * @param {boolean} opts.partial - if true, only validates fields that are present (PATCH)
 * @returns {{ valid: boolean, errors: Array<{field: string, message: string}> }}
 */
function validateContact(body, { partial = false } = {}) {
  const errors = [];
  const has = (key) => Object.prototype.hasOwnProperty.call(body || {}, key);

  // firstName
  if (!partial || has('firstName')) {
    if (!isNonEmptyString(body.firstName)) {
      errors.push({ field: 'firstName', message: 'First name is required.' });
    } else if (body.firstName.trim().length < 2 || body.firstName.trim().length > 50) {
      errors.push({ field: 'firstName', message: 'First name must be 2-50 characters.' });
    }
  }

  // lastName
  if (!partial || has('lastName')) {
    if (!isNonEmptyString(body.lastName)) {
      errors.push({ field: 'lastName', message: 'Last name is required.' });
    } else if (body.lastName.trim().length < 2 || body.lastName.trim().length > 50) {
      errors.push({ field: 'lastName', message: 'Last name must be 2-50 characters.' });
    }
  }

  // email
  if (!partial || has('email')) {
    if (!isNonEmptyString(body.email)) {
      errors.push({ field: 'email', message: 'Email is required.' });
    } else if (!EMAIL_RE.test(body.email.trim())) {
      errors.push({ field: 'email', message: 'Email must be a valid email address.' });
    } else if (body.email.trim().length > 255) {
      errors.push({ field: 'email', message: 'Email must be at most 255 characters.' });
    }
  }

  // phone (optional)
  if (has('phone') && body.phone !== null && body.phone !== '') {
    if (typeof body.phone !== 'string' || !PHONE_RE.test(body.phone.trim())) {
      errors.push({
        field: 'phone',
        message: 'Phone must be in E.164 format, e.g. +14155552671.',
      });
    }
  }

  // tags (optional)
  if (has('tags') && body.tags !== null && body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      errors.push({ field: 'tags', message: 'Tags must be an array of strings.' });
    } else if (!body.tags.every((t) => typeof t === 'string' && t.trim().length > 0 && t.length <= 30)) {
      errors.push({ field: 'tags', message: 'Each tag must be a non-empty string of at most 30 characters.' });
    } else if (body.tags.length > 20) {
      errors.push({ field: 'tags', message: 'A contact may have at most 20 tags.' });
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateContact, EMAIL_RE, PHONE_RE };
