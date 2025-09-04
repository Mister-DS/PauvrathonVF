import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';

export function useCurrentTimer(streamerId: string) {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!streamerId) return;

    // Get streamer's current timer data from streamers table
    const fetchTimer = async () => {
      const { data, error } = await supabase
        .from('streamers')
        .select('initial_duration, total_time_added, total_elapsed_time')
        .eq('id', streamerId)
        .single();

      if (!error && data) {
        const remaining = (data.initial_duration + data.total_time_added) - data.total_elapsed_time;
        setSeconds(Math.max(0, remaining));
      }
    };

    fetchTimer();

    // Listen for real-time changes to streamer data
    const subscription = supabase
      .channel('streamer-timer')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'streamers',
          filter: `id=eq.${streamerId}`,
        },
        (payload) => {
          if (payload.new) {
            const data = payload.new as any;
            const remaining = (data.initial_duration + data.total_time_added) - data.total_elapsed_time;
            setSeconds(Math.max(0, remaining));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [streamerId]);

  return seconds;
}