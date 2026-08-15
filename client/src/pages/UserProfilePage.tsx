import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useFormatDate } from '../i18n/dateFormat';
import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/api';
import './UserProfilePage.css';

interface AuthorInfo {
  id: number;
  nickname: string;
  avatar: string | null;
  bio: string | null;
  story_count: number;
  created_at: string;
}

interface Story {
  id: number;
  title: string;
  content: string;
  cover_image: string | null;
  created_at: string;
  like_count?: number;
  comment_count?: number;
  tags: string[] | null;
}

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const formatDate = useFormatDate();
  const currentUser = useAuthStore(s => s.user);
  const [author, setAuthor] = useState<AuthorInfo | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const isOwn = currentUser?.id === parseInt(id || '0');

  useEffect(() => {
    if (!id) return;
    const uid = parseInt(id, 10);
    setLoading(true);
    Promise.all([
      apiService.clientGet<{ data: AuthorInfo }>('/users/' + uid + '/profile'),
      apiService.clientGet<{ data: Story[] }>('/users/' + uid + '/stories?limit=50'),
      currentUser ? apiService.clientGet<{ following: boolean }>('/users/' + uid + '/is-following').catch(() => ({ following: false })) : Promise.resolve({ following: false }),
    ])
      .then(([profileRes, storiesRes, followRes]) => {
        setAuthor(profileRes.data);
        setStories(storiesRes.data);
        setFollowing(followRes.following ?? false);
      })
      .catch((err) => { console.error('[UserProfile] Load failed:', err); setLoadError(true); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="user-page">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (loadError && !author) {
    return (
      <div className="user-page">
        <div className="not-found">{t('common.error')} — <button className="retry-btn" onClick={() => window.location.reload()}>重试</button></div>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="user-page">
        <div className="not-found">{t('author.noStories')}</div>
      </div>
    );
  }

  const tagFallback = (tag: string): string => {
    const displayTag = t('tag.' + tag);
    return displayTag.startsWith('tag.') ? tag : displayTag;
  };

  return (
    <div className="user-page">
      <header className="page-header">
        <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label={t('common.back')}>
          <svg viewBox="0 0 24 24" className="back-icon">
            <path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <h1 className="page-title">{author.nickname}</h1>
      </header>

      <div className="user-content">
        {/* Profile card */}
        <section className="user-profile-card">
          <div className="user-avatar">{author.nickname?.charAt(0) || '?'}</div>
          <h2 className="user-name">{author.nickname}</h2>
          {author.bio && <p className="user-bio">{author.bio}</p>}
          <div className="user-stats">
            <span>{t('author.storyCount', { count: author.story_count })}</span>
          </div>
          <div className="user-actions">
          {!isOwn && (
            <>
              <button className="user-follow-btn" disabled={followLoading} onClick={async () => {
                setFollowLoading(true);
                try {
                  const d: any = await apiService.clientPost('/users/' + id + '/follow');
                  setFollowing(d.following ?? false);
                } catch { /* ignore */ }
                finally { setFollowLoading(false); }
              }}>
                {following ? t('follow.following') : t('follow.follow')}
              </button>
              <Link to={'/messages/' + id} className="user-follow-btn user-msg-btn">✉ {t('msg.send')}</Link>
            </>
          )}
          </div>
        </section>

        {/* Stories */}
        <section className="user-stories">
          {stories.length === 0 ? (
            <div className="empty">
              <p className="empty-title">{t('author.noStories')}</p>
            </div>
          ) : (
            <div className="user-stories-grid">
              {stories.map((story) => (
                <Link key={story.id} to={'/story/' + story.id} className="user-story-card">
                  {story.cover_image ? (
                    <div className="user-story-cover">
                      <img src={story.cover_image} alt={story.title} loading="lazy" />
                    </div>
                  ) : (
                    <div className="user-story-poster">{story.title?.charAt(0) || '?'}</div>
                  )}
                  <div className="user-story-info">
                    <h3 className="user-story-title">{story.title}</h3>
                    {story.tags && story.tags.length > 0 && (
                      <div className="user-story-tags">
                        {story.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="user-story-tag">{tagFallback(tag)}</span>
                        ))}
                      </div>
                    )}
                    <p className="user-story-excerpt">
                      {story.content.length > 60 ? story.content.slice(0, 60) + '…' : story.content}
                    </p>
                    <time className="user-story-date">
                      {formatDate(story.created_at, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </time>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}