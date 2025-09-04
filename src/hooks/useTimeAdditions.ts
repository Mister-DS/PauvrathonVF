import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TimeAddition } from '@/types';

export function useTimeAdditions(streamerId?: string) {
  const [timeAdditions, setTimeAdditions] = useState<TimeAddition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Récupérer les additions de temps existantes
  useEffect(() => {
    if (!streamerId) {
      setLoading(false);
      return;
    }

    const fetchTimeAdditions = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('time_additions')
          .select('*')
          .eq('streamer_id', streamerId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Erreur récupération time_additions:', error);
          setError(error.message);
          return;
        }

        setTimeAdditions(data || []);
        setError(null);
      } catch (err) {
        console.error('Erreur inattendue:', err);
        setError('Une erreur inattendue est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeAdditions();
  }, [streamerId]);

  // Ajouter une nouvelle addition de temps (callback pour realtime)
  const addTimeAddition = (newTimeAddition: TimeAddition) => {
    setTimeAdditions(prev => [newTimeAddition, ...prev.slice(0, 49)]); // Garder seulement les 50 dernières
  };

  // Calculer le temps total ajouté
  const totalTimeAdded = timeAdditions.reduce((total, addition) => {
    return total + (addition.time_seconds || 0);
  }, 0);

  // Compter les événements par type
  const eventCounts = timeAdditions.reduce((counts, addition) => {
    const type = addition.event_type || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  return {
    timeAdditions,
    loading,
    error,
    totalTimeAdded,
    eventCounts,
    addTimeAddition
  };
}