import React, { useEffect, useRef } from 'react';

interface TwitchPlayerProps {
  channel: string;
  width?: string | number;
  height?: string | number;
  muted?: boolean;
  autoplay?: boolean;
  onReady?: () => void;
}

const TwitchPlayer: React.FC<TwitchPlayerProps> = ({
  channel,
  width = '100%',
  height = '100%',
  muted = true,
  autoplay = true,
  onReady
}) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Charger le script Twitch Embed si pas déjà chargé
    if (!window.Twitch) {
      const script = document.createElement('script');
      script.src = 'https://embed.twitch.tv/embed/v1.js';
      script.async = true;
      script.onload = () => initializePlayer();
      document.head.appendChild(script);
    } else {
      initializePlayer();
    }

    return () => {
      // Nettoyer le player lors du démontage
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current = null;
        } catch (error) {
          console.error('Error cleaning up Twitch player:', error);
        }
      }
    };
  }, [channel]);

  const initializePlayer = () => {
    if (!playerRef.current || !channel) return;

    try {
      // Détruire l'ancien player s'il existe
      if (playerInstanceRef.current) {
        playerInstanceRef.current = null;
      }

      // Créer le nouveau player
      playerInstanceRef.current = new window.Twitch.Embed(playerRef.current, {
        width,
        height,
        channel: channel.toLowerCase(),
        layout: 'video', // 'video' ou 'video-with-chat'
        autoplay,
        muted,
        // Paramètres additionnels
        parent: [window.location.hostname],
      });

      // Événements du player
      playerInstanceRef.current.addEventListener(window.Twitch.Embed.VIDEO_READY, () => {
        console.log('Twitch player ready');
        onReady?.();
      });

      playerInstanceRef.current.addEventListener(window.Twitch.Embed.VIDEO_PLAY, () => {
        console.log('Video started playing');
      });

    } catch (error) {
      console.error('Error initializing Twitch player:', error);
    }
  };

  return (
    <div 
      ref={playerRef}
      className="w-full h-full min-h-[300px] bg-gray-900 rounded-lg overflow-hidden"
      style={{ aspectRatio: '16/9' }}
    />
  );
};

export default TwitchPlayer;