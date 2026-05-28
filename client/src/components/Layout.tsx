import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin';
  const hideNav = location.pathname.startsWith('/admin');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="app-layout">
      {!hideNav && (
        <nav className="global-nav">
          <div className="global-nav-inner">
            <Link to="/" className="nav-brand">
              {t('nav.brand')}
            </Link>

            <div className="nav-links">
              <LanguageSwitcher />
              <Link to="/create" className="nav-link">{t('nav.write')}</Link>
              {isAuthenticated ? (
                <>
                  <Link to="/my-space" className="nav-link">{t('nav.mySpace')}</Link>
                  <Link to="/payment" className="nav-link">{t('nav.recharge')}</Link>
                  {isAdmin && (
                    <Link to="/admin" className="nav-link nav-link-admin">{t('nav.admin')}</Link>
                  )}
                  <span className="nav-user">{user?.nickname || user?.email}</span>
                  <button className="nav-logout-btn" onClick={handleLogout}>
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-link">{t('nav.login')}</Link>
                  <Link to="/register" className="nav-link">{t('nav.register')}</Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
      <div className="app-content">
        {children}
      </div>
    </div>
  );
}
