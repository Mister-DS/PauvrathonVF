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

const TWITCH_CLIENT_ID = 'your_twitch_client_id'; // À remplacer par votre client ID Twitch
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

  const connectTwitch = () => {
    const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?` +
      `client_id=${TWITCH_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=user:read:email`;

    window.location.href = twitchAuthUrl;
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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
          
          // Check for Twitch access token in URL parameters
          const urlParams = new URLSearchParams(window.location.search);
          const twitchCode = urlParams.get('code');
          
          if (twitchCode && !twitchUser) {
            // Exchange code for access token (this would need a backend endpoint)
            // For now, we'll skip this part and assume direct token usage
          }
        } else {
          setProfile(null);
          setTwitchUser(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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