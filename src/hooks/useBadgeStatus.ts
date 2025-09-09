import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BadgeStatus {
  has_active_badge: boolean;
  current_month_badge: boolean;
  badge_expires_at: string | null;
}

export function useBadgeStatus() {
  const { user } = useAuth();
  const [badgeStatus, setBadgeStatus] = useState<BadgeStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const checkBadgeStatus = useCallback(async () => {
    if (!user) {
      setBadgeStatus({
        has_active_badge: false,
        current_month_badge: false,
        badge_expires_at: null,
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_badge_status', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Badge status check error:', error);
        return;
      }

      if (data && data.length > 0) {
        setBadgeStatus(data[0]);
      }
    } catch (error) {
      console.error('Badge status check failed:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getUserBadges = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('monthly_badges')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user badges:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch user badges:', error);
      return [];
    }
  }, [user]);

  useEffect(() => {
    checkBadgeStatus();
  }, [checkBadgeStatus]);

  return {
    badgeStatus,
    loading,
    checkBadgeStatus,
    getUserBadges,
  };
}