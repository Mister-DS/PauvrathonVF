import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Streamer } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from './use-toast';

export function useFollowedStreamers() {
  const { user } = useAuth();
  const [followedStreamers, setFollowedStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchFollowedStreamers = async (force: boolean = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    const timeSinceLastFetch = now - lastFetch;
    
    // Only fetch if forced or more than 5 minutes have passed
    if (!force && timeSinceLastFetch < 5 * 60 * 1000 && followedStreamers.length > 0) {
      return;
    }

    try {
      setLoading(true);
      
      // Call our edge function to get Twitch follows
      const { data: twitchFollowsResponse, error: twitchError } = await supabase.functions.invoke('get-twitch-follows')
      
      if (twitchError) {
        console.error('Twitch follows error:', twitchError);
        // Fallback to local follows if Twitch API fails
        const { data: followsData, error: followsError } = await supabase
          .from('user_follows')
          .select('streamer_id')
          .eq('follower_user_id', user.id);

        if (followsError) throw followsError;
        
        if (!followsData || followsData.length === 0) {
          setFollowedStreamers([]);
          setLastFetch(now);
          return;
        }

        const streamerIds = followsData.map(follow => follow.streamer_id);
        
        const { data: streamersData, error: streamersError } = await supabase
          .from('streamers')
          .select(`
            *,
            profiles(*)
          `)
          .in('id', streamerIds);

        if (streamersError) throw streamersError;
        
        const streamersWithProfile = (streamersData || []).map(streamer => ({
          ...streamer,
          profile: Array.isArray(streamer.profiles) ? streamer.profiles[0] : null
        }));
        
        setFollowedStreamers(streamersWithProfile as unknown as Streamer[]);
      } else {
        // Use Twitch follows data
        setFollowedStreamers(twitchFollowsResponse.streamers as unknown as Streamer[]);
      }
      
      setLastFetch(now);
      
    } catch (error) {
      console.error('Error fetching followed streamers:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos streamers suivis.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFollowedStreamers(true); // Force initial fetch
      
      // Set up interval to refresh every 5 minutes
      const interval = setInterval(() => {
        fetchFollowedStreamers(true);
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [user]);

  // Separate online and offline streamers
  const liveStreamers = followedStreamers.filter(streamer => streamer.is_live);
  const offlineStreamers = followedStreamers.filter(streamer => !streamer.is_live);

  return { 
    followedStreamers, 
    liveStreamers, 
    offlineStreamers, 
    loading, 
    refetch: () => fetchFollowedStreamers(true) 
  };
}