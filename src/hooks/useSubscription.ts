import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

export function useSubscription() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!user || !session) {
      setSubscription({ subscribed: false, subscription_tier: null, subscription_end: null });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Subscription check error:', error);
        toast({
          title: "Erreur",
          description: "Impossible de vérifier votre abonnement. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Subscription check failed:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la vérification de l'abonnement.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, session, toast]);

  const createCheckout = useCallback(async (priceId?: string) => {
    if (!user || !session) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour vous abonner.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: priceId ? { priceId } : {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Checkout creation error:', error);
        toast({
          title: "Erreur",
          description: error.message || "Impossible de créer la session de paiement.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
      } else {
        toast({
          title: "Erreur",
          description: "URL de paiement invalide.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la création du paiement.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, session, toast]);

  const openCustomerPortal = useCallback(async () => {
    if (!user || !session) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour gérer votre abonnement.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Customer portal error:', error);
        toast({
          title: "Erreur",
          description: error.message || "Impossible d'ouvrir le portail client.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        toast({
          title: "Erreur",
          description: "URL du portail client invalide.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Customer portal failed:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'ouverture du portail client.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, session, toast]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return {
    subscription,
    loading,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
}