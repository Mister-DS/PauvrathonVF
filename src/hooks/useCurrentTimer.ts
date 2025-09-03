import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';

export function useCurrentTimer(streamerId: string) {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!streamerId) return;

    // Récupérer la valeur initiale
    supabase
      .from('current_timer')
      .select('seconds')
      .eq('streamer_id', streamerId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setSeconds(data.seconds);
      });

    // Écouter les changements en temps réel
    const subscription = supabase
      .from(`current_timer:streamer_id=eq.${streamerId}`)
      .on('UPDATE', (payload) => {
        setSeconds(payload.new.seconds);
      })
      .subscribe();

    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [streamerId]);

  return seconds;
}