import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { createPolicy, deletePolicy, fetchCategories, fetchPolicy, fetchPolicies, updatePolicy } from './api';
import type { Category, Policy, PolicyForm } from './types';
import Header from './components/Header';
import PolicyEditor from './components/PolicyEditor';
import PolicyHistory from './components/PolicyHistory';
import PolicyList from './components/PolicyList';
import PolicyViewer from './components/PolicyViewer';
import RequireAuth from './components/RequireAuth';
import AISearch from './components/AISearch';
import AISearchResults from './pages/AISearchResults';
import CategoryManagement from './pages/CategoryManagement';
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

  if (loading) return <div className="card">Loading policy…</div>;
  if (error) return <div className="card">{error}</div>;
  return <PolicyViewer policy={policy} canEdit={canEdit} />;
}

function PolicyEditorRoute({
  categories,
  onSave,
  onDelete,
  canDelete,
}: {
  categories: Category[];
  onSave: (policy: PolicyForm) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  canDelete: boolean;
}) {
  const { policyId } = useParams();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(policyId !== 'new');
  const [error, setError] = useState('');

  useEffect(() => {
    if (policyId === 'new') { setPolicy(null); setLoading(false); return; }
    if (!policyId) return;
    setLoading(true);
    fetchPolicy(policyId)
      .then(setPolicy)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load policy.'))
      .finally(() => setLoading(false));
  }, [policyId]);

  if (loading) return <div className="card">Loading editor…</div>;
  if (error) return <div className="card">{error}</div>;
  return <PolicyEditor policy={policy} categories={categories} onSave={onSave} onDelete={onDelete} canDelete={canDelete} />;
}

function MainApp() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiQuery, setAiQuery] = useState<string | null>(null);
  const [aiSearchKey, setAiSearchKey] = useState(0);

  const canEdit = user?.role === 'admin' || user?.role === 'editor';
  const canDelete = user?.role === 'admin';

  function handleSearch(query: string) {
    setAiQuery(query);
    setAiSearchKey((k) => k + 1);
  }

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, cats] = await Promise.all([fetchPolicies(), fetchCategories()]);
      setPolicies(data);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch policies.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadCategories = useCallback(async () => {
    try {
      const [cats, data] = await Promise.all([fetchCategories(), fetchPolicies()]);
      setCategories(cats);
      setPolicies(data);
    } catch (_) {}
  }, []);

  useEffect(() => { loadPolicies(); }, [loadPolicies]);

  const handleSave = useCallback(
    async (updated: PolicyForm) => {
      const exists = policies.some((policy) => policy.id === updated.id);
      const saved = exists ? await updatePolicy(updated.id, updated) : await createPolicy(updated);
      setPolicies((current) => {
        if (exists) return current.map((policy) => (policy.id === saved.id ? saved : policy));
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
          <button
            className="brand-title brand-home-btn"
            type="button"
            onClick={() => { setAiQuery(null); navigate('/'); }}
          >
            GCSD Policy Manager
          </button>
          <div className="brand-subtitle">Browse and manage policies by role</div>
        </div>
        <AISearch onSearch={handleSearch} />
        {loading
          ? <div className="empty-state">Loading policies…</div>
          : <PolicyList policies={policies} categories={categories} />}
        {canEdit && (
          <button className="primary-button" type="button" onClick={() => navigate('/edit/new')}>
            + New Policy
          </button>
        )}
        {user?.role === 'admin' && (
          <>
            <button className="secondary-button" type="button" onClick={() => navigate('/admin/categories')}>
              Manage Categories
            </button>
            <button className="secondary-button" type="button" onClick={() => navigate('/admin/users')}>
              Manage Users
            </button>
          </>
        )}
        {error && <div className="form-error">{error}</div>}
      </aside>

      <main className="content">
        <Header />
        {aiQuery && (
          <AISearchResults
            key={aiSearchKey}
            query={aiQuery}
            policies={policies}
            onClear={() => { setAiQuery(null); navigate('/'); }}
          />
        )}
        <Routes>
          <Route path="/" element={aiQuery ? null : <HomePage />} />
          <Route path="policies/:policyId" element={<PolicyViewerRoute />} />
          <Route path="policies/:policyId/history" element={<PolicyHistory />} />
          <Route path="edit/:policyId" element={<RequireAuth><PolicyEditorRoute categories={categories} onSave={handleSave} onDelete={handleDelete} canDelete={canDelete} /></RequireAuth>} />
          <Route path="admin/categories" element={<RequireAuth><CategoryManagement onCategoriesChanged={reloadCategories} /></RequireAuth>} />
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
