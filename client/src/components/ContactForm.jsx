import { useEffect, useState } from 'react';
import TagInput from './TagInput';
import { validateContactForm, hasErrors } from '../validation';

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', tags: [] };

export default function ContactForm({ initialValues, submitLabel, onSubmit, onCancel, serverError }) {
  const [values, setValues] = useState(initialValues || EMPTY);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrorsFromServer, setFieldErrorsFromServer] = useState({});

  useEffect(() => {
    setValues(initialValues || EMPTY);
    setTouched({});
    setFieldErrorsFromServer({});
  }, [initialValues]);

  useEffect(() => {
    if (serverError?.details) {
      const map = {};
      serverError.details.forEach((d) => {
        if (d.field) map[d.field] = d.message;
      });
      setFieldErrorsFromServer(map);
    } else {
      setFieldErrorsFromServer({});
    }
  }, [serverError]);

  const errors = validateContactForm(values);
  const showError = (field) => (touched[field] || submitting) && (errors[field] || fieldErrorsFromServer[field]);

  const setField = (field) => (e) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const markTouched = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, email: true, phone: true, tags: true });
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      await onSubmit({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || null,
        tags: values.tags,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      {serverError && !serverError.details && (
        <div className="form-banner form-banner--error" role="alert">
          {serverError.message}
        </div>
      )}

      <div className="form-row">
        <div className="field">
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            type="text"
            value={values.firstName}
            onChange={setField('firstName')}
            onBlur={markTouched('firstName')}
            aria-invalid={Boolean(showError('firstName'))}
            aria-describedby={showError('firstName') ? 'firstName-error' : undefined}
            maxLength={50}
          />
          {showError('firstName') && (
            <p className="field-error" id="firstName-error">{errors.firstName || fieldErrorsFromServer.firstName}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            type="text"
            value={values.lastName}
            onChange={setField('lastName')}
            onBlur={markTouched('lastName')}
            aria-invalid={Boolean(showError('lastName'))}
            aria-describedby={showError('lastName') ? 'lastName-error' : undefined}
            maxLength={50}
          />
          {showError('lastName') && (
            <p className="field-error" id="lastName-error">{errors.lastName || fieldErrorsFromServer.lastName}</p>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          inputMode="email"
          className="mono-input"
          value={values.email}
          onChange={setField('email')}
          onBlur={markTouched('email')}
          aria-invalid={Boolean(showError('email'))}
          aria-describedby={showError('email') ? 'email-error' : undefined}
        />
        {showError('email') && (
          <p className="field-error" id="email-error">{errors.email || fieldErrorsFromServer.email}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="phone">Phone <span className="field-optional">optional &middot; E.164</span></label>
        <input
          id="phone"
          type="tel"
          className="mono-input"
          placeholder="+14155552671"
          value={values.phone}
          onChange={setField('phone')}
          onBlur={markTouched('phone')}
          aria-invalid={Boolean(showError('phone'))}
          aria-describedby={showError('phone') ? 'phone-error' : undefined}
        />
        {showError('phone') && (
          <p className="field-error" id="phone-error">{errors.phone || fieldErrorsFromServer.phone}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="tags">Tags <span className="field-optional">optional</span></label>
        <TagInput
          id="tags"
          tags={values.tags}
          onChange={(tags) => setValues((prev) => ({ ...prev, tags }))}
        />
        {showError('tags') && <p className="field-error">{errors.tags}</p>}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
