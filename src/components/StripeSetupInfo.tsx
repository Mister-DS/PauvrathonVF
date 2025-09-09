import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Key, Webhook, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

export function StripeSetupInfo() {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Configuration Stripe - Guide d'installation
        </CardTitle>
        <CardDescription>
          Instructions pour configurer le système d'abonnement Premium avec Stripe
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cette configuration est nécessaire pour activer les abonnements Premium et les badges mensuels.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-1">
          {/* Étape 1: Clés API */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">1</Badge>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-500" />
                Configuration des clés API Stripe
              </h3>
            </div>
            
            <div className="pl-8 space-y-3">
              <p className="text-sm text-muted-foreground">
                Ajoutez vos clés Stripe dans les secrets des Edge Functions :
              </p>
              
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-sm">STRIPE_SECRET_KEY</code>
                  <Badge variant="destructive">Requis</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Votre clé secrète Stripe (commence par sk_test_ ou sk_live_)
                </p>
                
                <div className="flex items-center justify-between">
                  <code className="text-sm">STRIPE_WEBHOOK_SECRET</code>
                  <Badge variant="secondary">Optionnel</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Secret du webhook pour valider les événements Stripe
                </p>

                <div className="flex items-center justify-between">
                  <code className="text-sm">STRIPE_PRICE_ID</code>
                  <Badge variant="secondary">Optionnel</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  ID du prix par défaut pour l'abonnement (commence par price_)
                </p>
              </div>

              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  Trouvez vos clés sur{' '}
                  <a 
                    href="https://dashboard.stripe.com/apikeys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                  >
                    dashboard.stripe.com/apikeys
                  </a>
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Étape 2: Prix */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">2</Badge>
              <h3 className="text-lg font-semibold">Créer un produit et prix récurrent</h3>
            </div>
            
            <div className="pl-8 space-y-3">
              <p className="text-sm text-muted-foreground">
                Créez un produit avec abonnement mensuel sur votre tableau de bord Stripe :
              </p>
              
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Allez dans Produits → Ajouter un produit</li>
                <li>Nommez votre produit (ex: "Abonnement Premium Pauvrathon")</li>
                <li>Choisissez "Prix récurrent" → "Mensuel"</li>
                <li>Définissez le prix (ex: 4,99€)</li>
                <li>Copiez l'ID du prix (commence par price_)</li>
              </ol>
              
              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  Gérez vos produits sur{' '}
                  <a 
                    href="https://dashboard.stripe.com/products" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                  >
                    dashboard.stripe.com/products
                  </a>
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Étape 3: Webhook */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">3</Badge>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Webhook className="h-5 w-5 text-purple-500" />
                Configuration du Webhook (Optionnel)
              </h3>
            </div>
            
            <div className="pl-8 space-y-3">
              <p className="text-sm text-muted-foreground">
                Pour la gestion automatique des badges lors des événements Stripe :
              </p>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">URL du webhook :</p>
                <code className="text-xs bg-background p-2 rounded block">
                  https://pylbfjbfhaulpzrzsosc.supabase.co/functions/v1/stripe-webhook
                </code>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Événements à écouter :</p>
                <ul className="text-sm space-y-1">
                  <li>• <code>customer.subscription.created</code></li>
                  <li>• <code>customer.subscription.updated</code></li>
                  <li>• <code>customer.subscription.deleted</code></li>
                  <li>• <code>invoice.payment_succeeded</code></li>
                </ul>
              </div>

              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  Configurez les webhooks sur{' '}
                  <a 
                    href="https://dashboard.stripe.com/webhooks" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                  >
                    dashboard.stripe.com/webhooks
                  </a>
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* État actuel */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              État de la configuration
            </h3>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Base de données</span>
                <Badge className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Configurée
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Edge Functions</span>
                <Badge className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Déployées
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Clés Stripe</span>
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  À configurer
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Webhook</span>
                <Badge variant="secondary">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Optionnel
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}