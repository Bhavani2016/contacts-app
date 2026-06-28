function initials(firstName, lastName) {
  return `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase();
}

function SortHeader({ label, field, sort, order, onSort }) {
  const active = sort === field;
  return (
    <th>
      <button
        type="button"
        className={`sort-header ${active ? 'sort-header--active' : ''}`}
        onClick={() => onSort(field)}
      >
        {label}
        <span className="sort-header__arrow" aria-hidden="true">
          {active ? (order === 'asc' ? '↑' : '↓') : ''}
        </span>
      </button>
    </th>
  );
}

export default function ContactsTable({ contacts, sort, order, onSort, onRowClick, loading }) {
  if (loading) {
    return (
      <div className="table-state">
        <p>Loading contacts…</p>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="table-state table-state--empty">
        <p className="table-state__title">No contacts found</p>
        <p className="table-state__hint">Try a different search, or add a new contact to get started.</p>
      </div>
    );
  }

  return (
    <table className="contacts-table">
      <thead>
        <tr>
          <th className="contacts-table__avatar-col" aria-hidden="true" />
          <SortHeader label="First name" field="firstName" sort={sort} order={order} onSort={onSort} />
          <SortHeader label="Last name" field="lastName" sort={sort} order={order} onSort={onSort} />
          <SortHeader label="Email" field="email" sort={sort} order={order} onSort={onSort} />
          <th>Phone</th>
          <th>Tags</th>
        </tr>
      </thead>
      <tbody>
        {contacts.map((contact) => (
          <tr
            key={contact.id}
            tabIndex={0}
            onClick={() => onRowClick(contact)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRowClick(contact);
            }}
            className="contacts-table__row"
          >
            <td>
              <span className="avatar" aria-hidden="true">
                {initials(contact.firstName, contact.lastName)}
              </span>
            </td>
            <td>{contact.firstName}</td>
            <td>{contact.lastName}</td>
            <td className="mono">{contact.email}</td>
            <td className="mono mono--dim">{contact.phone || '—'}</td>
            <td>
              {contact.tags && contact.tags.length > 0 ? (
                <span className="tag-list">
                  {contact.tags.slice(0, 3).map((tag) => (
                    <span className="tag-chip tag-chip--static" key={tag}>
                      {tag}
                    </span>
                  ))}
                  {contact.tags.length > 3 && (
                    <span className="tag-chip tag-chip--static tag-chip--more">
                      +{contact.tags.length - 3}
                    </span>
                  )}
                </span>
              ) : (
                <span className="mono--dim">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
