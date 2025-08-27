import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, TwitchUser } from '@/types';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  twitchUser: TwitchUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  connectTwitch: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [twitchUser, setTwitchUser] = useState<TwitchUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        return;
      }
      
      setProfile(data);
    } catch (error) {
      // Error handled silently
    }
  };

  const fetchTwitchUserData = async (accessToken: string) => {
    try {
      const clientId = await fetchTwitchClientId();
      if (!clientId) return null;
      
      const response = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': clientId,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch Twitch user data');
      
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const twitchUserData: TwitchUser = {
          id: data.data[0].id,
          login: data.data[0].login,
          display_name: data.data[0].display_name,
          profile_image_url: data.data[0].profile_image_url,
          email: data.data[0].email,
        };
        setTwitchUser(twitchUserData);
        return twitchUserData;
      }
    } catch (error) {
      // Error handled silently
    }
    return null;
  };

  const createOrUpdateProfile = async (user: User, twitchData?: TwitchUser) => {
    try {
      const profileData = {
        user_id: user.id,
        twitch_id: twitchData?.id,
        twitch_username: twitchData?.login,
        twitch_display_name: twitchData?.display_name,
        avatar_url: twitchData?.profile_image_url,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) {
        return;
      }

      await fetchProfile(user.id);
    } catch (error) {
      // Error handled silently
    }
  };

  const connectTwitch = async () => {
    try {
      const clientId = await fetchTwitchClientId();
      
      if (!clientId) {
        toast({
          title: "Erreur",
          description: "Impossible de récupérer le Client ID Twitch.",
          variant: "destructive",
        });
        return;
      }
      
      // Utilise localhost en développement  
      const isLocalhost = window.location.hostname === 'localhost';
      const redirectUri = isLocalhost 
        ? 'http://localhost:5173/auth/callback'
        : `${window.location.origin}/auth/callback`;
      
      const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=user:read:email&` +
        `force_verify=true`;

      // Try different methods to escape the sandboxed iframe
      try {
        // Method 1: Try window.top (we know this fails)
        if (window.top && window.top !== window) {
          window.top.location.href = twitchAuthUrl;
        }
      } catch (error) {
        // Method 2: Use window.open in a new tab
        const popup = window.open(twitchAuthUrl, '_blank', 'width=600,height=700,scrollbars=yes,resizable=yes');
        
        if (popup) {
          toast({
            title: "Redirection Twitch",
            description: "Une nouvelle fenêtre s'est ouverte pour l'authentification Twitch.",
          });
          
          // Monitor when popup closes and refresh the page
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              
              // Wait a bit for auth to process, then check
              setTimeout(async () => {
                await refreshProfile();
                
                // Check if we have a session now
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                  window.location.href = '/decouverte';
                } else {
                  toast({
                    title: "Connexion échouée",
                    description: "Veuillez réessayer la connexion Twitch.",
                    variant: "destructive",
                  });
                }
              }, 1000);
            }
          }, 1000);
          
        } else {
          // Method 3: Create a link and click it
          const link = document.createElement('a');
          link.href = twitchAuthUrl;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          toast({
            title: "Authentification Twitch",
            description: "Cliquez sur le lien si une nouvelle fenêtre ne s'ouvre pas automatiquement.",
          });
        }
      }
      
    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: `Erreur: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const fetchTwitchClientId = async () => {
    try {
      const response = await supabase.functions.invoke('twitch-client-id');
      
      if (response.error) {
        throw response.error;
      }
      
      if (!response.data || !response.data.client_id) {
        throw new Error('No client_id in response');
      }
      
      return response.data.client_id;
      
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la configuration Twitch.",
        variant: "destructive",
      });
      return null;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
      setProfile(null);
      setTwitchUser(null);
      
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la déconnexion.",
        variant: "destructive",
      });
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
          
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener  
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid blocking the auth callback
          setTimeout(() => {
            if (mounted) {
              fetchProfile(session.user.id);
            }
          }, 0);
        } else {
          setProfile(null);
          setTwitchUser(null);
        }
        
        setLoading(false);
      }
    );

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    profile,
    twitchUser,
    loading,
    signOut,
    refreshProfile,
    connectTwitch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}