import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { createPolicy, deletePolicy, fetchPolicy, fetchPolicies, updatePolicy } from './api';
import type { Policy, PolicyForm } from './types';
import Header from './components/Header';
import PolicyEditor from './components/PolicyEditor';
import PolicyHistory from './components/PolicyHistory';
import PolicyList from './components/PolicyList';
import PolicyViewer from './components/PolicyViewer';
import RequireAuth from './components/RequireAuth';
import AISearch from './components/AISearch';
import AISearchResults from './pages/AISearchResults';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import UserManagement from './pages/UserManagement';
import { useAuth } from './contexts/AuthContext';

function PolicyViewerRoute() {
  const { user } = useAuth();
  const { policyId } = useParams();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  useEffect(() => {
    if (!policyId) return;
    setLoading(true);
    fetchPolicy(policyId)
      .then(setPolicy)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load policy.'))
      .finally(() => setLoading(false));
  }, [policyId]);

  if (loading) {
    return <div className="card">Loading policy…</div>;
  }

  if (error) {
    return <div className="card">{error}</div>;
  }

  return <PolicyViewer policy={policy} canEdit={canEdit} />;
}

function PolicyEditorRoute({ onSave, onDelete, canDelete }: { onSave: (policy: PolicyForm) => Promise<void>; onDelete: (id: string) => Promise<void>; canDelete: boolean; }) {
  const { policyId } = useParams();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(policyId !== 'new');
  const [error, setError] = useState('');

  useEffect(() => {
    if (policyId === 'new') {
      setPolicy(null);
      setLoading(false);
      return;
    }

    if (!policyId) return;

    setLoading(true);
    fetchPolicy(policyId)
      .then(setPolicy)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load policy.'))
      .finally(() => setLoading(false));
  }, [policyId]);

  if (loading) {
    return <div className="card">Loading editor…</div>;
  }

  if (error) {
    return <div className="card">{error}</div>;
  }

  return <PolicyEditor policy={policy} onSave={onSave} onDelete={onDelete} canDelete={canDelete} />;
}

function MainApp() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canEdit = user?.role === 'admin' || user?.role === 'editor';
  const canDelete = user?.role === 'admin';

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPolicies();
      setPolicies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch policies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const handleSave = useCallback(
    async (updated: PolicyForm) => {
      const exists = policies.some((policy) => policy.id === updated.id);
      const saved = exists
        ? await updatePolicy(updated.id, updated)
        : await createPolicy(updated);

      setPolicies((current) => {
        if (exists) {
          return current.map((policy) => (policy.id === saved.id ? saved : policy));
        }
        return [saved, ...current];
      });
      navigate(`/policies/${saved.id}`);
    },
    [navigate, policies],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deletePolicy(id);
      setPolicies((current) => current.filter((policy) => policy.id !== id));
      navigate('/');
    },
    [navigate],
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-title">GCSD Policy Manager</div>
          <div className="brand-subtitle">Browse and manage policies by role</div>
        </div>
        <AISearch />
        {loading ? <div className="empty-state">Loading policies…</div> : <PolicyList policies={policies} />}
        {canEdit && (
          <button className="primary-button" type="button" onClick={() => navigate('/edit/new')}>
            + New Policy
          </button>
        )}
        {user?.role === 'admin' && (
          <button className="secondary-button" type="button" onClick={() => navigate('/admin/users')}>
            Manage Users
          </button>
        )}
        {error && <div className="form-error">{error}</div>}
      </aside>

      <main className="content">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="ai-search" element={<AISearchResults policies={policies} />} />
          <Route path="policies/:policyId" element={<PolicyViewerRoute />} />
          <Route path="policies/:policyId/history" element={<PolicyHistory />} />
          <Route path="edit/:policyId" element={<RequireAuth><PolicyEditorRoute onSave={handleSave} onDelete={handleDelete} canDelete={canDelete} /></RequireAuth>} />
          <Route path="admin/users" element={<RequireAuth><UserManagement /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<MainApp />} />
    </Routes>
  );
}
