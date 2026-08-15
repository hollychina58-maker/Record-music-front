import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLanguage } from '../i18n/LanguageContext';
import './LoginPage.css';

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!email || !password) {
      setFormError(t('auth.error.fillEmailPassword'));
      return;
    }

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setFormError(err.message || t('auth.error.loginFailed'));
    }
  };

  return (
    <div className="login-page">
      <div className="ink-wash-bg">
        <div className="ink-blob blob-1"></div>
        <div className="ink-blob blob-2"></div>
        <div className="ink-blob blob-3"></div>
      </div>

      <div className="login-container">
        <header className="login-header">
          <h1 className="login-title">{t('nav.brand')}</h1>
          <p className="login-subtitle">{t('auth.loginSubtitle')}</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">{t('auth.email')}</label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">{t('auth.password')}</label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete="current-password"
            />
          </div>

          {(formError || error) && (
            <div className="error-message">{formError || error}</div>
          )}

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? t('auth.loggingIn') : t('auth.loginBtn')}
          </button>
        </form>

        <footer className="login-footer">
          <p>
            {t('auth.noAccount')}
            <Link to="/register" className="link">{t('auth.registerBtn')}</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}