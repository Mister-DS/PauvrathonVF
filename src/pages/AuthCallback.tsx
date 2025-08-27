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
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'TWITCH_AUTH_SUCCESS') {
        // Force refresh of auth context after credentials sign-in
        if (event.data.credentials) {
          console.log('🔐 Signing in with Twitch credentials...');
          
          try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: event.data.credentials.email,
              password: event.data.credentials.password,
            });
            
            if (!signInError) {
              console.log('✅ Credentials sign-in successful');
              await refreshProfile();
              
              // Force redirect to production
              setTimeout(() => {
                window.location.replace('https://pauvrathon.lovable.app/decouverte');
              }, 1000);
              
              return;
            }
          } catch (error) {
            console.error('❌ Credentials sign-in error:', error);
          }
        }
        
        // Fallback approach
        console.log('🔄 Using fallback auth approach');
        await refreshProfile();
        
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            window.location.replace('https://pauvrathon.lovable.app/decouverte');
          }
        }, 2000);
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
      
      if (data.supabase_user) {
        setMessage('Création de la session...');
        
        // Use credentials if available to establish the session
        if (data.credentials) {
          console.log('🔑 Using credentials to establish session');
          
          try {
            console.log('🔑 Processing Twitch auth with credentials...');
            
            // Sign in directly with received credentials  
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: data.credentials.email,
              password: data.credentials.password,
            });
            
            if (signInError) {
              console.error('❌ Direct sign in failed:', signInError);
            } else {
              console.log('✅ Direct sign in successful');
              
              // Force refresh of auth context
              await refreshProfile();
              
              setStatus('success');
              setMessage('Connexion Twitch réussie !');
              
              toast({
                title: "Connexion réussie !",
                description: `Bienvenue ${data.twitch_user.display_name} !`,
              });
              
              // Redirect to discovery
              setTimeout(() => {
                window.location.href = '/decouverte';
              }, 1500);
              return;
            }
          } catch (error) {
            console.warn('Credential sign in failed:', error);
          }
        }
        
        // Update the profile
        await refreshProfile();
        
        setStatus('success');
        setMessage('Connexion Twitch réussie !');
        
        toast({
          title: "Connexion réussie !",
          description: `Bienvenue ${data.twitch_user.display_name} !`,
        });

        // If we're in a popup, notify parent and close
        if (window.opener) {
          console.log('🚪 Notifying parent window of successful auth');
          
          // Send the auth success to parent window with credentials
          window.opener.postMessage({ 
            type: 'TWITCH_AUTH_SUCCESS', 
            user: data.twitch_user,
            supabase_user: data.supabase_user,
            credentials: data.credentials,
            success: true
          }, '*');
          
          // Show success message briefly before closing
          setMessage('Connexion réussie ! Fermeture de la fenêtre...');
          
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          // Normal redirect - force to production URL
          console.log('🔄 Direct redirect to production site');
          setTimeout(() => {
            window.location.replace('https://pauvrathon.lovable.app/decouverte');
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