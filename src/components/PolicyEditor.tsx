import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category, FormLink, Policy, PolicyForm } from '../types';
import RichTextEditor from './RichTextEditor';

type PolicyEditorProps = {
  policy?: Policy | null;
  categories: Category[];
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

export default function PolicyEditor({ policy, categories, onSave, onDelete, canDelete }: PolicyEditorProps) {
  const navigate = useNavigate();

  const existingPolicy = policy ?? null;
  const [title, setTitle] = useState(existingPolicy?.title ?? '');
  const [category, setCategory] = useState(existingPolicy?.category ?? categories[0]?.name ?? '');
  const [summary, setSummary] = useState(existingPolicy?.summary ?? '');
  const [content, setContent] = useState(existingPolicy?.content ?? '');
  const [forms, setForms] = useState<FormLink[]>(existingPolicy?.forms ?? []);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setTitle(existingPolicy?.title ?? '');
    setCategory(existingPolicy?.category ?? categories[0]?.name ?? '');
    setSummary(existingPolicy?.summary ?? '');
    setContent(existingPolicy?.content ?? '');
    setForms(existingPolicy?.forms ?? []);
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
        forms: forms.filter((f) => f.title.trim() && f.url.trim()),
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
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.code ? `${cat.code} — ${cat.name}` : cat.name}
              </option>
            ))}
            {!categories.some((c) => c.name === category) && category && (
              <option value={category}>{category}</option>
            )}
          </select>
        </div>

        <div className="field-group">
          <label className="field-label">Summary</label>
          <textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Short summary of the policy" />
        </div>

        <div className="field-group">
          <label className="field-label">Associated Forms</label>
          <div className="form-links-editor">
            {forms.map((f, i) => (
              <div key={i} className="form-link-row">
                <input
                  value={f.title}
                  onChange={(e) => setForms((prev) => prev.map((item, idx) => idx === i ? { ...item, title: e.target.value } : item))}
                  placeholder="Form title"
                  className="form-link-input"
                />
                <input
                  value={f.url}
                  onChange={(e) => setForms((prev) => prev.map((item, idx) => idx === i ? { ...item, url: e.target.value } : item))}
                  placeholder="https://..."
                  className="form-link-input"
                />
                <button
                  type="button"
                  className="secondary-button delete-button form-link-remove"
                  onClick={() => setForms((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary-button form-link-add"
              onClick={() => setForms((prev) => [...prev, { title: '', url: '' }])}
            >
              + Add Form
            </button>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Content</label>
          <RichTextEditor key={existingPolicy?.id ?? 'new'} value={content} onChange={setContent} />
        </div>
      </form>

      <button className="secondary-button" type="button" onClick={() => navigate(-1)}>
        Cancel
      </button>
    </div>
  );
}
