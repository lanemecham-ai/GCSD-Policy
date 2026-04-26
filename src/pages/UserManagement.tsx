import { useEffect, useState } from 'react';
import { fetchUsers, createUser, updateUser, deleteUser } from '../api';
import type { User, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';

type UserForm = {
  username: string;
  role: Role;
  password: string;
};

const EMPTY_FORM: UserForm = { username: '', role: 'viewer', password: '' };

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setUsers(await fetchUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(user: User) {
    setEditingId(user.id);
    setForm({ username: user.username, role: user.role, password: '' });
    setFormError('');
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  async function handleSave() {
    if (!form.username.trim()) {
      setFormError('Username is required.');
      return;
    }
    if (!editingId && !form.password) {
      setFormError('Password is required for new users.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        const updated = await updateUser(editingId, {
          username: form.username.trim(),
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        });
        setUsers((prev) => prev.map((u) => (u.id === editingId ? updated : u)));
      } else {
        const created = await createUser({
          username: form.username.trim(),
          password: form.password,
          role: form.role,
        });
        setUsers((prev) => [...prev, created].sort((a, b) => a.username.localeCompare(b.username)));
      }
      cancelForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(target: User) {
    if (!confirm(`Delete user "${target.username}"? This cannot be undone.`)) return;
    try {
      await deleteUser(target.id);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  return (
    <div className="user-mgmt">
      <div className="toolbar">
        <h1 className="page-title">User Management</h1>
        <button className="primary-button user-mgmt-new-btn" type="button" onClick={openNew}>
          + New User
        </button>
      </div>

      {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

      {showForm && (
        <div className="card user-mgmt-form-card">
          <h2 className="user-mgmt-form-title">{editingId ? 'Edit User' : 'New User'}</h2>
          <div className="field-group">
            <label className="field-label">Username</label>
            <input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="Username"
            />
          </div>
          <div className="field-group">
            <label className="field-label">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">
              {editingId ? 'New Password (leave blank to keep current)' : 'Password'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={editingId ? 'Leave blank to keep current password' : 'Password'}
            />
          </div>
          {formError && <div className="form-error">{formError}</div>}
          <div className="user-mgmt-form-actions">
            <button className="secondary-button" type="button" onClick={cancelForm} disabled={saving}>
              Cancel
            </button>
            <button className="primary-button user-mgmt-save-btn" type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="empty-state">No users found.</div>
        ) : (
          <table className="user-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.id === currentUser?.id ? 'user-row user-row--self' : 'user-row'}>
                  <td className="user-cell-name">{u.username}{u.id === currentUser?.id && <span className="user-self-badge">you</span>}</td>
                  <td><span className={`role-badge role-badge--${u.role}`}>{u.role}</span></td>
                  <td className="user-cell-actions">
                    <button className="secondary-button user-action-btn" type="button" onClick={() => openEdit(u)}>
                      Edit
                    </button>
                    <button
                      className="secondary-button delete-button user-action-btn"
                      type="button"
                      onClick={() => handleDelete(u)}
                      disabled={u.id === currentUser?.id}
                      title={u.id === currentUser?.id ? 'You cannot delete your own account' : ''}
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
