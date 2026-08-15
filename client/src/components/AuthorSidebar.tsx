import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useFormatDate } from '../i18n/dateFormat';
import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/api';
import './AuthorSidebar.css';

interface AuthorInfo {
  id: number;
  nickname: string;
  avatar: string | null;
  bio: string | null;
  story_count: number;
  created_at: string;
}

interface AuthorStory {
  id: number;
  title: string;
  created_at: string;
}

export function AuthorSidebar({ authorId, authorNickname, excludeStoryId }: { authorId: number; authorNickname: string; excludeStoryId?: number }) {
  const { t } = useLanguage();
  const formatDate = useFormatDate();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const currentUser = useAuthStore(s => s.user);
  const [author, setAuthor] = useState<AuthorInfo | null>(null);
  const [stories, setStories] = useState<AuthorStory[]>([]);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!authorId) return;
    apiService.clientGet<{ data: AuthorInfo }>('/users/' + authorId + '/profile')
      .then(d => setAuthor(d.data))
      .catch(() => {});
    apiService.clientGet<{ data: AuthorStory[] }>('/users/' + authorId + '/stories?limit=4')
      .then(d => setStories(d.data.filter(s => s.title && s.id !== excludeStoryId).slice(0, 3)))
      .catch(() => {});
    if (isAuthenticated) {
      apiService.clientGet('/users/' + authorId + '/is-following')
        .then((d: any) => setFollowing(d.following ?? false))
        .catch(() => {});
    }
  }, [authorId, isAuthenticated, excludeStoryId]);

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      const d: any = await apiService.clientPost('/users/' + authorId + '/follow');
      setFollowing(d.following ?? false);
    } catch { /* ignore */ }
    finally { setFollowLoading(false); }
  };

  if (!author) return null;

  // Exclude current story — StoryDetailPage passes the current story ID via context, but we don't have it here
  // We just show up to 3 stories; if the current story is included, the user can just see it

  return (
    <aside className="author-sidebar">
      {/* Author card */}
      <div className="author-card">
        <Link to={'/user/' + authorId} className="author-avatar-placeholder">
          {authorNickname?.charAt(0) || '?'}
        </Link>
        <Link to={'/user/' + authorId} className="author-name">{authorNickname}</Link>
        {author.bio && <p className="author-bio">{author.bio}</p>}
        <div className="author-meta">
          <span>{t('author.storyCount', { count: author.story_count })}</span>
        </div>
        <div className="author-actions">
          {isAuthenticated && currentUser?.id !== authorId && (
            <button className="sidebar-btn sidebar-btn--follow" onClick={handleFollow} disabled={followLoading}>
              {following ? t('follow.following') : t('follow.follow')}
            </button>
          )}
          {isAuthenticated && currentUser?.id !== authorId && (
            <Link to={'/messages/' + authorId} className="sidebar-btn sidebar-btn--msg">
              ✉
            </Link>
          )}
        </div>
      </div>

      {/* Other stories */}
      {stories.length > 0 && (
        <div className="author-stories">
          <h4 className="author-stories-title">{t('author.otherStories')}</h4>
          {stories.map(s => (
            <Link key={s.id} to={'/story/' + s.id} className="author-story-link">
              <span className="author-story-title">{s.title}</span>
              <span className="author-story-date">
                {formatDate(s.created_at, { month: 'short', day: 'numeric' })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </aside>
  );
}