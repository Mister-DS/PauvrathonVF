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
  signUp: (email: string, password: string) => Promise<{ error?: any }>;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
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
      console.log('📋 Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching profile:', error);
        return;
      }
      
      if (data) {
        console.log('✅ Profile found:', data.twitch_username || data.user_id);
        setProfile(data);
        
        // Set Twitch user data if available
        if (data.twitch_id) {
          setTwitchUser({
            id: data.twitch_id,
            login: data.twitch_username,
            display_name: data.twitch_display_name,
            profile_image_url: data.avatar_url,
            email: user?.email,
          });
        }
      } else {
        // Create a basic profile if none exists
        console.log('📝 Creating basic profile for user');
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
          });
        
        if (!createError) {
          await fetchProfile(userId);
        }
      }
    } catch (error) {
      console.error('💥 Error in fetchProfile:', error);
    }
  };

  const connectTwitch = async () => {
    console.log('🚀 Starting Twitch connection flow');
    
    try {
      console.log('📞 Fetching Twitch Client ID...');
      const { data: clientIdData, error: clientIdError } = await supabase.functions.invoke('twitch-client-id');
      
      if (clientIdError || !clientIdData?.client_id) {
        console.error('❌ Failed to get client ID:', clientIdError);
        toast({
          title: "Erreur",
          description: "Impossible de récupérer la configuration Twitch.",
          variant: "destructive",
        });
        return;
      }
      
      const clientId = clientIdData.client_id;
      console.log('✅ Client ID retrieved');
      
      const redirectUri = `${window.location.origin}/auth/callback`;
      console.log('🔄 Redirect URI:', redirectUri);
      
      const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=user:read:email&` +
        `force_verify=true`;

      console.log('🔗 Opening Twitch auth URL');

      // Open popup for auth
      const popup = window.open(twitchAuthUrl, 'twitchAuth', 'width=600,height=700,scrollbars=yes,resizable=yes');
      
      if (popup) {
        console.log('✅ Popup opened successfully');
        toast({
          title: "Redirection Twitch",
          description: "Une nouvelle fenêtre s'est ouverte pour l'authentification.",
        });
        
        // Monitor popup for completion
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            console.log('🔄 Popup closed, checking auth status...');
            clearInterval(checkClosed);
            
            // Refresh to check auth status
            setTimeout(async () => {
              console.log('🔍 Refreshing auth state...');
              const { data: { session } } = await supabase.auth.getSession();
              
              if (session) {
                console.log('✅ Session found after popup');
                setSession(session);
                setUser(session.user);
                await fetchProfile(session.user.id);
                
                toast({
                  title: "Connexion réussie !",
                  description: "Vous êtes maintenant connecté avec Twitch.",
                });
                
                // Redirect to discovery
                window.location.href = '/decouverte';
              }
            }, 1000);
          }
        }, 1000);
      } else {
        // Fallback to direct redirect
        console.log('⚠️ Popup blocked, using direct redirect');
        window.location.href = twitchAuthUrl;
      }
      
    } catch (error: any) {
      console.error('💥 Error in connectTwitch:', error);
      toast({
        title: "Erreur de connexion",
        description: `Erreur: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const signUp = async (email: string, password: string) => {
    console.log('📝 Signing up user:', email);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/decouverte`
        }
      });
      
      if (error) {
        console.error('❌ Sign up error:', error);
        return { error };
      }
      
      console.log('✅ Sign up successful');
      toast({
        title: "Inscription réussie !",
        description: "Vérifiez votre email pour confirmer votre compte.",
      });
      
      return {};
    } catch (error) {
      console.error('💥 Sign up exception:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Signing in user:', email);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        return { error };
      }
      
      console.log('✅ Sign in successful');
      toast({
        title: "Connexion réussie !",
        description: "Vous êtes maintenant connecté.",
      });
      
      return {};
    } catch (error) {
      console.error('💥 Sign in exception:', error);
      return { error };
    }
  };

  const signOut = async () => {
    console.log('🚪 Signing out user');
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear state
      setUser(null);
      setSession(null);
      setProfile(null);
      setTwitchUser(null);
      
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès.",
      });
    } catch (error) {
      console.error('❌ Sign out error:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la déconnexion.",
        variant: "destructive",
      });
    }
  };

  const refreshProfile = async () => {
    if (user) {
      console.log('🔄 Refreshing profile for user:', user.id);
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔍 Initializing auth state...');
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
        }
        
        console.log('📊 Initial session:', session ? `User: ${session.user.email}` : 'No session');
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            console.log('👤 Fetching profile for authenticated user');
            try {
              await fetchProfile(session.user.id);
            } catch (profileError) {
              console.error('❌ Error fetching profile:', profileError);
            }
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener  
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session ? `Session for: ${session.user.email}` : 'No session');
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 User signed in, fetching profile...');
          // Use setTimeout to avoid blocking the auth callback
          setTimeout(() => {
            if (mounted) {
              fetchProfile(session.user.id);
            }
          }, 0);
        } else {
          console.log('👤 User signed out, clearing profile data');
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
    signUp,
    signIn,
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