// src/hooks/useStreamers.tsx

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Streamer } from '@/types';
import { toast } from './use-toast';

export function useStreamers() {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchStreamers = useCallback(async () => {
    try {
      setLoading(true);

      // CORRECTION 1: Récupérer TOUS les streamers, pas seulement ceux en live
      const { data: streamersData, error: streamersError } = await supabase
        .from('streamers')
        .select(`
          id,
          user_id,
          is_live,
          status,
          stream_title,
          current_clicks,
          clicks_required,
          total_time_added,
          initial_duration
        `)
        .order('is_live', { ascending: false }) // Live streamers en premier
        .order('current_clicks', { ascending: false }); // Puis par nombre de clics

      if (streamersError) {
        throw streamersError;
      }

      if (!streamersData || streamersData.length === 0) {
        console.log('Aucun streamer trouvé');
        setStreamers([]);
        return;
      }

      // CORRECTION 2: Récupérer les profils séparément
      const userIds = streamersData.map(s => s.user_id).filter(Boolean);
      
      let profilesData = [];
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, avatar_url, twitch_display_name, twitch_username')
          .in('user_id', userIds);

        if (profilesError) {
          console.warn('Erreur lors de la récupération des profils:', profilesError);
        } else {
          profilesData = profiles || [];
        }
      }

      // CORRECTION 3: Transformation simplifiée des données
      const transformedData = streamersData.map(streamer => {
        const profile = profilesData.find(p => p.user_id === streamer.user_id);
        
        return {
          id: streamer.id,
          user_id: streamer.user_id,
          is_live: streamer.is_live,
          status: streamer.status || 'offline',
          stream_title: streamer.stream_title,
          current_clicks: streamer.current_clicks || 0,
          clicks_required: streamer.clicks_required || 100,
          total_time_added: streamer.total_time_added || 0,
          initial_duration: streamer.initial_duration || 7200,
          
          // Profil du streamer
          profile: profile ? {
            avatar_url: profile.avatar_url,
            twitch_display_name: profile.twitch_display_name,
            twitch_username: profile.twitch_username
          } : null,

          // Alias pour compatibilité (si votre interface l'exige)
          profiles: profile ? {
            avatar_url: profile.avatar_url,
            twitch_display_name: profile.twitch_display_name,
            twitch_username: profile.twitch_username
          } : null
        };
      });

      console.log('Streamers chargés:', transformedData.length);
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