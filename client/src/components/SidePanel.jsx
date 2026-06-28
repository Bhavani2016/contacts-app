import { useEffect, useRef } from 'react';

export default function SidePanel({ title, onClose, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    panelRef.current?.querySelector('input, button, textarea')?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="panel-overlay">
      <button
        type="button"
        className="panel-overlay__backdrop"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside className="panel" ref={panelRef} role="dialog" aria-modal="true" aria-label={title}>
        <header className="panel__header">
          <h2>{title}</h2>
          <button type="button" className="panel__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </header>
        <div className="panel__body">{children}</div>
      </aside>
    </div>
  );
}
