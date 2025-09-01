// src/hooks/useStreamers.ts

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

      // Correction : Utilisation d'une jointure pour récupérer directement les profils des streamers en direct
      const { data: streamersData, error: streamersError } = await supabase
        .from('streamers')
        .select(`
          *,
          profiles (
            id,
            twitch_display_name,
            twitch_username,
            avatar_url
          )
        `)
        .eq('status', 'live') // Filtre principal: seuls les Pauvrathons en direct
        .order('current_clicks', { ascending: false }); // Trie par clics pour les plus actifs

      if (streamersError) {
        throw streamersError;
      }

      if (!streamersData || streamersData.length === 0) {
        console.log('Aucun streamer Pauvrathon en direct trouvé');
        setStreamers([]);
        return;
      }

      // La jointure de Supabase ramène les données de profil sous l'objet `profiles`.
      // Nous les transformons pour qu'elles correspondent à l'interface Streamer.
      const transformedData = streamersData.map(s => {
        const profile = s.profiles as any; // Type assertion pour accéder aux propriétés
        return {
          ...s,
          profile: profile ? {
            avatar_url: profile.avatar_url,
            twitch_display_name: profile.twitch_display_name,
            twitch_username: profile.twitch_username
          } : null,
          is_live: s.status === 'live', // S'assurer que le flag is_live est correct
        };
      });

      console.log('Streamers Pauvrathon en direct chargés:', transformedData.length);
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