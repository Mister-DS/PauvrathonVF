import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TimeAddition } from '@/types';

interface UseRealtimeTimerProps {
  streamerId?: string;
  onTimeAdded?: (timeAddition: TimeAddition) => void;
  onStreamerUpdate?: (streamer: any) => void;
}

export function useRealtimeTimer({ 
  streamerId, 
  onTimeAdded, 
  onStreamerUpdate 
}: UseRealtimeTimerProps) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!streamerId) return;

    console.log('Setting up realtime subscriptions for streamer:', streamerId);

    // Channel pour les time_additions
    const timeAdditionsChannel = supabase
      .channel('time_additions_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'time_additions',
          filter: `streamer_id=eq.${streamerId}`
        },
        (payload) => {
          console.log('New time addition:', payload.new);
          if (onTimeAdded && payload.new) {
            onTimeAdded(payload.new as TimeAddition);
          }
        }
      )
      .subscribe((status) => {
        console.log('Time additions channel status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Channel pour les mises à jour du streamer
    const streamerChannel = supabase
      .channel('streamer_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'streamers',
          filter: `id=eq.${streamerId}`
        },
        (payload) => {
          console.log('Streamer updated:', payload.new);
          if (onStreamerUpdate && payload.new) {
            onStreamerUpdate(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('Streamer channel status:', status);
      });

    // Cleanup function
    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(timeAdditionsChannel);
      supabase.removeChannel(streamerChannel);
      setIsConnected(false);
    };
  }, [streamerId, onTimeAdded, onStreamerUpdate]);

  return {
    isConnected
  };
}