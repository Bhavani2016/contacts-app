import { useState } from 'react';

export default function TagInput({ tags, onChange, id }) {
  const [draft, setDraft] = useState('');

  const commitDraft = () => {
    const value = draft.trim();
    if (!value) return;
    if (tags.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...tags, value]);
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tag) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className="tag-input" id={id}>
      {tags.map((tag) => (
        <span className="tag-chip" key={tag}>
          {tag}
          <button
            type="button"
            className="tag-chip__remove"
            onClick={() => removeTag(tag)}
            aria-label={`Remove tag ${tag}`}
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        className="tag-input__field"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        placeholder={tags.length === 0 ? 'Add tags, press Enter' : 'Add another'}
      />
    </div>
  );
}
