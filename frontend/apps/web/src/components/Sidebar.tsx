import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context.tsx';

export default function Sidebar({ title, sections, basePath, brand = false, profileCard = null, footerLinks = [] }) {
  const { logoutCurrentUser } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logoutCurrentUser();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="sidebar">
      <h2 className={brand ? 'sidebar-title sidebar-brand' : 'sidebar-title'}>{title}</h2>
      {profileCard ? (
        <div className="sidebar-profile-card">
          <div className="sidebar-avatar" />
          <div>
            <strong>{profileCard.name}</strong>
            <span>{profileCard.email}</span>
          </div>
        </div>
      ) : null}

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div className="sidebar-section" key={section.label || section.items[0].to}>
            {section.label ? <p className="sidebar-label">{section.label}</p> : null}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={`${basePath}${item.to}`}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="sidebar-link-left">
                  {item.icon ? <span className="sidebar-icon">{item.icon}</span> : null}
                  <span>{item.label}</span>
                </span>
                {item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {footerLinks.length ? (
        <div className="sidebar-footer-links">
          {footerLinks.map((link) => (
            <NavLink key={link.to} to={`${basePath}${link.to}`} className="sidebar-footer-link">
              {link.label}
            </NavLink>
          ))}
        </div>
      ) : null}

      <button className="logout-btn sidebar-logout-danger" onClick={onLogout} type="button">
        Logout
      </button>
    </aside>
  );
}

