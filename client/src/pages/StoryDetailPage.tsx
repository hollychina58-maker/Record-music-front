import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService, Story } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useLanguage } from '../i18n/LanguageContext';
import { CommentSection } from '../components/CommentSection';
import { ShareButton } from '../components/ShareButton';
import { BurnConfirmModal } from '../components/BurnConfirmModal';
import { MusicPlayer } from '../components/MusicPlayer';
import { LikeButton } from '../components/LikeButton';
import './StoryDetailPage.css';

interface MusicInfo {
  id: number;
  status: string;
  file_path: string | null;
  style: string | null;
}

export function StoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { t } = useLanguage();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBurnConfirm, setShowBurnConfirm] = useState(false);
  const [music, setMusic] = useState<MusicInfo | null>(null);
  const [storyLiked, setStoryLiked] = useState(false);
  const [commentLikes, setCommentLikes] = useState<Record<number, boolean>>({});
  const prevAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    if (prevAuthRef.current && !isAuthenticated) {
      navigate('/', { replace: true });
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (id) {
      loadStory(parseInt(id, 10));
    }
  }, [id]);

  const loadStory = async (storyId: number) => {
    try {
      const data = await apiService.getStoryById(storyId);
      setStory(data);
      apiService
        .getMusicByStory(storyId)
        .then((tracks) => {
          if (tracks.length > 0 && tracks[0].status === 'completed') {
            setMusic(tracks[0] as unknown as MusicInfo);
          }
        })
        .catch(() => {});
      apiService
        .getLikeInfo(storyId)
        .then((info) => {
          setStoryLiked(info.storyLiked);
          setCommentLikes(info.commentLikes);
        })
        .catch(() => {});
    } catch {
      setStory(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBurn = async () => {
    if (!id) return;
    setShowBurnConfirm(false);
    try {
      await apiService.burnStory(parseInt(id, 10));
    } finally {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="detail-page">
        <div className="loading">{t('detail.loading')}</div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="detail-page">
        <div className="not-found">{t('detail.notFound')}</div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <header className="page-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate('/')}
          aria-label={t('common.back')}
        >
          <svg viewBox="0 0 24 24" className="back-icon">
            <path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <div className="header-actions">
          <ShareButton storyId={story.id} disabled={story.isBurned} />
          {!story.isBurned && (
            <button
              type="button"
              className="burn-btn"
              onClick={() => setShowBurnConfirm(true)}
              aria-label={t('burn.confirm')}
            >
              <svg viewBox="0 0 24 24" className="burn-icon">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 3c1.38 0 2.5 1.12 2.5 2.5S13.38 10 12 10s-2.5-1.12-2.5-2.5S10.62 5 12 5z" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <main className="story-content">
        <div className="ink-decoration">
          <div className="ink-line"></div>
        </div>

        <article>
          <h1 className="story-title">{story.title}</h1>
          <time className="story-date">
            {new Date(story.created_at).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          <div className="story-actions-row">
            <LikeButton
              targetType="story"
              targetId={story.id}
              initialLiked={storyLiked}
              initialCount={story.like_count || 0}
            />
          </div>
          <div className="story-body">
            {story.content.split('\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph || ' '}</p>
            ))}
          </div>
        </article>
        {music && (
          <div className="music-section">
            <MusicPlayer
              audioUrl={`${import.meta.env.VITE_API_URL || ''}/api/music/${music.id}/stream`}
              title={t('detail.musicTitle')}
              style={music.style || undefined}
              musicId={music.id}
              canDownload={!!(user && story && user.id === story.user_id)}
            />
          </div>
        )}
      </main>

      <CommentSection storyId={story.id} isBurned={story.isBurned} commentLikes={commentLikes} />

      {showBurnConfirm && (
        <BurnConfirmModal
          storyTitle={story.title}
          onConfirm={handleBurn}
          onCancel={() => setShowBurnConfirm(false)}
        />
      )}

    </div>
  );
}