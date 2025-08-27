import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Twitch, Loader2 } from 'lucide-react';

export default function Auth() {
  const { user, connectTwitch, refreshProfile, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/decouverte" replace />;
  }

  // Also listen for auth success messages
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data && event.data.type === 'TWITCH_AUTH_SUCCESS') {
        console.log('🎉 Auth success received from popup!', event.data);
        
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
        
        // Force refresh of auth context to establish session
        console.log('🔄 Refreshing auth context...');
        await refreshProfile();
        
        // Wait a moment for session to be established
        setTimeout(async () => {
          console.log('🔍 Checking final session status...');
          const { data: { session } } = await supabase.auth.getSession();
          console.log('📊 Final session after refresh:', session ? 'FOUND' : 'NOT FOUND');
          
          // Force immediate redirect to production URL
          console.log('🚀 Forcing redirect to production site');
          window.location.replace('https://pauvrathon.lovable.app/decouverte');
        }, 1500);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refreshProfile, navigate]);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signUp(email, password);
    
    if (error) {
      toast({
        title: "Erreur d'inscription",
        description: error.message || "Une erreur est survenue lors de l'inscription.",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Erreur de connexion",
        description: error.message || "Email ou mot de passe incorrect.",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md neon-border glass-effect">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Rejoindre Pauvrathon</CardTitle>
          <CardDescription>
            Connectez-vous pour participer aux subathons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={connectTwitch}
              className="w-full neon-glow pulse-neon"
              size="lg"
              disabled={loading}
            >
              <Twitch className="mr-2 h-5 w-5" />
              Connexion avec Twitch
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou continuez avec
                </span>
              </div>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Se connecter
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleEmailSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    S'inscrire
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
        
        
      </Card>
    </div>
  );
}