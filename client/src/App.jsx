import { useCallback, useEffect, useMemo, useState } from 'react';
import { contactsApi, ApiClientError } from './api/contacts';
import { useToasts } from './hooks/useToasts';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import ContactsTable from './components/ContactsTable';
import Pagination from './components/Pagination';
import SidePanel from './components/SidePanel';
import ContactForm from './components/ContactForm';
import ContactDetail from './components/ContactDetail';
import ConfirmDialog from './components/ConfirmDialog';
import ToastStack from './components/ToastStack';

const PAGE_SIZE = 10;

export default function App() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('desc');

  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // panel state: null | { mode: 'create' } | { mode: 'view'|'edit', contact }
  const [panel, setPanel] = useState(null);
  const [formServerError, setFormServerError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  // Reset to page 1 whenever the search term changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await contactsApi.list({
        q: debouncedSearch,
        page,
        pageSize: PAGE_SIZE,
        sort,
        order,
      });
      setData(result);
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : 'Could not load contacts. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, sort, order]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleSort = (field) => {
    if (sort === field) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setOrder('asc');
    }
  };

  const openCreate = () => {
    setFormServerError(null);
    setPanel({ mode: 'create' });
  };

  const openView = (contact) => {
    setFormServerError(null);
    setPanel({ mode: 'view', contact });
  };

  const openEdit = (contact) => {
    setFormServerError(null);
    setPanel({ mode: 'edit', contact });
  };

  const closePanel = () => {
    setPanel(null);
    setFormServerError(null);
  };

  const handleCreate = async (values) => {
    setFormServerError(null);
    try {
      await contactsApi.create(values);
      pushToast(`${values.firstName} ${values.lastName} was added.`, 'success');
      closePanel();
      loadContacts();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormServerError(err);
      } else {
        pushToast('Something went wrong creating this contact.', 'error');
      }
    }
  };

  const handleUpdate = async (id, values) => {
    setFormServerError(null);
    try {
      const updated = await contactsApi.update(id, values);
      pushToast(`${updated.firstName} ${updated.lastName} was updated.`, 'success');
      closePanel();
      loadContacts();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormServerError(err);
      } else {
        pushToast('Something went wrong updating this contact.', 'error');
      }
    }
  };

  const confirmDelete = (contact) => setPendingDelete(contact);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await contactsApi.remove(pendingDelete.id);
      pushToast(`${pendingDelete.firstName} ${pendingDelete.lastName} was deleted.`, 'success');
      setPendingDelete(null);
      closePanel();
      // If we just deleted the last item on a page beyond page 1, step back a page.
      const remainingOnPage = data.items.length - 1;
      if (remainingOnPage === 0 && page > 1) {
        setPage((p) => p - 1);
      } else {
        loadContacts();
      }
    } catch (err) {
      pushToast(
        err instanceof ApiClientError ? err.message : 'Could not delete this contact.',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  const panelTitle = useMemo(() => {
    if (!panel) return '';
    if (panel.mode === 'create') return 'New contact';
    if (panel.mode === 'edit') return 'Edit contact';
    return 'Contact details';
  }, [panel]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__mark" aria-hidden="true">@</span>
          <h1>Contacts</h1>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          New contact
        </button>
      </header>

      <main className="app-main">
        <div className="toolbar">
          <div className="search-field">
            <svg className="search-field__icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="7" cy="7" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search by name or email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search contacts by name or email"
            />
          </div>
        </div>

        {loadError ? (
          <div className="table-state table-state--error">
            <p className="table-state__title">Couldn&rsquo;t load contacts</p>
            <p className="table-state__hint">{loadError}</p>
            <button type="button" className="btn btn--ghost" onClick={loadContacts}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <ContactsTable
                contacts={data.items}
                sort={sort}
                order={order}
                onSort={handleSort}
                onRowClick={openView}
                loading={loading}
              />
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </>
        )}
      </main>

      {panel && (
        <SidePanel title={panelTitle} onClose={closePanel}>
          {panel.mode === 'create' && (
            <ContactForm
              submitLabel="Add contact"
              onSubmit={handleCreate}
              onCancel={closePanel}
              serverError={formServerError}
            />
          )}
          {panel.mode === 'edit' && (
            <ContactForm
              initialValues={panel.contact}
              submitLabel="Save changes"
              onSubmit={(values) => handleUpdate(panel.contact.id, values)}
              onCancel={closePanel}
              serverError={formServerError}
            />
          )}
          {panel.mode === 'view' && (
            <ContactDetail
              contact={panel.contact}
              onEdit={() => openEdit(panel.contact)}
              onDelete={() => confirmDelete(panel.contact)}
              onClose={closePanel}
            />
          )}
        </SidePanel>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this contact?"
          message={`This permanently removes ${pendingDelete.firstName} ${pendingDelete.lastName} (${pendingDelete.email}). This can't be undone.`}
          confirmLabel="Delete contact"
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
          busy={deleting}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
