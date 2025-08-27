import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from './use-toast';

export function useStreamUpdates() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);

  const updateStreamInfo = async () => {
    if (isUpdatingRef.current) {
      return;
    }

    isUpdatingRef.current = true;

    try {
      const response = await supabase.functions.invoke('update-stream-info');
      
      if (response.error) {
        throw response.error;
      }
      
    } catch (error) {
      console.error('❌ Error updating stream info:', error);
      toast({
        title: "Erreur mise à jour",
        description: "Impossible de mettre à jour les informations des streams.",
        variant: "destructive",
      });
    } finally {
      isUpdatingRef.current = false;
    }
  };

  useEffect(() => {
    // Initial update
    updateStreamInfo();

    // Set up interval to update every 12 minutes
    intervalRef.current = setInterval(() => {
      updateStreamInfo();
    }, 12 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { updateStreamInfo };
}