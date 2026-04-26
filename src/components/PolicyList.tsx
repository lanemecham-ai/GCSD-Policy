import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { Category, Policy } from '../types';

type Props = {
  policies: Policy[];
  categories: Category[];
};

function PolicyItem({ policy }: { policy: Policy }) {
  return (
    <div className="list-item">
      <NavLink
        className={({ isActive }) => (isActive ? 'list-link list-link--active' : 'list-link')}
        to={`/policies/${policy.id}`}
      >
        <div className="list-title">{policy.title}</div>
        <div className="list-meta">{policy.summary}</div>
      </NavLink>
    </div>
  );
}

export default function PolicyList({ policies, categories }: Props) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set());

  const grouped = useMemo(() => {
    const map = new Map<string, Policy[]>();
    for (const policy of policies) {
      const cat = policy.category || 'Uncategorized';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(policy);
    }
    return map;
  }, [policies]);

  const sortedCategories = useMemo(() => {
    const knownNames = categories.map((c) => c.name);
    const ungrouped = Array.from(grouped.keys()).filter((n) => !knownNames.includes(n)).sort();
    return [...knownNames, ...ungrouped];
  }, [grouped, categories]);

  function toggle(cat: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  if (!policies.length) {
    return <div className="empty-state">No policies found.</div>;
  }

  return (
    <div className="policy-sections">
      {sortedCategories.map((cat) => {
        const sectionPolicies = grouped.get(cat) ?? [];
        const isOpen = openSections.has(cat);
        const catDef = categories.find((c) => c.name === cat);
        const label = catDef?.code ? `${catDef.code} — ${cat}` : cat;

        return (
          <div key={cat} className="section-group">
            <button
              type="button"
              className="section-header"
              onClick={() => toggle(cat)}
              aria-expanded={isOpen}
            >
              <span className="section-chevron">{isOpen ? '▾' : '▸'}</span>
              <span className="section-label">{label}</span>
              <span className="section-count">{sectionPolicies.length}</span>
            </button>
            {isOpen && (
              <div className="section-items">
                {sectionPolicies.map((policy) => (
                  <PolicyItem key={policy.id} policy={policy} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
