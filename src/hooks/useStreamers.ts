import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Streamer } from '@/types';
import { toast } from './use-toast';

export function useStreamers() {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchStreamers = async (force: boolean = false) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetch;
    
    // Only fetch if forced or more than 10 minutes have passed
    if (!force && timeSinceLastFetch < 10 * 60 * 1000 && streamers.length > 0) {
      return;
    }

    try {
      setLoading(true);
      
      // Get all live streamers
      const { data, error } = await supabase
        .from('streamers')
        .select(`
          *,
          profiles!inner(*)
        `)
        .eq('is_live', true);

      if (error) throw error;
      
      const streamersWithProfile = (data || []).map(streamer => ({
        ...streamer,
        profile: Array.isArray(streamer.profiles) ? streamer.profiles[0] : streamer.profiles
      }));
      
      setStreamers(streamersWithProfile as unknown as Streamer[]);
      setLastFetch(now);
      
    } catch (error) {
      console.error('Error fetching streamers:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les streamers.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreamers(true); // Force initial fetch
    
    // Set up interval to refresh every 10-15 minutes (12.5 min average)
    const interval = setInterval(() => {
      fetchStreamers(true);
    }, 12.5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { streamers, loading, refetch: () => fetchStreamers(true) };
}