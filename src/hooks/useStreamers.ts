// src/hooks/useStreamers.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Streamer } from '@/types';
import { toast } from './use-toast';

// Définition d'un type pour la donnée brute renvoyée par Supabase
// Cela rend le code plus sûr et plus facile à comprendre
interface SupabaseStreamer {
  id: string;
  is_live: boolean;
  stream_title?: string;
  current_clicks: number;
  clicks_required: number;
  total_time_added: number;
  status: 'live' | 'offline' | 'paused';
  profiles: {
    avatar_url?: string;
    twitch_display_name?: string;
    twitch_username?: string;
    id: string;
  } | null;
}

export function useStreamers() {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchStreamers = useCallback(async () => {
    try {
      setLoading(true);

      const { data: streamersData, error: streamersError } = await supabase
        .from('streamers')
        .select(`
          *,
          profiles!inner (
            id,
            twitch_display_name,
            twitch_username,
            avatar_url
          )
        `)
        .order('current_clicks', { ascending: false })
        .returns<SupabaseStreamer[]>();

      if (streamersError) {
        throw streamersError;
      }

      if (!streamersData || streamersData.length === 0) {
        console.log('Aucun streamer Pauvrathon trouvé');
        setStreamers([]);
        return;
      }

      const transformedData = streamersData.map(s => {
        const profile = s.profiles;
        return {
          ...s,
          profile: profile ? {
            avatar_url: profile.avatar_url,
            twitch_display_name: profile.twitch_display_name,
            twitch_username: profile.twitch_username
          } : null,
          is_live: s.status === 'live' || s.status === 'paused', 
        };
      });

      console.log('Streamers Pauvrathon chargés:', transformedData);
      setStreamers(transformedData as Streamer[]);

    } catch (error) {
      console.error('Erreur lors du chargement des streamers:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les streamers Pauvrathon.',
        variant: 'destructive',
      });
      setStreamers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreamers();

    const subscription = supabase
      .channel('public:streamers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'streamers' },
        (payload) => {
          console.log('Mise à jour temps réel streamers:', payload);
          fetchStreamers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchStreamers]);

  return { streamers, loading, refetch: fetchStreamers };
}