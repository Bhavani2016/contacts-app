function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ContactDetail({ contact, onEdit, onDelete, onClose }) {
  return (
    <div className="contact-detail">
      <div className="contact-detail__name">
        {contact.firstName} {contact.lastName}
      </div>

      <dl className="contact-detail__fields">
        <div className="contact-detail__row">
          <dt>Email</dt>
          <dd className="mono">{contact.email}</dd>
        </div>
        <div className="contact-detail__row">
          <dt>Phone</dt>
          <dd className="mono">{contact.phone || '—'}</dd>
        </div>
        <div className="contact-detail__row">
          <dt>Tags</dt>
          <dd>
            {contact.tags && contact.tags.length > 0 ? (
              <span className="tag-list">
                {contact.tags.map((tag) => (
                  <span className="tag-chip tag-chip--static" key={tag}>
                    {tag}
                  </span>
                ))}
              </span>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div className="contact-detail__row">
          <dt>Created</dt>
          <dd className="mono mono--dim">{formatDate(contact.createdAt)} UTC</dd>
        </div>
        <div className="contact-detail__row">
          <dt>Updated</dt>
          <dd className="mono mono--dim">{formatDate(contact.updatedAt)} UTC</dd>
        </div>
      </dl>

      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Close
        </button>
        <button type="button" className="btn btn--danger" onClick={onDelete}>
          Delete
        </button>
        <button type="button" className="btn btn--primary" onClick={onEdit}>
          Edit
        </button>
      </div>
    </div>
  );
}
