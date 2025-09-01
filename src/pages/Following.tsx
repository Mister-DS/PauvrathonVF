// src/pages/Following.tsx

import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Radio,
  Clock,
  Trophy,
  RefreshCw,
  AlertCircle,
  Square,
  Heart,
  Loader2,
  Play
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface PauvrathonStreamer {
  id: string;
  is_live: boolean;
  stream_title?: string;
  current_clicks: number;
  clicks_required: number;
  total_time_added: number;
  initial_duration?: number;
  status: 'live' | 'paused' | 'offline';
  profile?: {
    twitch_display_name?: string;
    twitch_username?: string;
    avatar_url?: string;
  };
}

const Following = () => {
  const { user, loading: authLoading } = useAuth();
  const [pauvrathonFollows, setPauvrathonFollows] = useState<PauvrathonStreamer[]>([]);
  const [loadingPauvrathon, setLoadingPauvrathon] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPauvrathonFollows = useCallback(async () => {
    if (!user) return;
    setLoadingPauvrathon(true);
    try {
      const { data: followData, error: followError } = await supabase
        .from('user_follows')
        .select(`
          streamers:streamers!inner (
            id,
            is_live,
            stream_title,
            current_clicks,
            clicks_required,
            total_time_added,
            initial_duration,
            status,
            profiles:profiles!inner (
              twitch_display_name,
              twitch_username,
              avatar_url
            )
          )
        `)
        .eq('follower_user_id', user.id);

      if (followError) throw followError;

      const followedStreamers = (followData || [])
        .map(f => {
          if (!f.streamers) return null;
          const streamer = f.streamers as any;
          return {
            ...streamer,
            profile: streamer.profiles
          };
        })
        .filter(Boolean) as PauvrathonStreamer[];

      const livePauvrathonStreams = followedStreamers.filter(s => s.status === 'live');

      console.log('Pauvrathon streams:', livePauvrathonStreams);
      setPauvrathonFollows(livePauvrathonStreams);

    } catch (error) {
      console.error('Erreur lors du chargement des streams Pauvrathon:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les streams Pauvrathon que vous suivez.",
        variant: "destructive",
      });
      setPauvrathonFollows([]);
    } finally {
      setLoadingPauvrathon(false);
    }
  }, [user]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPauvrathonFollows();
    setRefreshing(false);
  }, [fetchPauvrathonFollows]);

  useEffect(() => {
    if (user) {
      handleRefresh();
    }
  }, [user, handleRefresh]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold flex items-center">
            <Heart className="mr-2 h-7 w-7 text-red-500" />
            Streams suivis
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
        <p className="text-lg text-muted-foreground mb-6">
          Retrouvez ici les Pauvrathons de vos créateurs préférés.
        </p>
        
        {loadingPauvrathon ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : pauvrathonFollows.length === 0 ? (
          <div className="text-center p-8 bg-card rounded-lg border">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">
              Aucun Pauvrathon en direct parmi vos favoris
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Allez sur la page Découvrir pour trouver de nouveaux Pauvrathons.
            </p>
            <Button asChild className="mt-4">
              <Link to="/discovery">Découvrir les streams</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {pauvrathonFollows.map((stream) => (
              <Card key={stream.id} className="hover:border-primary transition-all">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* En-tête du streamer */}
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={stream.profile?.avatar_url} />
                        <AvatarFallback>
                          {stream.profile?.twitch_display_name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{stream.profile?.twitch_display_name}</h3>
                        <div className="flex items-center">
                          <span className="relative flex h-2 w-2 mr-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                          <p className="text-xs text-muted-foreground">En direct</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm line-clamp-2 leading-relaxed">
                      {stream.stream_title}
                    </p>
                    {stream.clicks_required > 0 && (
                      <div className="space-y-1">
                        <Progress value={(stream.current_clicks / stream.clicks_required) * 100} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{stream.current_clicks} / {stream.clicks_required} clics</span>
                          <span>Prochain jeu</span>
                        </div>
                      </div>
                    )}
                    <Button asChild className="w-full">
                      <Link to={`/subathon/${stream.id}`}>
                        <Play className="w-4 h-4 mr-2" />
                        Rejoindre le Pauvrathon
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Following;