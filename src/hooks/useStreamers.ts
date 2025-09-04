// src/hooks/useStreamers.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Streamer } from '@/types';
import { toast } from './use-toast';

// Définition d'un type pour la donnée brute renvoyée par Supabase
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
      console.log('🔄 Début du chargement des streamers...');

      // Première approche : essayer avec inner join
      let { data: streamersData, error: streamersError } = await supabase
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

      // Si l'inner join échoue, essayer avec un left join
      if (streamersError || !streamersData) {
        console.log('⚠️ Inner join failed, trying left join...', streamersError);
        
        const { data: streamersDataLeft, error: streamersErrorLeft } = await supabase
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
          .order('current_clicks', { ascending: false });

        streamersData = streamersDataLeft;
        streamersError = streamersErrorLeft;
      }

      // Si les deux approches échouent, essayer sans les profils
      if (streamersError || !streamersData) {
        console.log('⚠️ Both joins failed, trying without profiles...', streamersError);
        
        const { data: streamersOnly, error: streamersOnlyError } = await supabase
          .from('streamers')
          .select('*')
          .order('current_clicks', { ascending: false });

        if (streamersOnlyError) {
          throw streamersOnlyError;
        }

        // Récupérer les profils séparément
        const streamerIds = streamersOnly?.map(s => s.user_id).filter(Boolean) || [];
        let profilesData = [];
        
        if (streamerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, twitch_display_name, twitch_username, avatar_url')
            .in('id', streamerIds);
          
          profilesData = profiles || [];
        }

        // Combiner manuellement les données
        streamersData = streamersOnly?.map(streamer => {
          const profile = profilesData.find(p => p.id === streamer.user_id);
          return {
            ...streamer,
            profiles: profile || null
          };
        }) || [];

        console.log('✅ Streamers récupérés sans join:', streamersData.length);
      }

      if (streamersError) {
        throw streamersError;
      }

      console.log('📊 Données brutes reçues:', {
        count: streamersData?.length || 0,
        firstStreamer: streamersData?.[0] || null
      });

      if (!streamersData || streamersData.length === 0) {
        console.log('ℹ️ Aucun streamer Pauvrathon trouvé');
        setStreamers([]);
        return;
      }

      const transformedData = streamersData.map(s => {
        const profile = s.profiles;
        const transformed = {
          ...s,
          profile: profile ? {
            avatar_url: profile.avatar_url,
            twitch_display_name: profile.twitch_display_name,
            twitch_username: profile.twitch_username
          } : null,
          is_live: s.status === 'live' || s.status === 'paused',
        };
        
        console.log(`👤 Streamer transformé ${s.id}:`, {
          status: s.status,
          is_live: transformed.is_live,
          profile: !!profile
        });
        
        return transformed;
      });

      console.log('✅ Streamers Pauvrathon chargés:', transformedData.length);
      setStreamers(transformedData as Streamer[]);

    } catch (error) {
      console.error('❌ Erreur lors du chargement des streamers:', error);
      
      // Log plus détaillé de l'erreur
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      
      toast({
        title: 'Erreur',
        description: `Impossible de charger les streamers: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        variant: 'destructive',
      });
      setStreamers([]);
    } finally {
      setLoading(false);
      console.log('🏁 Chargement des streamers terminé');
    }
  }, []);

  useEffect(() => {
    console.log('🚀 Initialisation du hook useStreamers');
    fetchStreamers();

    // Souscription aux changements temps réel avec gestion d'erreur
    const subscription = supabase
      .channel('public:streamers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'streamers' },
        (payload) => {
          console.log('🔄 Mise à jour temps réel streamers:', payload);
          fetchStreamers();
        }
      )
      .subscribe((status) => {
        console.log('📡 Statut souscription temps réel:', status);
      });

    return () => {
      console.log('🧹 Nettoyage de la souscription');
      supabase.removeChannel(subscription);
    };
  }, [fetchStreamers]);

  return { 
    streamers, 
    loading, 
    refetch: useCallback(() => {
      console.log('🔄 Refetch manuel des streamers');
      fetchStreamers();
    }, [fetchStreamers])
  };
}