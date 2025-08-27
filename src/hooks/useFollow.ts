import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function useFollow(streamerId: string) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  // Check if user is following this streamer
  useEffect(() => {
    if (user && streamerId) {
      checkFollowStatus();
      fetchFollowersCount();
    }
  }, [user, streamerId]);

  const checkFollowStatus = async () => {
    if (!user || !streamerId) return;

    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_user_id', user.id)
        .eq('streamer_id', streamerId)
        .single();

      if (!error && data) {
        setIsFollowing(true);
      } else {
        setIsFollowing(false);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const fetchFollowersCount = async () => {
    if (!streamerId) return;

    try {
      const { count, error } = await supabase
        .from('user_follows')
        .select('id', { count: 'exact' })
        .eq('streamer_id', streamerId);

      if (!error && count !== null) {
        setFollowersCount(count);
      }
    } catch (error) {
      console.error('Error fetching followers count:', error);
    }
  };

  const toggleFollow = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour suivre un streamer.",
        variant: "destructive",
      });
      return;
    }

    if (!streamerId) return;

    setLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_user_id', user.id)
          .eq('streamer_id', streamerId);

        if (error) throw error;

        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        
        toast({
          title: "Désabonné",
          description: "Vous ne suivez plus ce streamer.",
        });
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_user_id: user.id,
            streamer_id: streamerId,
          });

        if (error) throw error;

        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        
        toast({
          title: "Suivi ajouté",
          description: "Vous suivez maintenant ce streamer !",
        });
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le suivi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    isFollowing,
    loading,
    followersCount,
    toggleFollow,
  };
}