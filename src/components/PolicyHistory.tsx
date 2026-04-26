import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchPolicyVersions } from '../api';
import type { PolicyVersion } from '../types';

export default function PolicyHistory() {
  const { policyId } = useParams();
  const navigate = useNavigate();
  const [versions, setVersions] = useState<PolicyVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!policyId) return;
    setLoading(true);
    fetchPolicyVersions(policyId)
      .then(setVersions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load versions.'))
      .finally(() => setLoading(false));
  }, [policyId]);

  if (loading) {
    return <div className="card">Loading policy version history…</div>;
  }

  if (error) {
    return <div className="card">{error}</div>;
  }

  return (
    <div className="card">
      <div className="toolbar">
        <h2 className="page-title">Version history</h2>
        <button className="secondary-button" type="button" onClick={() => navigate(`/policies/${policyId}`)}>
          Back to Policy
        </button>
      </div>
      {versions.length === 0 ? (
        <p>No versions found for this policy.</p>
      ) : (
        <div className="version-list">
          {versions.map((version) => (
            <div key={version.versionNumber} className="version-card">
              <div className="version-header">
                <strong>Version {version.versionNumber}</strong>
                <span>{new Date(version.createdAt).toLocaleString()}</span>
              </div>
              <div className="version-meta">
                <span>{version.author}</span>
                <span>{version.category}</span>
              </div>
              <p>{version.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
