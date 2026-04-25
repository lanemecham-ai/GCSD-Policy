import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTopPolicies } from '../api';
import type { Policy } from '../types';

export default function HomePage() {
  const [top, setTop] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopPolicies()
      .then(setTop)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home-page">
      <div className="home-header">
        <h1 className="page-title">Welcome to the Policy Manager</h1>
        <p className="home-subtitle">Search or browse policies in the sidebar, or jump to a frequently visited policy below.</p>
      </div>

      <section>
        <h2 className="home-section-title">Frequently Visited</h2>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : (
          <div className="top-policies-grid">
            {top.map((policy) => (
              <Link key={policy.id} to={`/policies/${policy.id}`} className="top-policy-card">
                <span className="top-policy-category">{policy.category}</span>
                <span className="top-policy-title">{policy.title}</span>
                <span className="top-policy-summary">{policy.summary}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
