import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connexion en cours...');

  useEffect(() => {
    handleTwitchCallback();
  }, []);

  const handleTwitchCallback = async () => {
    try {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      
      if (error) {
        throw new Error(`Erreur d'autorisation Twitch: ${error}`);
      }

      if (!code) {
        throw new Error('Code d\'autorisation manquant');
      }

      setMessage('Vérification avec Twitch...');

      // Call our edge function to handle the OAuth flow
      const { data, error: functionError } = await supabase.functions.invoke('twitch-auth', {
        body: {
          code,
          redirect_uri: `${window.location.origin}/auth/callback`
        }
      });

      if (functionError) {
        throw functionError;
      }

      if (!data.success) {
        throw new Error(data.error || 'Échec de l\'authentification');
      }

      setMessage('Finalisation de la connexion...');
      
      // Sign in with the credentials provided by the edge function
      if (data.credentials) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.credentials.email,
          password: data.credentials.password,
        });
        
        if (signInError) {
          throw signInError;
        }
      }
      
      // Refresh profile to get the latest user data
      await refreshProfile();
      
      setStatus('success');
      setMessage('Connexion réussie !');
      
      toast({
        title: "Bienvenue !",
        description: `Connexion réussie avec Twitch`,
      });

      // If we're in a popup, notify parent and close
      if (window.opener) {
        window.opener.postMessage({ 
          type: 'TWITCH_AUTH_SUCCESS',
          success: true
        }, window.location.origin);
        
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        // Redirect to discovery page
        setTimeout(() => {
          navigate('/decouverte');
        }, 1000);
      }

    } catch (error: any) {
      console.error('Erreur callback Twitch:', error);
      
      setStatus('error');
      setMessage('Erreur de connexion');
      
      toast({
        title: "Erreur de connexion",
        description: error.message || 'Impossible de se connecter avec Twitch.',
        variant: "destructive",
      });

      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-red-500" />}
            <span>Authentification Twitch</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">{message}</p>
          
          {status === 'loading' && (
            <div className="mt-4">
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          )}
          
          {status === 'success' && (
            <p className="mt-4 text-sm text-green-600">
              Redirection en cours...
            </p>
          )}
          
          {status === 'error' && (
            <p className="mt-4 text-sm text-muted-foreground">
              Retour à la connexion dans quelques secondes...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}