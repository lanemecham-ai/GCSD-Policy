import type { Policy } from '../types';
import { Link } from 'react-router-dom';

type PolicyViewerProps = {
  policy: Policy | null;
  canEdit?: boolean;
};

export default function PolicyViewer({ policy, canEdit }: PolicyViewerProps) {
  if (!policy) {
    return (
      <div className="card">
        <h1 className="page-title">Select a policy</h1>
        <p>Choose a policy from the list or create a new entry to get started.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="toolbar">
        <div>
          <div className="badge">{policy.category}</div>
          <h1 className="page-title">{policy.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {canEdit && (
            <Link className="secondary-button" to={`/edit/${policy.id}`}>
              Edit policy
            </Link>
          )}
          <Link className="secondary-button" to={`/policies/${policy.id}/history`}>
            View history
          </Link>
        </div>
      </div>
      <p>{policy.summary}</p>

      {policy.forms?.length > 0 && (
        <div className="associated-forms">
          <h3 className="associated-forms-title">Associated Forms</h3>
          <ul className="associated-forms-list">
            {policy.forms.map((f, i) => (
              <li key={f.id ?? i}>
                <a href={f.url} target="_blank" rel="noreferrer" className="associated-form-link">
                  {f.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <hr />
      <div className="policy-content" dangerouslySetInnerHTML={{ __html: policy.content }} />
    </div>
  );
}
