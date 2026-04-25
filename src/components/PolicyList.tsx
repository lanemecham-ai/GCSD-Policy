import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { Policy } from '../types';
import { SECTIONS } from '../data/sections';

type Props = {
  policies: Policy[];
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

export default function PolicyList({ policies }: Props) {
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
    const knownTitles = SECTIONS.map((s) => s.title);
    const all = Array.from(grouped.keys());
    return [
      ...knownTitles.filter((t) => grouped.has(t)),
      ...all.filter((t) => !knownTitles.includes(t)).sort(),
    ];
  }, [grouped]);

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
        const section = SECTIONS.find((s) => s.title === cat);
        const label = section ? `Section ${section.code} — ${section.title}` : cat;

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
