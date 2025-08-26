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

const TWITCH_CLIENT_ID = 'your_twitch_client_id'; // Sera remplacé par la vraie clé
const REDIRECT_URI = `${window.location.origin}/auth/callback`;

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
        console.error('Error fetching profile:', error);
        return;
      }
      
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchTwitchUserData = async (accessToken: string) => {
    try {
      const response = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': TWITCH_CLIENT_ID,
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
      console.error('Error fetching Twitch user data:', error);
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
        console.error('Error creating/updating profile:', error);
        return;
      }

      await fetchProfile(user.id);
    } catch (error) {
      console.error('Error creating/updating profile:', error);
    }
  };

  const connectTwitch = async () => {
    console.log('🚀 Starting Twitch connection...');
    
    try {
      console.log('📞 Fetching Twitch Client ID...');
      const clientId = await fetchTwitchClientId();
      console.log('🔑 Client ID received:', clientId ? 'SUCCESS' : 'FAILED');
      
      if (!clientId) {
        console.error('❌ No client ID - aborting');
        toast({
          title: "Erreur",
          description: "Impossible de récupérer le Client ID Twitch.",
          variant: "destructive",
        });
        return;
      }
      
      // Utilise l'URL actuelle pour la redirection
      const currentOrigin = window.location.origin;
      const redirectUri = `${currentOrigin}/auth/callback`;
      
      console.log('🌍 Current origin:', currentOrigin);
      console.log('🔄 Redirect URI:', redirectUri);
      
      const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=user:read:email&` +
        `force_verify=true`;

      console.log('🔗 Full Twitch auth URL:', twitchAuthUrl);
      console.log('🏃‍♂️ Attempting redirect...');
      
      // Test if we can access window.location
      console.log('🪟 Current window.location.href:', window.location.href);
      
      // Try different methods to escape the sandboxed iframe
      try {
        // Method 1: Try window.top (we know this fails)
        if (window.top && window.top !== window) {
          console.log('🚀 Trying window.top.location.href');
          window.top.location.href = twitchAuthUrl;
        }
      } catch (error) {
        console.log('❌ window.top failed:', error.message);
        
        // Method 2: Use window.open in a new tab
        console.log('🆕 Using window.open as fallback');
        const popup = window.open(twitchAuthUrl, '_blank', 'width=600,height=700,scrollbars=yes,resizable=yes');
        
        if (popup) {
          console.log('✅ Popup opened successfully');
          toast({
            title: "Redirection Twitch",
            description: "Une nouvelle fenêtre s'est ouverte pour l'authentification Twitch.",
          });
          
          // Monitor when popup closes and refresh the page
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              console.log('🔄 Popup closed, checking auth status...');
              clearInterval(checkClosed);
              
              // Wait a bit for auth to process, then check
              setTimeout(async () => {
                console.log('🔍 Checking if user is now authenticated...');
                await refreshProfile();
                
                // Check if we have a session now
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                  console.log('✅ User is authenticated, redirecting to discovery');
                  window.location.href = '/decouverte';
                } else {
                  console.log('❌ User not authenticated, staying on auth page');
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
          console.log('❌ Popup blocked');
          
          // Method 3: Create a link and click it
          console.log('🔗 Creating link as final fallback');
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
      
      // This should not execute if redirect works
      console.log('⚠️ Still here after redirect attempt');
      
    } catch (error) {
      console.error('💥 Error in connectTwitch:', error);
      toast({
        title: "Erreur de connexion",
        description: `Erreur: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const fetchTwitchClientId = async () => {
    console.log('🔍 fetchTwitchClientId called...');
    try {
      console.log('📡 Calling supabase function...');
      const response = await supabase.functions.invoke('twitch-client-id');
      
      console.log('📨 Supabase response:', response);
      
      if (response.error) {
        console.error('❌ Supabase function error:', response.error);
        throw response.error;
      }
      
      if (!response.data || !response.data.client_id) {
        console.error('❌ No client_id in response data:', response.data);
        throw new Error('No client_id in response');
      }
      
      console.log('✅ Client ID retrieved successfully:', response.data.client_id);
      return response.data.client_id;
      
    } catch (error) {
      console.error('💥 Error fetching Twitch Client ID:', error);
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
      console.error('Error signing out:', error);
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
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener  
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
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