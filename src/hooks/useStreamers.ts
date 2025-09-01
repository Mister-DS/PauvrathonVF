// src/hooks/useStreamers.tsx

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Streamer } from '@/types';
import { toast } from './use-toast';

export function useStreamers() {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Correction: Fetch live streamers from the 'streamers' table using a public read-only query.
  // This allows unauthenticated users to see the discovery page.
  // The 'profiles' relationship is joined to get the user's profile information.
  const fetchStreamers = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('streamers')
        .select(`
          id,
          is_live,
          stream_title,
          current_clicks,
          clicks_required,
          total_time_added,
          profiles (
            avatar_url,
            twitch_display_name,
            twitch_username
          )
        `)
        .eq('is_live', true) // Filter to get only live streamers
        .order('current_clicks', { ascending: false }); // Order by a relevant metric

      if (error) {
        throw error;
      }

      // Transform data to match Streamer interface with all required fields
      const transformedData = (data || []).map(item => ({
        id: item.id,
        is_live: item.is_live,
        stream_title: item.stream_title,
        current_clicks: item.current_clicks,
        clicks_required: item.clicks_required,
        total_time_added: item.total_time_added,
        profile: item.profiles as any,
        // Add required fields with defaults
        user_id: '',
        twitch_id: '',
        time_increment: 30,
        cooldown_seconds: 300,
        active_minigames: [],
        status: item.is_live ? 'live' : 'offline' as 'live' | 'offline' | 'paused' | 'ended',
        time_mode: 'fixed' as 'fixed' | 'random',
        max_random_time: 60,
        min_random_time: 10,
        initial_duration: 7200,
        stream_started_at: null,
        pause_started_at: null,
        total_paused_duration: 0,
        created_at: '',
        updated_at: '',
        profiles: item.profiles as any
      }));
      setStreamers(transformedData);

    } catch (error) {
      console.error('Error fetching streamers:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les streamers Pauvrathon.',
        variant: 'destructive',
      });
      setStreamers([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Correction: Use a Supabase subscription for real-time updates.
  // This is much more efficient than a timer and provides instant feedback.
  useEffect(() => {
    // Initial data fetch
    fetchStreamers();

    // Set up a real-time subscription for the 'streamers' table
    const subscription = supabase
      .channel('public:streamers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'streamers' },
        (payload) => {
          // A change occurred, refetch the data to keep it up to date
          fetchStreamers();
        }
      )
      .subscribe();

    // Cleanup function to remove the subscription when the component unmounts
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchStreamers]);

  // The refetch function can still be used for a manual refresh
  return { streamers, loading, refetch: fetchStreamers };
}