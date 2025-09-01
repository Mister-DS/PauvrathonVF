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

      // Récupère TOUS les streamers avec les profils associés
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
        .returns<SupabaseStreamer[]>(); // Utilisation du type défini pour la réponse

      if (streamersError) {
        throw streamersError;
      }

      if (!streamersData || streamersData.length === 0) {
        console.log('Aucun streamer Pauvrathon trouvé');
        setStreamers([]);
        return;
      }

      // Transforme les données brutes de Supabase en un format Streamer
      const transformedData: Streamer[] = streamersData.map(s => {
        // Le `profiles` de la réponse Supabase peut être null ou indéfini
        const profile = s.profiles;
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
          } : null, // Assure que 'profile' peut être null si la donnée n'existe pas
        };
      });

      console.log('Streamers Pauvrathon chargés:', transformedData);
      setStreamers(transformedData);

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
          fetchStreamers(); // Recharge toutes les données pour synchronisation
        }
      )
      .subscribe();

    return () => {
      // Nettoyage de la souscription lors du démontage du composant
      supabase.removeChannel(subscription);
    };
  }, [fetchStreamers]);

  return { streamers, loading, refetch: fetchStreamers };
}