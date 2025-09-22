import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ExternalLink } from 'lucide-react';

export function SubscriptionCard() {

  const handlePayPalDonation = () => {
    // URL PayPal pour faire un don - remplace par ton lien PayPal réel
    const paypalUrl = "https://paypal.me/pauvrathon"; // Remplace par ton lien PayPal
    window.open(paypalUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Heart className="mr-2 h-5 w-5 text-red-500" />
          Soutenez Pauvrathon
        </CardTitle>
        <CardDescription>
          Faites un don pour soutenir le développement et l'hébergement de Pauvrathon !
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 border-red-200 dark:border-red-800">
          <div className="text-center space-y-3">
            <Heart className="w-12 h-12 mx-auto text-red-500" />
            <h4 className="font-semibold text-lg">Merci pour votre soutien !</h4>
            <p className="text-sm text-muted-foreground">
              Vos dons nous aident à maintenir et améliorer Pauvrathon pour toute la communauté.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Pourquoi faire un don ?</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start">
              <Heart className="w-4 h-4 mr-2 text-red-500 mt-0.5" />
              <div>
                <strong>Serveurs et infrastructure</strong>
                <p className="text-muted-foreground">Maintenir les serveurs en ligne 24/7</p>
              </div>
            </li>
            <li className="flex items-start">
              <Heart className="w-4 h-4 mr-2 text-red-500 mt-0.5" />
              <div>
                <strong>Nouvelles fonctionnalités</strong>
                <p className="text-muted-foreground">Développer de nouveaux mini-jeux et features</p>
              </div>
            </li>
            <li className="flex items-start">
              <Heart className="w-4 h-4 mr-2 text-red-500 mt-0.5" />
              <div>
                <strong>Communauté gratuite</strong>
                <p className="text-muted-foreground">Garder Pauvrathon accessible à tous</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="pt-4 border-t">
          <Button 
            onClick={handlePayPalDonation}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
          >
            <Heart className="mr-2 h-4 w-4" />
            Faire un don via PayPal
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
          
          <p className="text-xs text-center text-muted-foreground mt-2">
            Sécurisé par PayPal • Aucun montant minimum
          </p>
        </div>
      </CardContent>
    </Card>
  );
}