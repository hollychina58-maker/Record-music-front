import { useState, useRef, useEffect } from 'react';
import { apiService } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import './MusicPlayer.css';

interface MusicPlayerProps {
  audioUrl: string;
  title?: string;
  style?: string;
  musicId?: number;
  canDownload?: boolean;
}

export function MusicPlayer({ audioUrl, title, style: musicStyle, musicId, canDownload }: MusicPlayerProps) {
  const { t } = useLanguage();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    console.log('[MusicPlayer] Loading audio:', audioUrl);

    const onLoaded = () => {
      console.log('[MusicPlayer] loadedmetadata fired, duration:', audio.duration);
      setDuration(audio.duration);
    };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => {
      console.log('[MusicPlayer] playback ended');
      setIsPlaying(false);
    };
    const onError = (_e: ErrorEvent) => {
      console.error('[MusicPlayer] audio error:', {
        error: audio.error,
        code: audio.error?.code,
        message: audio.error?.message,
        networkState: audio.networkState,
        readyState: audio.readyState,
      });
    };
    const onCanPlay = () => console.log('[MusicPlayer] canplay fired');
    const onStalled = () => console.warn('[MusicPlayer] stalled - buffering may have stopped');

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onError);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('stalled', onStalled);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('stalled', onStalled);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleDownload = async () => {
    if (!musicId) return;
    try {
      await apiService.downloadMusic(musicId, title ? `${title}.mp3` : undefined);
    } catch { /* stream endpoint, should not fail */ }
  };

  return (
    <div className={`ink-player${isPlaying ? ' ink-player--playing' : ''}`}>
      <div className="ink-player__info">
        <span className="ink-player__title">{title || t('detail.musicTitle')}</span>
        {musicStyle && <span className="ink-player__artist">{musicStyle}</span>}
      </div>

      <div className="ink-player__controls">
        {musicId && canDownload && (
          <button
            className="ink-player__btn ink-player__btn--download"
            onClick={handleDownload}
            aria-label={t('music.download')}
            title={t('music.download')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 4v12M8 12l4 4 4-4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <button
          className="ink-player__btn ink-player__btn--play"
          onClick={togglePlay}
          aria-label={isPlaying ? t('music.pause') : t('music.play')}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
      </div>

      <div className="ink-player__progress">
        <span className="ink-player__time">{formatTime(currentTime)}</span>
        <div className="ink-player__track">
          <div
            className="ink-player__fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="ink-player__time">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
