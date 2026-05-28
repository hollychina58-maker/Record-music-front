import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import './LikeButton.css';

interface LikeButtonProps {
  targetType: 'story' | 'comment';
  targetId: number;
  initialLiked?: boolean;
  initialCount?: number;
}

export function LikeButton({
  targetType,
  targetId,
  initialLiked = false,
  initialCount = 0,
}: LikeButtonProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  if (!isAuthenticated) {
    return (
      <span className="like-btn like-btn--disabled" title="登录后即可点赞">
        <svg viewBox="0 0 24 24" width="16" height="16" className="like-icon">
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
        {count > 0 && <span className="like-count">{count}</span>}
      </span>
    );
  }

  const handleClick = async () => {
    if (pending) return;
    setPending(true);

    // Optimistic update
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!liked);
    setCount(liked ? Math.max(0, count - 1) : count + 1);

    try {
      const { apiService } = await import('../services/api');
      const result = await apiService.toggleLike(targetType, targetId);
      setLiked(result.liked);
      setCount(result.likeCount);
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      className={`like-btn ${liked ? 'like-btn--liked' : ''}`}
      onClick={handleClick}
      disabled={pending}
      aria-label={liked ? '取消点赞' : '点赞'}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" className="like-icon">
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
      {count > 0 && <span className="like-count">{count}</span>}
    </button>
  );
}
