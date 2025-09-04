// src/components/UniversalTimer.tsx
import { useState, useEffect } from 'react';

interface UniversalTimerProps {
  status: 'offline' | 'live' | 'paused' | 'ended';
  streamStartedAt: string | null;
  pauseStartedAt: string | null;
  initialDuration: number;
  totalTimeAdded: number;
  totalElapsedTime?: number;
  totalPausedDuration?: number;
  formatStyle?: 'long' | 'short' | 'colon';
  showStatus?: boolean;
  className?: string;
  streamerId?: string; // Optional prop for compatibility
}

export const UniversalTimer = ({
  status,
  streamStartedAt,
  pauseStartedAt,
  initialDuration,
  totalTimeAdded,
  totalElapsedTime = 0,
  totalPausedDuration = 0,
  formatStyle = 'colon',
  showStatus = false,
  className = '',
  streamerId // Accept but ignore for compatibility
}: UniversalTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(initialDuration);
  const [displayTime, setDisplayTime] = useState<string>('');

  useEffect(() => {
    const calculateTime = () => {
      const totalDuration = initialDuration + totalTimeAdded;
      let elapsedSeconds = 0;

      if (status === 'live' && streamStartedAt) {
        // LIVE: Calculer le temps réel écoulé en soustrayant les pauses
        const streamStart = new Date(streamStartedAt).getTime();
        const now = new Date().getTime();
        const totalRealTime = Math.floor((now - streamStart) / 1000);
        
        // Temps effectif = temps réel - pauses
        elapsedSeconds = totalRealTime - totalPausedDuration;
        
      } else if (status === 'paused' && streamStartedAt) {
        // PAUSE: Utiliser directement totalElapsedTime qui est calculé côté serveur
        elapsedSeconds = totalElapsedTime;
        
      } else {
        // OFFLINE/ENDED: Temps total écoulé sauvegardé
        elapsedSeconds = totalElapsedTime;
      }

      const remaining = Math.max(0, totalDuration - elapsedSeconds);
      setTimeRemaining(remaining);

      // Formater l'affichage selon le style demandé
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;

      switch (formatStyle) {
        case 'long':
          setDisplayTime(`${hours}h ${minutes}m ${seconds}s`);
          break;
        case 'short':
          if (hours > 0) {
            setDisplayTime(`${hours}h ${minutes}m`);
          } else {
            setDisplayTime(`${minutes}m ${seconds}s`);
          }
          break;
        case 'colon':
        default:
          setDisplayTime(
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          );
          break;
      }
    };

    // Calcul initial
    calculateTime();

    // Mise à jour uniquement si le stream est en cours (pas en pause)
    let interval: NodeJS.Timeout;
    if (status === 'live') {
      interval = setInterval(calculateTime, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, streamStartedAt, pauseStartedAt, initialDuration, totalTimeAdded, totalElapsedTime, totalPausedDuration, formatStyle]);

  const getStatusInfo = () => {
    switch (status) {
      case 'live':
        return { text: 'EN DIRECT', color: 'text-green-500', bgColor: 'bg-green-500' };
      case 'paused':
        return { text: 'EN PAUSE', color: 'text-yellow-500', bgColor: 'bg-yellow-500' };
      case 'ended':
        return { text: 'TERMINÉ', color: 'text-gray-500', bgColor: 'bg-gray-500' };
      default:
        return { text: 'HORS LIGNE', color: 'text-gray-500', bgColor: 'bg-gray-500' };
    }
  };

  const statusInfo = getStatusInfo();

  if (status === 'ended') {
    return (
      <div className={className}>
        {showStatus && (
          <div className="flex items-center justify-center mb-2">
            <div className={`w-3 h-3 ${statusInfo.bgColor} rounded-full mr-2`}></div>
            <span className={`font-semibold ${statusInfo.color}`}>{statusInfo.text}</span>
          </div>
        )}
        <div className="text-center">Terminé</div>
      </div>
    );
  }

  if (!streamStartedAt && status !== 'offline') {
    return (
      <div className={className}>
        {showStatus && (
          <div className="flex items-center justify-center mb-2">
            <div className={`w-3 h-3 ${statusInfo.bgColor} rounded-full mr-2`}></div>
            <span className={`font-semibold ${statusInfo.color}`}>{statusInfo.text}</span>
          </div>
        )}
        <div className="text-center">--:--:--</div>
      </div>
    );
  }

  return (
    <div className={className}>
      {showStatus && (
        <div className="flex items-center justify-center mb-2">
          <div className={`w-3 h-3 ${statusInfo.bgColor} rounded-full ${status === 'live' ? 'animate-pulse' : ''} mr-2`}></div>
          <span className={`font-semibold ${statusInfo.color}`}>{statusInfo.text}</span>
        </div>
      )}
      <div className="text-center font-mono">
        {displayTime}
      </div>
    </div>
  );
};