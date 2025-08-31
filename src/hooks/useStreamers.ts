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

      // Correction: Data is already in the correct format with a 'profiles' object, 
      // so no unsafe mapping or casting is needed.
      setStreamers(data || []);

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