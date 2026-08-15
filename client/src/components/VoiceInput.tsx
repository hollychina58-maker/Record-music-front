import { useEffect, useRef } from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import './VoiceInput.css';

interface VoiceInputProps {
  onTranscriptChange: (text: string) => void;
  value: string;
}

export function VoiceInput({ onTranscriptChange, value }: VoiceInputProps) {
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
  } = useVoiceInput();

  const baseLengthRef = useRef(value.length);

  // When listening starts, record the current text position so we append after it
  useEffect(() => {
    if (isListening) {
      baseLengthRef.current = value.length;
    }
  }, [isListening]);

  useEffect(() => {
    if (isListening && transcript) {
      const base = value.slice(0, baseLengthRef.current);
      const separator = baseLengthRef.current > 0 && base.slice(-1) !== '\n' ? '\n' : '';
      onTranscriptChange(base + separator + transcript);
    }
  }, [transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = () => {
    startListening();
  };

  const handleStop = () => {
    stopListening();
  };

  const currentInterim = isListening && interimTranscript
    ? value.slice(0, baseLengthRef.current) + (baseLengthRef.current > 0 ? '\n' : '') + interimTranscript
    : null;

  return (
    <div className="voice-input">
      <button
        type="button"
        className={`voice-btn ${isListening ? 'listening' : ''}`}
        onClick={isListening ? handleStop : handleStart}
        disabled={!isSupported}
        aria-label={isListening ? '停止语音输入' : '开始语音输入'}
      >
        <svg viewBox="0 0 24 24" className="voice-icon" width="20" height="20">
          {isListening ? (
            <>
              <rect x="9" y="1" width="6" height="11" rx="3" fill="currentColor" />
              <path d="M6 11v1a6 6 0 0 0 12 0v-1" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <line x1="12" y1="18" x2="12" y2="23" stroke="currentColor" strokeWidth="2" />
            </>
          ) : (
            <>
              <rect x="9" y="1" width="6" height="11" rx="3" fill="currentColor" />
              <path d="M6 11v1a6 6 0 0 0 12 0v-1" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <line x1="12" y1="18" x2="12" y2="23" stroke="currentColor" strokeWidth="1.5" />
            </>
          )}
        </svg>
      </button>
      {currentInterim && (
        <span className="interim-text">{currentInterim}</span>
      )}
      {!isSupported && (
        <span className="not-supported">浏览器不支持语音识别</span>
      )}
    </div>
  );
}