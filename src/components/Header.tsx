import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="topbar">
      <div className="topbar-actions">
        {user && (
          <>
            <span className="topbar-user">{user.username} • {user.role}</span>
            <button className="secondary-button" type="button" onClick={() => { logout(); navigate('/login'); }}>
              Sign out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
