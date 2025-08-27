import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useStreamerStatus(userId: string | undefined) {
  const [isLive, setIsLive] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchStreamerStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('streamers')
          .select('is_live')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching streamer status:', error);
          return;
        }

        setIsLive(data?.is_live || false);
      } catch (error) {
        console.error('Error fetching streamer status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreamerStatus();

    // Set up real-time subscription for live status updates
    const subscription = supabase
      .channel('streamer-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'streamers',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && 'is_live' in payload.new) {
            setIsLive(payload.new.is_live);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  return { isLive, loading };
}