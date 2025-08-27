// src/components/TwitchPlayer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface TwitchPlayerProps {
  channel: string;
  width?: string | number;
  height?: string | number;
  muted?: boolean;
  autoplay?: boolean;
  layout?: 'video' | 'video-with-chat';
  onReady?: () => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

export const TwitchPlayer: React.FC<TwitchPlayerProps> = ({
  channel,
  width = '100%',
  height = '100%',
  muted = true,
  autoplay = true,
  layout = 'video',
  onReady,
  onOffline,
  onOnline
}) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Vérifier si le script Twitch est déjà chargé
    if (window.Twitch) {
      setScriptLoaded(true);
      initializePlayer();
    } else {
      loadTwitchScript();
    }

    return () => {
      cleanup();
    };
  }, [channel, scriptLoaded]);

  const loadTwitchScript = () => {
    // Vérifier si le script est déjà en cours de chargement
    if (document.querySelector('script[src*="embed.twitch.tv"]')) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://embed.twitch.tv/embed/v1.js';
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Twitch embed script');
      setIsLoading(false);
    };
    
    document.head.appendChild(script);
  };

  const initializePlayer = () => {
    if (!playerRef.current || !channel || !window.Twitch) {
      return;
    }

    try {
      // Nettoyer l'ancien player
      cleanup();

      // Créer le nouveau player
      playerInstanceRef.current = new window.Twitch.Embed(playerRef.current, {
        width,
        height,
        channel: channel.toLowerCase().trim(),
        layout,
        autoplay,
        muted,
        parent: [window.location.hostname, 'localhost', '127.0.0.1'],
      });

      // Événements du player
      playerInstanceRef.current.addEventListener('ready', () => {
        console.log('Twitch player ready for channel:', channel);
        setIsLoading(false);
        setIsOffline(false);
        onReady?.();
      });

      playerInstanceRef.current.addEventListener('online', () => {
        console.log('Stream is online');
        setIsOffline(false);
        onOnline?.();
      });

      playerInstanceRef.current.addEventListener('offline', () => {
        console.log('Stream is offline');
        setIsOffline(true);
        onOffline?.();
      });

    } catch (error) {
      console.error('Error initializing Twitch player:', error);
      setIsLoading(false);
    }
  };

  const cleanup = () => {
    if (playerInstanceRef.current) {
      try {
        playerInstanceRef.current.destroy?.();
      } catch (error) {
        console.error('Error destroying Twitch player:', error);
      }
      playerInstanceRef.current = null;
    }
  };

  // Composant de chargement
  const LoadingComponent = () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
      <div className="text-center text-white">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
        <p className="text-lg">Chargement du stream...</p>
        <p className="text-sm text-gray-400 mt-1">@{channel}</p>
      </div>
    </div>
  );

  // Composant hors ligne
  const OfflineComponent = () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
      <div className="text-center text-white">
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-6 h-6 bg-red-500 rounded-full"></div>
        </div>
        <p className="text-lg mb-2">Stream hors ligne</p>
        <p className="text-sm text-gray-400">@{channel}</p>
        <p className="text-xs text-gray-500 mt-2">Le stream reprendra bientôt</p>
      </div>
    </div>
  );

  // Composant d'erreur
  const ErrorComponent = () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
      <div className="text-center text-white">
        <div className="w-16 h-16 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400 text-2xl">!</span>
        </div>
        <p className="text-lg mb-2">Erreur de chargement</p>
        <p className="text-sm text-gray-400">Impossible de charger le stream</p>
        <p className="text-xs text-gray-500 mt-1">@{channel}</p>
      </div>
    </div>
  );

  if (!channel) {
    return <ErrorComponent />;
  }

  return (
    <div className="w-full h-full relative">
      {isLoading && <LoadingComponent />}
      
      <div 
        ref={playerRef}
        className="w-full h-full min-h-[300px] bg-gray-900 rounded-lg overflow-hidden"
        style={{ 
          aspectRatio: '16/9',
          display: isLoading ? 'none' : 'block'
        }}
      />
      
      {isOffline && !isLoading && <OfflineComponent />}
    </div>
  );
};