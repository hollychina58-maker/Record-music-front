import { create } from 'zustand';
import { useAuthStore } from './authStore';

interface AudioState {
  activeMusicId: number | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: (musicId: number, streamUrl: string) => Promise<void>;
  pause: () => void;
  stop: () => void;
  setTime: (t: number) => void;
  getAudio: () => HTMLAudioElement | null;
}

let audio: HTMLAudioElement | null = null;
let timeRaf: number = 0;
let activeBlobUrl: string | null = null;

function stopCurrent() {
  if (audio) {
    audio.pause();
    audio.src = '';
    audio.load();
    audio = null;
  }
  // H7: release the blob URL held by the previous track
  if (activeBlobUrl) {
    URL.revokeObjectURL(activeBlobUrl);
    activeBlobUrl = null;
  }
  cancelAnimationFrame(timeRaf);
}

function createAudio(url: string): HTMLAudioElement {
  const a = new Audio();
  a.preload = 'metadata';
  a.src = url;
  return a;
}

export const useAudioManager = create<AudioState>((set, get) => ({
  activeMusicId: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,

  play: async (musicId: number, streamUrl: string) => {
    const state = get();
    // Same music already playing → toggle
    if (state.activeMusicId === musicId && audio) {
      if (state.isPlaying) {
        audio.pause();
        set({ isPlaying: false });
      } else {
        audio.play().catch(() => {});
        set({ isPlaying: true });
      }
      return;
    }

    // Different music → stop old, start new
    stopCurrent();

    let blobUrl: string | null = null;
    try {
      // H7: fetch with Authorization header + blob — never append the JWT to the URL
      // (query tokens leak into browser history, server logs and Referer headers)
      const token = useAuthStore.getState().token;
      const res = await fetch(streamUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include', // 3-4: cookie session
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      blobUrl = URL.createObjectURL(blob);
      activeBlobUrl = blobUrl;

      audio = createAudio(blobUrl);
      audio.load(); // Force browser to start fetching before play()
      audio.addEventListener('loadedmetadata', () => set({ duration: audio?.duration || 0 }));
      audio.addEventListener('ended', () => { stopCurrent(); set({ isPlaying: false, activeMusicId: null }); });
      audio.addEventListener('error', () => {
        stopCurrent();
        set({ isPlaying: false, activeMusicId: null });
      });

      // rAF for time tracking
      const tick = () => {
        if (audio && !audio.paused) {
          set({ currentTime: audio.currentTime });
          timeRaf = requestAnimationFrame(tick);
        }
      };

      // Wait for audio to be ready before playing (prevents silent first-click)
      // 3-8: add a 15s timeout so a hung source can't leave the button stuck
      if (audio && audio.readyState < 2) {
        await Promise.race([
          new Promise<void>((resolve, reject) => {
            audio!.addEventListener('canplay', () => resolve(), { once: true });
            audio!.addEventListener('error', () => reject(), { once: true });
          }),
          new Promise<void>((_, reject) => setTimeout(() => reject(new Error('audio load timeout')), 15000)),
        ]);
      }
      await audio?.play();
      set({ activeMusicId: musicId, isPlaying: true, currentTime: 0, duration: audio?.duration || 0 });
      timeRaf = requestAnimationFrame(tick);
    } catch (err) {
      console.error('[AudioManager] Play failed:', err instanceof Error ? err.message : err);
      if (audio) { stopCurrent(); }
      if (blobUrl) { URL.revokeObjectURL(blobUrl); }
      set({ isPlaying: false, activeMusicId: null, currentTime: 0, duration: 0 });
    }
  },

  pause: () => {
    if (audio) {
      audio.pause();
      cancelAnimationFrame(timeRaf);
    }
    set({ isPlaying: false });
  },

  setTime: (t: number) => {
    if (audio) audio.currentTime = t;
    set({ currentTime: t });
  },

  stop: () => {
    stopCurrent();
    set({ activeMusicId: null, isPlaying: false, currentTime: 0, duration: 0 });
  },

  getAudio: () => audio,
}));