import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiSearch } from '../api';

export default function AISearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await aiSearch(query.trim());
      navigate('/ai-search', { state: { query: query.trim(), result } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ai-search-form">
      <div className="ai-search-label">
        <span className="ai-badge">AI</span>
        <span>Policy Search</span>
      </div>
      <div className="ai-search-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a policy question…"
          disabled={loading}
        />
        <button className="ai-search-button" type="submit" disabled={loading || !query.trim()}>
          {loading ? '…' : '→'}
        </button>
      </div>
      {error && <div className="form-error">{error}</div>}
    </form>
  );
}
