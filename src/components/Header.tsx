import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="topbar">
      <div className="topbar-actions">
        {user ? (
          <>
            <span className="topbar-user">{user.username} • {user.role}</span>
            <button className="secondary-button" type="button" onClick={() => { logout(); navigate('/'); }}>
              Sign out
            </button>
          </>
        ) : (
          <button className="primary-button" type="button" onClick={() => navigate('/login')}>
            Sign in
          </button>
        )}
      </div>
      <a href="https://www.garfk12.org/" className="district-link" target="_blank" rel="noreferrer">
        <img src="/flame-logo.png" alt="GCSD" className="district-logo" />
        <span>Return to Garfk12.org</span>
      </a>
    </div>
  );
}
