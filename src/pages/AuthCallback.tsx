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
    
    // Also listen for messages from popup window
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'TWITCH_AUTH_SUCCESS') {
        // Update profile immediately
        refreshProfile().then(() => {
          navigate('/decouverte');
        });
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleTwitchCallback = async () => {
    try {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      
      if (error) {
        throw new Error(`Twitch authorization error: ${error}`);
      }

      if (!code) {
        throw new Error('No authorization code received from Twitch');
      }

      setMessage('Échange du code d\'autorisation...');

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
        throw new Error(data.error || 'Authentication failed');
      }

      setMessage('Mise à jour du profil...');

      // If we got a magic link, use it to automatically sign in
      if (data.magic_link) {
        setMessage('Connexion automatique...');
        
        // Use the magic link to sign in automatically
        window.location.href = data.magic_link;
        return;
      }

      // Create manual session using the Supabase user data
      if (data.supabase_user) {
        setMessage('Finalisation de la connexion...');
        
        // Update profile first
        await refreshProfile();
        
        setStatus('success');
        setMessage('Connexion Twitch réussie !');
        
        toast({
          title: "Connexion réussie !",
          description: `Bienvenue ${data.twitch_user.display_name} !`,
        });

        // If we're in a popup, notify parent and close
        if (window.opener) {
          // Send the auth success to parent window
          window.opener.postMessage({ 
            type: 'TWITCH_AUTH_SUCCESS', 
            user: data.twitch_user,
            supabase_user: data.supabase_user
          }, window.location.origin);
          
          // Show success message briefly before closing
          setMessage('Connexion réussie ! Fermeture de la fenêtre...');
          
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          // Normal redirect (not in popup)
          setTimeout(() => {
            window.location.href = 'https://pauvrathon.lovable.app/decouverte';
          }, 1500);
        }
      } else {
        throw new Error('User authentication failed');
      }

    } catch (error: any) {
      console.error('Twitch callback error:', error);
      
      setStatus('error');
      setMessage(error.message || 'Erreur lors de la connexion Twitch');
      
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md neon-border glass-effect">
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
              Redirection vers la page de découverte...
            </p>
          )}
          
          {status === 'error' && (
            <p className="mt-4 text-sm text-muted-foreground">
              Redirection vers la page de connexion...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}