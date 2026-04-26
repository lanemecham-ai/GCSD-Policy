import { useEffect, useState } from 'react';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../api';
import type { Category } from '../types';

type CatForm = { code: string; name: string; description: string };
const EMPTY: CatForm = { code: '', name: '', description: '' };

type Props = { onCategoriesChanged: () => void };

export default function CategoryManagement({ onCategoriesChanged }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CatForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setCategories(await fetchCategories());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({ code: cat.code, name: cat.name, description: cat.description });
    setFormError('');
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('Category name is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        const updated = await updateCategory(editingId, {
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
        });
        setCategories((prev) => prev.map((c) => (c.id === editingId ? { ...updated, policyCount: c.policyCount } : c)));
      } else {
        const created = await createCategory({
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
        });
        setCategories((prev) => [...prev, { ...created, policyCount: 0 }]);
      }
      onCategoriesChanged();
      cancelForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    try {
      await deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      onCategoriesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  return (
    <div className="user-mgmt">
      <div className="toolbar">
        <h1 className="page-title">Category Management</h1>
        <button className="primary-button user-mgmt-new-btn" type="button" onClick={openNew}>
          + New Category
        </button>
      </div>

      {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

      {showForm && (
        <div className="card user-mgmt-form-card">
          <h2 className="user-mgmt-form-title">{editingId ? 'Edit Category' : 'New Category'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0 16px' }}>
            <div className="field-group">
              <label className="field-label">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. B"
              />
            </div>
            <div className="field-group">
              <label className="field-label">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Category name"
              />
            </div>
          </div>
          <div className="field-group">
            <label className="field-label">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description (optional)"
            />
          </div>
          {formError && <div className="form-error">{formError}</div>}
          <div className="user-mgmt-form-actions">
            <button className="secondary-button" type="button" onClick={cancelForm} disabled={saving}>Cancel</button>
            <button className="primary-button user-mgmt-save-btn" type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading categories…</div>
        ) : categories.length === 0 ? (
          <div className="empty-state">No categories found.</div>
        ) : (
          <table className="user-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Description</th>
                <th>Policies</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="user-row">
                  <td><span className="role-badge role-badge--viewer">{cat.code || '—'}</span></td>
                  <td className="user-cell-name">{cat.name}</td>
                  <td style={{ color: '#6b7280', fontSize: 13 }}>{cat.description || '—'}</td>
                  <td style={{ color: '#6b7280', fontSize: 13 }}>{cat.policyCount ?? 0}</td>
                  <td className="user-cell-actions">
                    <button className="secondary-button user-action-btn" type="button" onClick={() => openEdit(cat)}>Edit</button>
                    <button
                      className="secondary-button delete-button user-action-btn"
                      type="button"
                      onClick={() => handleDelete(cat)}
                      disabled={(cat.policyCount ?? 0) > 0}
                      title={(cat.policyCount ?? 0) > 0 ? `${cat.policyCount} policies use this category` : ''}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
