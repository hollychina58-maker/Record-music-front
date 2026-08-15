import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import './NotFoundPage.css';

/** Branded 404 — catch-all route target for unknown URLs */
export function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <div className="notfound-page">
      <div className="notfound-ink-blot" aria-hidden="true" />
      <p className="notfound-code">404</p>
      <h1 className="notfound-title">{t('notfound.title')}</h1>
      <p className="notfound-hint">{t('notfound.hint')}</p>
      <Link to="/" className="notfound-back">{t('notfound.back')}</Link>
    </div>
  );
}
