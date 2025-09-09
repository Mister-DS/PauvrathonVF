import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, CreditCard, Settings, AlertCircle, Check } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useBadgeStatus } from '@/hooks/useBadgeStatus';
import { SubscriptionBadge } from './SubscriptionBadge';

export function SubscriptionCard() {
  const { subscription, loading, createCheckout, openCustomerPortal } = useSubscription();
  const { badgeStatus } = useBadgeStatus();

  const isSubscribed = subscription?.subscribed || false;

  if (loading && !subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Crown className="mr-2 h-5 w-5 text-yellow-500" />
            Abonnement Premium
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-4">Vérification de votre abonnement...</p>
        </CardContent>
      </Card>
    );
  }

  if (isSubscribed) {
    return (
      <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-50/50 to-amber-50/50 dark:from-yellow-950/20 dark:to-amber-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-yellow-700 dark:text-yellow-400">
              <Crown className="mr-2 h-5 w-5" />
              Abonnement Premium Actif
            </CardTitle>
            <Badge className="bg-green-500 text-white">
              <Check className="w-3 h-3 mr-1" />
              Actif
            </Badge>
          </div>
          <CardDescription>
            Vous profitez actuellement de tous les avantages premium de Pauvrathon !
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {badgeStatus?.has_active_badge && (
            <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center">
                <Star className="w-4 h-4 mr-2 text-yellow-500" />
                Votre Badge
              </h4>
              <SubscriptionBadge variant="full" />
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-semibold">Avantages Premium :</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2 text-green-500" />
                Badge mensuel exclusif
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2 text-green-500" />
                Accès prioritaire aux nouvelles fonctionnalités
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 mr-2 text-green-500" />
                Support premium
              </li>
            </ul>
          </div>

          {subscription?.subscription_end && (
            <p className="text-sm text-muted-foreground">
              Prochain renouvellement le{' '}
              {new Date(subscription.subscription_end).toLocaleDateString('fr-FR')}
            </p>
          )}

          <Button 
            onClick={openCustomerPortal}
            variant="outline"
            disabled={loading}
            className="w-full"
          >
            <Settings className="mr-2 h-4 w-4" />
            Gérer mon abonnement
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Crown className="mr-2 h-5 w-5 text-yellow-500" />
          Abonnement Premium
        </CardTitle>
        <CardDescription>
          Obtenez un badge mensuel et soutenez le développement de Pauvrathon !
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-4 h-4 mr-2 text-blue-500" />
            <span className="font-semibold text-sm">Configuration en cours</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Le système d'abonnement Stripe est en cours de configuration. 
            Les paiements seront disponibles une fois les clés API configurées.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Avantages Premium :</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start">
              <Crown className="w-4 h-4 mr-2 text-yellow-500 mt-0.5" />
              <div>
                <strong>Badge mensuel exclusif</strong>
                <p className="text-muted-foreground">Affichez votre soutien avec un badge doré visible sur votre profil</p>
              </div>
            </li>
            <li className="flex items-start">
              <Star className="w-4 h-4 mr-2 text-blue-500 mt-0.5" />
              <div>
                <strong>Accès prioritaire</strong>
                <p className="text-muted-foreground">Soyez les premiers à tester les nouvelles fonctionnalités</p>
              </div>
            </li>
            <li className="flex items-start">
              <CreditCard className="w-4 h-4 mr-2 text-green-500 mt-0.5" />
              <div>
                <strong>Support premium</strong>
                <p className="text-muted-foreground">Support prioritaire et assistance dédiée</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold">Prix : 4,99€/mois</p>
              <p className="text-sm text-muted-foreground">Annulation possible à tout moment</p>
            </div>
          </div>

          <Button 
            onClick={() => createCheckout()}
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
          >
            <Crown className="mr-2 h-4 w-4" />
            {loading ? 'Configuration...' : 'Devenir Premium'}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground mt-2">
            Système sécurisé par Stripe
          </p>
        </div>
      </CardContent>
    </Card>
  );
}