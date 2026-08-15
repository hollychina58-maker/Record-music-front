import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import './BurnConfirmModal.css';

interface BurnConfirmModalProps {
  storyTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BurnConfirmModal({ storyTitle, onConfirm, onCancel }: BurnConfirmModalProps) {
  const { t } = useLanguage();
  const [confirmed, setConfirmed] = useState(false);
  // H8: keep the ignition timer so cancel/unmount actually cancels the burn
  const burnTimerRef = useRef<number | null>(null);

  // 用 ref 避免 Escape 回调里的 confirmed 闭包陈旧
  const confirmedRef = useRef(false);
  confirmedRef.current = confirmed;

  // Escape 键取消（仅在点火前生效）——cleanup 只移除监听，绝不清除焚烧定时器
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmedRef.current) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // 仅在组件真正卸载时取消定时器——绝不能因为 confirmed 变化触发 cleanup 而误清定时器
  useEffect(() => {
    return () => {
      if (burnTimerRef.current !== null) {
        clearTimeout(burnTimerRef.current);
        burnTimerRef.current = null;
      }
    };
  }, []);

  const handleCancel = () => {
    // H8: cancelling always clears the pending ignition timer
    if (burnTimerRef.current !== null) {
      clearTimeout(burnTimerRef.current);
      burnTimerRef.current = null;
    }
    onCancel();
  };

  const handleConfirm = () => {
    setConfirmed(true);
    burnTimerRef.current = window.setTimeout(() => {
      burnTimerRef.current = null;
      onConfirm();
    }, 2800);
  };

  return (
    // H8: once ignited, the overlay click no longer cancels (burn is irreversible)
    <div className="burn-modal-overlay" onClick={confirmed ? undefined : handleCancel}>
      <div className={`burn-modal${confirmed ? ' burn-modal--ignited' : ''}`} onClick={(e) => e.stopPropagation()}>
        {!confirmed ? (
          <>
            <div className="burn-modal-icon">
              <svg viewBox="0 0 48 48" width="48" height="48">
                <path
                  d="M24 4C15.16 4 8 11.16 8 20c0 6.04 3.38 11.4 8.36 14.06C17.6 38.62 20.52 44 24 44s6.4-5.38 7.64-9.94C36.62 31.4 40 26.04 40 20c0-8.84-7.16-16-16-16zm-1.5 4.78c.98-.24 2.02-.24 3 0C24.12 12.5 22.5 16 24 20c1.5-4 3-6.5 4.5-6.5s3 2.5 4.5 6.5c-1.5-4-4.5-6.5-6-6.5s-1.5 2.5-1.5 6.5c0-4-1.5-6.5-3-6.5s-1.5 2.5-1.5 6.5c0-4-1.5-6.5-2-6.5s-2 2.5-2 6.5c0-4 .5-6.5 2-8.72z"
                  fill="currentColor"
                  opacity="0.9"
                />
              </svg>
            </div>
            <h2 className="burn-modal-title">{t('burn.title')}</h2>
            <p className="burn-modal-story-name">《{storyTitle}》</p>
            <p className="burn-modal-warning">
              {t('burn.warning')}
            </p>
            <div className="burn-modal-actions">
              <button type="button" className="burn-cancel-btn" onClick={handleCancel}>
                {t('burn.keep')}
              </button>
              <button type="button" className="burn-confirm-btn" onClick={handleConfirm}>
                {t('burn.confirm')}
              </button>
            </div>
          </>
        ) : (
          <div className="burn-modal-burning">
            <div className="burn-fire-ring">
              <div className="burn-fire-core" />
              <div className="burn-ember e1" />
              <div className="burn-ember e2" />
              <div className="burn-ember e3" />
              <div className="burn-ember e4" />
              <div className="burn-ember e5" />
              <div className="burn-ember e6" />
            </div>
            <p className="burn-modal-ignited-text">{t('burn.ignited')}</p>
          </div>
        )}
      </div>
    </div>
  );
}