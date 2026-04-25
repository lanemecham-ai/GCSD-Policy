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
      <hr />
      <div className="policy-content" dangerouslySetInnerHTML={{ __html: policy.content }} />
    </div>
  );
}
