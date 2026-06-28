const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

export function validateContactForm(values) {
  const errors = {};

  const firstName = (values.firstName || '').trim();
  if (!firstName) {
    errors.firstName = 'First name is required.';
  } else if (firstName.length < 2 || firstName.length > 50) {
    errors.firstName = 'First name must be 2-50 characters.';
  }

  const lastName = (values.lastName || '').trim();
  if (!lastName) {
    errors.lastName = 'Last name is required.';
  } else if (lastName.length < 2 || lastName.length > 50) {
    errors.lastName = 'Last name must be 2-50 characters.';
  }

  const email = (values.email || '').trim();
  if (!email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  const phone = (values.phone || '').trim();
  if (phone && !PHONE_RE.test(phone)) {
    errors.phone = 'Use E.164 format, e.g. +14155552671.';
  }

  if (Array.isArray(values.tags)) {
    if (values.tags.length > 20) {
      errors.tags = 'A contact may have at most 20 tags.';
    } else if (values.tags.some((t) => t.length > 30)) {
      errors.tags = 'Each tag must be at most 30 characters.';
    }
  }

  return errors;
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;
