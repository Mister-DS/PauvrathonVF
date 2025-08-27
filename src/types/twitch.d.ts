// src/types/twitch.d.ts
declare global {
  interface Window {
    Twitch: {
      Embed: new (target: HTMLElement, options: TwitchEmbedOptions) => TwitchPlayer;
    };
  }
}

interface TwitchEmbedOptions {
  width: string | number;
  height: string | number;
  channel: string;
  layout: 'video' | 'video-with-chat';
  autoplay: boolean;
  muted: boolean;
  parent: string[];
}

interface TwitchPlayer {
  addEventListener: (event: string, callback: () => void) => void;
  removeEventListener: (event: string, callback: () => void) => void;
  play: () => void;
  pause: () => void;
  setMuted: (muted: boolean) => void;
  getMuted: () => boolean;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  destroy: () => void;
}

// Types d'événements Twitch
declare const TWITCH_EMBED_EVENTS: {
  VIDEO_READY: string;
  VIDEO_PLAY: string;
  VIDEO_PAUSE: string;
  OFFLINE: string;
  ONLINE: string;
  ENDED: string;
};

export {};