import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Streamer } from '@/types';
import { toast } from './use-toast';

export function useStreamers() {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreamers = async () => {
    try {
      const { data, error } = await supabase
        .from('streamers')
        .select(`
          *,
          profiles(*)
        `)
        .eq('is_live', true);

      if (error) throw error;
      
      const streamersWithProfile = (data || []).map(streamer => ({
        ...streamer,
        profile: streamer.profiles?.[0] || null
      }));
      
      setStreamers(streamersWithProfile as unknown as Streamer[]);
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
    fetchStreamers();
  }, []);

  return { streamers, loading, refetch: fetchStreamers };
}