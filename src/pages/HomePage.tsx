import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService, Story } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useLanguage } from '../i18n/LanguageContext';
import { StoryPoster } from '../components/StoryPoster';
import { useGeo } from '../hooks/useGeo';
import './HomePage.css';

function StoryCard({ story, index, t }: { story: Story; index: number; t: (key: string) => string }) {
  const date = new Date(story.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Link
      to={`/story/${story.id}`}
      className="story-card"
      style={{ animationDelay: `${0.1 + index * 0.08}s` }}
    >
      <StoryPoster title={story.title} content={story.content} index={index} />
      <div className="card-info">
        <h2 className="card-title">{story.title}</h2>
        <p className="card-excerpt">
          {story.content.length > 80 ? story.content.slice(0, 80) + '…' : story.content}
        </p>
        <div className="card-meta">
          <time className="card-date">{date}</time>
          <div className="card-stats">
            {story.like_count !== undefined && story.like_count > 0 && (
              <span className="card-likes">{story.like_count} {t('home.card.likes')}</span>
            )}
            {story.comment_count !== undefined && story.comment_count > 0 && (
              <span className="card-comments">{story.comment_count} {t('home.card.comments')}</span>
            )}
            <span className="card-read">&rarr; {t('home.card.read')}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const geo = useGeo();

  useEffect(() => {
    apiService
      .getStories({ language: geo.language, countryCode: geo.countryCode })
      .then(setStories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [geo.language, geo.countryCode]);

  return (
    <div className="home-page">
      <div className="bg-ink">
        <div className="bg-wash wash-main" />
        <div className="bg-wash wash-side" />
        <div className="bg-line" />
      </div>

      <section className="hero">
        <div className="hero-visual">
          <svg className="hero-brush" viewBox="0 0 400 120" preserveAspectRatio="none">
            <path
              d="M20 60 Q 100 20 180 55 T 380 50"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
              opacity="0.12"
            />
          </svg>
          <span className="hero-seal">墨</span>
        </div>
        <h1 className="hero-heading">{t('home.hero.line1')}<br />{t('home.hero.line2')}</h1>
        <div className="hero-rule" />
      </section>

      <main className="feed">
        {loading ? (
          <div className="loading">
            <span className="load-text">{t('home.loading')}</span>
          </div>
        ) : stories.length === 0 ? (
          <div className="empty">
            <div className="empty-circle">墨</div>
            <p className="empty-title">{t('home.empty.title')}</p>
            <p className="empty-hint">{t('home.empty.hint')}</p>
            <Link to="/create" className="empty-link">{t('home.empty.link')}</Link>
          </div>
        ) : (
          <div className="feed-grid">
            {stories.map((story, i) => (
              <StoryCard key={story.id} story={story} index={i} t={t} />
            ))}
          </div>
        )}
      </main>

      <nav className="fab">
        <Link to={user ? '/create' : '/login'} className="fab-btn" aria-label="创建故事">
          <svg viewBox="0 0 24 24" className="fab-icon">
            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Link>
      </nav>
    </div>
  );
}
