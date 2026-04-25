import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Policy, PolicyForm } from '../types';
import { SECTIONS } from '../data/sections';

const CATEGORIES = SECTIONS.map((s) => s.title);

type PolicyEditorProps = {
  policy?: Policy | null;
  onSave: (policy: PolicyForm) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  canDelete?: boolean;
};

function createId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function PolicyEditor({ policy, onSave, onDelete, canDelete }: PolicyEditorProps) {
  const navigate = useNavigate();

  const existingPolicy = policy ?? null;
  const [title, setTitle] = useState(existingPolicy?.title ?? '');
  const [category, setCategory] = useState(existingPolicy?.category ?? SECTIONS[0].title);
  const [summary, setSummary] = useState(existingPolicy?.summary ?? '');
  const [content, setContent] = useState(existingPolicy?.content ?? '');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setTitle(existingPolicy?.title ?? '');
    setCategory(existingPolicy?.category ?? SECTIONS[0].title);
    setSummary(existingPolicy?.summary ?? '');
    setContent(existingPolicy?.content ?? '');
    setConfirmingDelete(false);
    setActionError('');
  }, [existingPolicy]);

  const isNew = !existingPolicy;
  const id = isNew ? createId(title || 'new-policy') : existingPolicy.id;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError('');
    setSaving(true);
    try {
      await onSave({
        id,
        title: title.trim() || 'Untitled Policy',
        category: category.trim() || 'General',
        summary: summary.trim() || 'No summary provided.',
        content: content.trim() || 'No content yet.',
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save policy.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setActionError('');
    try {
      await onDelete(existingPolicy!.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete policy.');
      setConfirmingDelete(false);
    }
  };

  return (
    <div className="card">
      <div className="toolbar">
        <div>
          <h1 className="page-title">{isNew ? 'Create policy' : 'Edit policy'}</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isNew && canDelete && (
            confirmingDelete ? (
              <>
                <span style={{ fontSize: '14px', color: '#374151' }}>Delete this policy?</span>
                <button className="secondary-button delete-button" type="button" onClick={handleDelete}>
                  Confirm
                </button>
                <button className="secondary-button" type="button" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="secondary-button delete-button" type="button" onClick={() => setConfirmingDelete(true)}>
                Delete
              </button>
            )
          )}
          <button className="primary-button" type="submit" form="policy-form" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {actionError && <div className="form-error">{actionError}</div>}

      <form id="policy-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label">Policy title</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter a policy title" />
        </div>

        <div className="field-group">
          <label className="field-label">Category</label>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORIES.map((cat, i) => (
              <option key={cat} value={cat}>
                {`Section ${SECTIONS[i].code} — ${cat}`}
              </option>
            ))}
            {!CATEGORIES.includes(category) && (
              <option value={category}>{category}</option>
            )}
          </select>
        </div>

        <div className="field-group">
          <label className="field-label">Summary</label>
          <textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Short summary of the policy" />
        </div>

        <div className="field-group">
          <label className="field-label">Content</label>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Full policy text" />
        </div>
      </form>

      <button className="secondary-button" type="button" onClick={() => navigate(-1)}>
        Cancel
      </button>
    </div>
  );
}
