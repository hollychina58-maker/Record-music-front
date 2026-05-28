import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLanguage } from '../i18n/LanguageContext';
import './RegisterPage.css';

export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!email || !password || !confirmPassword) {
      setFormError(t('auth.error.fillAll'));
      return;
    }

    if (password !== confirmPassword) {
      setFormError(t('auth.error.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      setFormError(t('auth.error.passwordTooShort'));
      return;
    }

    try {
      await register(email, password, nickname || undefined);
      navigate('/');
    } catch (err: any) {
      setFormError(err.message || t('auth.error.registerFailed'));
    }
  };

  return (
    <div className="register-page">
      <div className="ink-wash-bg">
        <div className="ink-blob blob-1"></div>
        <div className="ink-blob blob-2"></div>
        <div className="ink-blob blob-3"></div>
      </div>

      <div className="register-container">
        <header className="register-header">
          <h1 className="register-title">{t('nav.brand')}</h1>
          <p className="register-subtitle">{t('auth.registerSubtitle')}</p>
        </header>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">{t('auth.email')} <span className="required">*</span></label>
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
            <label className="form-label" htmlFor="nickname">{t('auth.nickname')}</label>
            <input
              type="text"
              id="nickname"
              className="form-input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('auth.nicknamePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">{t('auth.password')} <span className="required">*</span></label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordHint')}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">{t('auth.confirmPassword')} <span className="required">*</span></label>
            <input
              type="password"
              id="confirmPassword"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              autoComplete="new-password"
            />
          </div>

          {(formError || error) && (
            <div className="error-message">{formError || error}</div>
          )}

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? t('auth.registering') : t('auth.registerBtn')}
          </button>
        </form>

        <footer className="register-footer">
          <p>
            {t('auth.hasAccount')}
            <Link to="/login" className="link">{t('auth.loginBtn')}</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
