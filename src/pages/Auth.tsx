import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, Check } from 'lucide-react';

export default function Auth() {
  const { user, connectTwitch } = useAuth();
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/decouverte" replace />;
  }

  const handleTwitchLogin = async () => {
    setLoading(true);
    try {
      await connectTwitch();
    } catch (error) {
      console.error('Erreur connexion Twitch:', error);
      toast({
        title: "Erreur de connexion",
        description: "Impossible de se connecter avec Twitch. Veuillez réessayer.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="text-center p-8 pb-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-white fill-current" viewBox="0 0 24 24">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Connexion à Pauvrathon</h2>
          <p className="text-muted-foreground">Connectez-vous avec votre compte Twitch pour accéder à toutes les fonctionnalités</p>
        </div>

        {/* Twitch Login Button */}
        <div className="px-8 pb-6">
          <Button
            onClick={handleTwitchLogin}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-xl text-base transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                <svg className="mr-3 h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                </svg>
                <span>Se connecter avec Twitch</span>
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6">
          <p className="text-xs text-muted-foreground text-center mb-6">
            En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité
          </p>
        </div>

        {/* Benefits List */}
        <div className="px-8 pb-8 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">Synchronisation automatique avec votre profil Twitch</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">Accès aux fonctionnalités communautaires</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">Connexion sécurisée et rapide</span>
          </div>
        </div>
      </div>
    </div>
  );
}