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
  status: 'live' | 'offline';
  profiles: {
    avatar_url?: string;
    twitch_display_name?: string;
    twitch_username?: string;
    id: string;
  } | null; // Assure que 'profiles' peut être null si la jointure échoue
}

export function useStreamers() {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchStreamers = useCallback(async () => {
    try {
      setLoading(true);

      // Récupère TOUS les streamers (pas de filtre status='live')
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
  .order('current_clicks', { ascending: false });

      if (streamersError) {
        throw streamersError;
      }

      if (!streamersData || streamersData.length === 0) {
        console.log('Aucun streamer Pauvrathon trouvé');
        setStreamers([]);
        return;
      }
      
      // LOGS POUR DIAGNOSTIC - NE PAS SUPPRIMER
      console.log('Données brutes de Supabase:', streamersData);

      // Transforme les données pour correspondre à l'interface Streamer
      const transformedData = streamersData.map(s => {
        const profile = s.profiles as any;
        return {
          id: s.id,
          is_live: s.status === 'live',
          stream_title: s.stream_title,
          current_clicks: s.current_clicks,
          clicks_required: s.clicks_required,
          total_time_added: s.total_time_added,
          profile: profile ? {
            avatar_url: profile.avatar_url,
            twitch_display_name: profile.twitch_display_name,
            twitch_username: profile.twitch_username
          } : null,
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
    // Chargement initial
    fetchStreamers();

    // Souscription en temps réel pour les mises à jour
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