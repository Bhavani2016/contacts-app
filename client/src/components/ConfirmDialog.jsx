import { useEffect, useRef } from 'react';

export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, danger = true, busy = false }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    confirmRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div className="panel-overlay">
      <button type="button" className="panel-overlay__backdrop" aria-label="Cancel" onClick={onCancel} />
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirm-dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            ref={confirmRef}
            className={danger ? 'btn btn--danger' : 'btn btn--primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
