import { Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navigation } from '@/components/Navigation';
import { FollowButton } from '@/components/FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Users, Clock, Gamepad2, Radio, Power, Tv, Trophy, RefreshCw, AlertCircle, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  profile_image_url: string;
}

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  followed_at?: string;
}

interface PauvrathonStreamer {
  id: string;
  user_id: string;
  status: 'live' | 'paused' | 'offline' | 'ended';
  time_increment: number;
  clicks_required: number;
  current_clicks: number;
  total_time_added: number;
  stream_title?: string;
  active_minigames: string[];
  initial_duration: number;
  profiles?: {
    twitch_username?: string;
    twitch_display_name?: string;
    avatar_url?: string;
    twitch_id?: string;
  };
  profile?: {
    twitch_username?: string;
    twitch_display_name?: string;
    avatar_url?: string;
    twitch_id?: string;
  };
}

export default function Following() {
  const { user } = useAuth();
  const [twitchLiveStreamers, setTwitchLiveStreamers] = useState<TwitchStream[]>([]);
  const [pauvrathonStreamers, setPauvrathonStreamers] = useState<PauvrathonStreamer[]>([]);
  const [loadingTwitch, setLoadingTwitch] = useState(true);
  const [loadingPauvrathon, setLoadingPauvrathon] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchTwitchLiveStreamers();
    fetchPauvrathonStreamers();
  }, [user]);

  const fetchTwitchLiveStreamers = async () => {
    if (!user) return;

    try {
      setLoadingTwitch(true);
      
      // Temporairement désactivé en raison des erreurs CORS
      console.log('Section Twitch temporairement désactivée');
      setTwitchLiveStreamers([]);
      
    } catch (error) {
      console.error('Erreur récupération streams Twitch:', error);
      setTwitchLiveStreamers([]);
    } finally {
      setLoadingTwitch(false);
    }
  };

  const fetchPauvrathonStreamers = async () => {
    if (!user) return;

    try {
      setLoadingPauvrathon(true);
      
      // Récupérer les IDs des streamers suivis
      const { data: followsData, error: followsError } = await supabase
        .from('user_follows')
        .select('streamer_id')
        .eq('follower_user_id', user.id);

      if (followsError) {
        console.error('Erreur récupération follows:', followsError);
        return;
      }

      if (!followsData || followsData.length === 0) {
        setPauvrathonStreamers([]);
        return;
      }

      const streamerIds = followsData.map(follow => follow.streamer_id);

      // Récupérer les détails des streamers avec leurs profils
      const { data: streamersData, error: streamersError } = await supabase
        .from('streamers')
        .select(`
          *,
          profiles!inner(
            twitch_username,
            twitch_display_name,
            avatar_url,
            twitch_id
          )
        `)
        .in('id', streamerIds);

      if (streamersError) {
        console.error('Erreur récupération streamers:', streamersError);
        return;
      }

      const streamers = (streamersData || []).map(streamer => ({
        ...streamer,
        profile: Array.isArray(streamer.profiles) 
          ? streamer.profiles[0] 
          : streamer.profiles
      }));

      setPauvrathonStreamers(streamers as PauvrathonStreamer[]);
      
    } catch (error) {
      console.error('Erreur fetchPauvrathonStreamers:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos streamers Pauvrathon suivis.",
        variant: "destructive",
      });
    } finally {
      setLoadingPauvrathon(false);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchTwitchLiveStreamers(),
      fetchPauvrathonStreamers()
    ]);
    setRefreshing(false);
    toast({
      title: "Actualisé",
      description: "Les données ont été mises à jour.",
    });
  };

  const formatDuration = (startedAt: string) => {
    const now = new Date();
    const started = new Date(startedAt);
    const diffMs = now.getTime() - started.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHrs > 0) {
      return `${diffHrs}h ${diffMins}m`;
    }
    return `${diffMins}m`;
  };

  const formatViewerCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const getStreamerDisplayName = (streamer: PauvrathonStreamer) => {
    return streamer.profile?.twitch_display_name || 
           streamer.profiles?.twitch_display_name ||
           streamer.profile?.twitch_username ||
           streamer.profiles?.twitch_username ||
           'Streamer';
  };

  const getStreamerUsername = (streamer: PauvrathonStreamer) => {
    return streamer.profile?.twitch_username || 
           streamer.profiles?.twitch_username ||
           'unknown';
  };

  const getStreamerAvatar = (streamer: PauvrathonStreamer) => {
    return streamer.profile?.avatar_url || 
           streamer.profiles?.avatar_url ||
           null;
  };

  const renderTwitchStreamerCard = (stream: TwitchStream) => (
    <Card key={stream.id} className="hover:shadow-lg transition-shadow overflow-hidden">
      <div className="relative">
        <img 
          src={stream.thumbnail_url?.replace('{width}x{height}', '320x180')} 
          alt={stream.title}
          className="w-full h-48 object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://via.placeholder.com/320x180/667eea/ffffff?text=Stream+Live';
          }}
        />
        <div className="absolute top-2 left-2">
          <Badge className="bg-red-500 text-white">
            <Radio className="w-3 h-3 mr-1" />
            EN DIRECT
          </Badge>
        </div>
        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {formatViewerCount(stream.viewer_count)}
        </div>
        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
          {formatDuration(stream.started_at)}
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={stream.profile_image_url} alt={stream.user_name} />
            <AvatarFallback>
              {stream.user_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{stream.user_name}</CardTitle>
            <p className="text-sm text-muted-foreground truncate">{stream.game_name || 'Juste bavardage'}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-2">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{stream.title}</p>
        <Button asChild className="w-full">
          <a href={`https://twitch.tv/${stream.user_login}`} target="_blank" rel="noopener noreferrer">
            <Tv className="w-4 h-4 mr-2" />
            Regarder sur Twitch
          </a>
        </Button>
      </CardContent>
    </Card>
  );

  const renderPauvrathonStreamerCard = (streamer: PauvrathonStreamer) => {
    const displayName = getStreamerDisplayName(streamer);
    const username = getStreamerUsername(streamer);
    const avatar = getStreamerAvatar(streamer);
    const isLive = streamer.status === 'live';
    const isPaused = streamer.status === 'paused';

    return (
      <Card key={streamer.id} className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatar || ''} alt={displayName} />
                <AvatarFallback>
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                isLive ? 'bg-green-500 animate-pulse' : 
                isPaused ? 'bg-yellow-500' :
                'bg-gray-400'
              }`} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{displayName}</CardTitle>
              <p className="text-sm text-muted-foreground">@{username}</p>
            </div>
            <Badge variant={isLive ? 'default' : 'secondary'} className={
              isLive ? 'bg-purple-600' : 
              isPaused ? 'bg-yellow-600' : 
              'bg-gray-600'
            }>
              <Trophy className="w-3 h-3 mr-1" />
              {isLive ? 'Live' : isPaused ? 'Pause' : 'Offline'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>+{streamer.time_increment}s par victoire</span>
            </div>
            <div className="flex items-center space-x-1">
              <Gamepad2 className="h-4 w-4 text-muted-foreground" />
              <span>{streamer.active_minigames?.length || 0} jeux</span>
            </div>
          </div>
          
          {(isLive || isPaused) && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progression:</span>
                  <span className="font-medium">
                    {streamer.current_clicks}/{streamer.clicks_required} clics
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, (streamer.current_clicks / streamer.clicks_required) * 100)}%` 
                    }}
                  />
                </div>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Temps total ajouté:</span>
                <span className="ml-2 font-medium text-green-600">
                  {Math.floor((streamer.total_time_added || 0) / 60)}min {(streamer.total_time_added || 0) % 60}s
                </span>
              </div>
            </>
          )}

          {streamer.stream_title && (
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
              "{streamer.stream_title}"
            </div>
          )}

          <div className="flex flex-col gap-2">
            <FollowButton streamerId={streamer.id} showCount />
            
            {isLive && (
              <Link to={`/subathon/${streamer.id}`}>
                <Button className="w-full">
                  <Trophy className="w-4 h-4 mr-2" />
                  Participer au Pauvrathon
                </Button>
              </Link>
            )}
            
            {isPaused && (
              <Button variant="outline" disabled className="w-full">
                <Power className="w-4 h-4 mr-2" />
                Pauvrathon en pause
              </Button>
            )}

            {!isLive && !isPaused && (
              <Link to={`/streamer/${streamer.id}`}>
                <Button variant="outline" className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  Voir le profil
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Séparer les streamers Pauvrathon par statut
  const liveStreamers = pauvrathonStreamers.filter(s => s.status === 'live');
  const pausedStreamers = pauvrathonStreamers.filter(s => s.status === 'paused');
  const offlineStreamers = pauvrathonStreamers.filter(s => s.status === 'offline' || s.status === 'ended');

  const totalPauvrathon = pauvrathonStreamers.length;
  const totalTwitchLive = twitchLiveStreamers.length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-4">Mes Suivis</h1>
            <p className="text-muted-foreground">
              Streamers Twitch en direct et Pauvrathon suivis
            </p>
          </div>
          <Button 
            onClick={refreshAll} 
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        <div className="space-y-12">
          {/* SECTION 1: Streamers Twitch en direct */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Tv className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Streamers Twitch en direct</h2>
                <p className="text-sm text-muted-foreground">
                  Vos follows Twitch actuellement en live
                </p>
              </div>
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                {totalTwitchLive} en ligne
              </Badge>
            </div>

            {loadingTwitch ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted rounded-t-lg" />
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <div className="rounded-full bg-muted h-10 w-10" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted rounded w-24" />
                          <div className="h-3 bg-muted rounded w-16" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-10 bg-muted rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : totalTwitchLive === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                <Radio className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Aucun stream Twitch en direct
                </h3>
                <p className="text-muted-foreground mb-4">
                  Aucun de vos streamers Twitch suivis n'est actuellement en ligne.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Connectez votre compte Twitch dans les paramètres pour voir vos follows</span>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {twitchLiveStreamers.map(renderTwitchStreamerCard)}
              </div>
            )}
          </div>

          {/* SECTION 2: Streamers Pauvrathon */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Trophy className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Pauvrathon - Mes Suivis</h2>
                <p className="text-sm text-muted-foreground">
                  Streamers participant au Pauvrathon que vous suivez
                </p>
              </div>
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                {totalPauvrathon} suivis
              </Badge>
            </div>

            {loadingPauvrathon ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <div className="rounded-full bg-muted h-12 w-12" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted rounded w-24" />
                          <div className="h-3 bg-muted rounded w-16" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded w-3/4" />
                        <div className="h-10 bg-muted rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : totalPauvrathon === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-lg border-2 border-dashed">
                <Heart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Aucun streamer Pauvrathon suivi
                </h3>
                <p className="text-muted-foreground mb-6">
                  Vous ne suivez aucun streamer participant au Pauvrathon.
                  <br />
                  Découvrez des streamers pour commencer !
                </p>
                <Button asChild size="lg">
                  <Link to="/discovery">
                    <Users className="w-4 h-4 mr-2" />
                    Découvrir des Streamers
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Streamers en direct */}
                {liveStreamers.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                      <h3 className="text-xl font-semibold text-green-600">
                        En direct ({liveStreamers.length})
                      </h3>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {liveStreamers.map(renderPauvrathonStreamerCard)}
                    </div>
                  </div>
                )}

                {/* Streamers en pause */}
                {pausedStreamers.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                      <h3 className="text-xl font-semibold text-yellow-600">
                        En pause ({pausedStreamers.length})
                      </h3>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pausedStreamers.map(renderPauvrathonStreamerCard)}
                    </div>
                  </div>
                )}

                {/* Streamers hors ligne */}
                {offlineStreamers.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-gray-400 rounded-full" />
                      <h3 className="text-xl font-semibold text-gray-600">
                        Hors ligne ({offlineStreamers.length})
                      </h3>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {offlineStreamers.map(renderPauvrathonStreamerCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}