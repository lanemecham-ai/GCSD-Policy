import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AISearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    // Navigate immediately so the results page can stream the response in
    // place. The page kicks off the request itself on mount.
    navigate('/ai-search', { state: { query: trimmed } });
    setQuery('');
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
        />
        <button className="ai-search-button" type="submit" disabled={!query.trim()}>
          →
        </button>
      </div>
    </form>
  );
}
