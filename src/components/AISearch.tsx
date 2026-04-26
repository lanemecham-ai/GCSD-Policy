import { FormEvent, useState } from 'react';

type Props = { onSearch: (query: string) => void };

export default function AISearch({ onSearch }: Props) {
  const [query, setQuery] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    onSearch(trimmed);
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
