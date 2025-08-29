import { Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navigation } from '@/components/Navigation';
import { FollowButton } from '@/components/FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowedStreamers } from '@/hooks/useFollowedStreamers';
import { supabase } from '@/integrations/supabase/client';
import { 
  Heart, 
  Users, 
  Clock, 
  Gamepad2, 
  Radio, 
  Power, 
  Tv, 
  Trophy, 
  RefreshCw, 
  AlertCircle, 
  Eye,
  ArrowUpRight,
  Square
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  profile?: {
    twitch_username?: string;
    twitch_display_name?: string;
    avatar_url?: string;
    twitch_id?: string;
  };
  profiles?: {
    twitch_username?: string;
    twitch_display_name?: string;
    avatar_url?: string;
    twitch_id?: string;
  };
}

export default function Following() {
  const { user } = useAuth();
  const { followedStreamers, loading: loadingFollowed, refetch } = useFollowedStreamers();
  const [twitchLiveStreamers, setTwitchLiveStreamers] = useState<TwitchStream[]>([]);
  const [loadingTwitch, setLoadingTwitch] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // État pour le filtre de l'onglet Pauvrathon
  const [pauvrathonFilter, setPauvrathonFilter] = useState<'all' | 'live'>('all');

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchTwitchLiveStreamers();
  }, [user]);

  const fetchTwitchLiveStreamers = async () => {
    if (!user) return;

    try {
      setLoadingTwitch(true);
      
      // Tentative principale pour obtenir les follows
      try {
        const { data, error } = await supabase.functions.invoke('get-twitch-follows', {
          body: { user_id: user.id }
        });

        if (error) throw error;
        
        if (data && data.streams) {
          setTwitchLiveStreamers(data.streams);
          return; // Succès, sortir de la fonction
        }
      } catch (primaryError) {
        console.error('Erreur principale Twitch API:', primaryError);
        
        // Plan B: Tenter d'utiliser l'API de recherche
        try {
          const { data: searchData } = await supabase.functions.invoke('search-twitch-streams', {
            body: { query: 'subathon' }
          });
          
          if (searchData && searchData.streams) {
            // Utiliser les résultats de recherche comme fallback
            setTwitchLiveStreamers(searchData.streams.slice(0, 6)); // Limiter à 6 streams
            toast({
              title: "Information",
              description: "Affichage des streams populaires au lieu de vos follows.",
            });
            return;
          }
        } catch (secondaryError) {
          console.error('Erreur secondaire Twitch API:', secondaryError);
          // Continuer avec une liste vide
        }
      }
      
      // Si on arrive ici, aucune méthode n'a fonctionné
      setTwitchLiveStreamers([]);
      
    } catch (error) {
      console.error('Erreur récupération streams Twitch:', error);
      setTwitchLiveStreamers([]);
    } finally {
      setLoadingTwitch(false);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchTwitchLiveStreamers(),
      refetch()
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
           `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
             getStreamerDisplayName(streamer)
           )}`;
  };

  // Filtre des streamers Pauvrathon
  const filteredPauvrathonStreamers = followedStreamers.filter(streamer => {
    if (pauvrathonFilter === 'live') return streamer.status === 'live';
    return true;
  });

  // Séparer les streamers Pauvrathon par statut
  const liveStreamers = filteredPauvrathonStreamers.filter(s => s.status === 'live');
  const pausedStreamers = filteredPauvrathonStreamers.filter(s => s.status === 'paused');
  const offlineStreamers = filteredPauvrathonStreamers.filter(s => s.status === 'offline' || s.status === 'ended');

  const totalPauvrathon = followedStreamers.length;
  const totalLivePauvrathon = liveStreamers.length;
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

        <Tabs defaultValue="pauvrathon" className="w-full mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="pauvrathon">
              Pauvrathon ({totalPauvrathon})
            </TabsTrigger>
            <TabsTrigger value="twitch">
              Twitch Live ({totalTwitchLive})
            </TabsTrigger>
          </TabsList>

          {/* Section Pauvrathon */}
          <TabsContent value="pauvrathon">
            <div className="mb-6 flex justify-between items-center">
              <div className="flex space-x-2">
                <Button
                  variant={pauvrathonFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setPauvrathonFilter('all')}
                  size="sm"
                >
                  Tous
                </Button>
                <Button
                  variant={pauvrathonFilter === 'live' ? 'default' : 'outline'}
                  onClick={() => setPauvrathonFilter('live')}
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <Radio className="w-4 h-4 text-red-500 mr-1" />
                  En live ({totalLivePauvrathon})
                </Button>
              </div>
            </div>

            {loadingFollowed ? (
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
            ) : filteredPauvrathonStreamers.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Aucun streamer en direct
                </h3>
                <p className="text-muted-foreground mb-4">
                  Aucun de vos streamers Pauvrathon suivis n'est actuellement en ligne.
                </p>
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
                      {liveStreamers.map((streamer) => {
                        const displayName = getStreamerDisplayName(streamer);
                        const username = getStreamerUsername(streamer);
                        const avatar = getStreamerAvatar(streamer);
                        
                        return (
                          <Card key={streamer.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                              <div className="flex items-center space-x-4">
                                <div className="relative">
                                  <Avatar className="h-12 w-12">
                                    <AvatarImage src={avatar} alt={displayName} />
                                    <AvatarFallback>
                                      {displayName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background bg-green-500 animate-pulse" />
                                </div>
                                <div className="flex-1">
                                  <CardTitle className="text-lg">{displayName}</CardTitle>
                                  <p className="text-sm text-muted-foreground">@{username}</p>
                                </div>
                                <Badge variant="default" className="bg-purple-600">
                                  <Trophy className="w-3 h-3 mr-1" />
                                  Live
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

                              {streamer.stream_title && (
                                <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                  "{streamer.stream_title}"
                                </div>
                              )}

                              <div className="flex flex-col gap-2">
                                <FollowButton streamerId={streamer.id} showCount />
                                
                                <Link to={`/subathon/${streamer.id}`}>
                                  <Button className="w-full">
                                    <Trophy className="w-4 h-4 mr-2" />
                                    Participer au Pauvrathon
                                  </Button>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Streamers en pause - seulement si on affiche tous les streamers */}
                {pauvrathonFilter === 'all' && pausedStreamers.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                      <h3 className="text-xl font-semibold text-yellow-600">
                        En pause ({pausedStreamers.length})
                      </h3>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pausedStreamers.map((streamer) => {
                        const displayName = getStreamerDisplayName(streamer);
                        const username = getStreamerUsername(streamer);
                        const avatar = getStreamerAvatar(streamer);
                        
                        return (
                          <Card key={streamer.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                              <div className="flex items-center space-x-4">
                                <div className="relative">
                                  <Avatar className="h-12 w-12">
                                    <AvatarImage src={avatar} alt={displayName} />
                                    <AvatarFallback>
                                      {displayName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background bg-yellow-500" />
                                </div>
                                <div className="flex-1">
                                  <CardTitle className="text-lg">{displayName}</CardTitle>
                                  <p className="text-sm text-muted-foreground">@{username}</p>
                                </div>
                                <Badge variant="secondary" className="bg-yellow-600">
                                  <Power className="w-3 h-3 mr-1" />
                                  Pause
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

                              {streamer.stream_title && (
                                <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                  "{streamer.stream_title}"
                                </div>
                              )}

                              <div className="flex flex-col gap-2">
                                <FollowButton streamerId={streamer.id} showCount />
                                
                                <Button variant="outline" disabled className="w-full">
                                  <Power className="w-4 h-4 mr-2" />
                                  Pauvrathon en pause
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Streamers hors ligne - seulement si on affiche tous les streamers */}
                {pauvrathonFilter === 'all' && offlineStreamers.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-gray-400 rounded-full" />
                      <h3 className="text-xl font-semibold text-gray-600">
                        Hors ligne ({offlineStreamers.length})
                      </h3>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {offlineStreamers.map((streamer) => {
                        const displayName = getStreamerDisplayName(streamer);
                        const username = getStreamerUsername(streamer);
                        const avatar = getStreamerAvatar(streamer);
                        
                        return (
                          <Card key={streamer.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                              <div className="flex items-center space-x-4">
                                <div className="relative">
                                  <Avatar className="h-12 w-12">
                                    <AvatarImage src={avatar} alt={displayName} />
                                    <AvatarFallback>
                                      {displayName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background bg-gray-400" />
                                </div>
                                <div className="flex-1">
                                  <CardTitle className="text-lg">{displayName}</CardTitle>
                                  <p className="text-sm text-muted-foreground">@{username}</p>
                                </div>
                                <Badge variant="outline" className="bg-gray-600 text-white">
                                  <Square className="w-3 h-3 mr-1" />
                                  Offline
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

                              <div className="flex flex-col gap-2">
                                <FollowButton streamerId={streamer.id} showCount />
                                
                                <Link to={`/streamer/${streamer.id}`}>
                                  <Button variant="outline" className="w-full">
                                    <Users className="w-4 h-4 mr-2" />
                                    Voir le profil
                                  </Button>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Section Twitch Live */}
          <TabsContent value="twitch">
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
                {twitchLiveStreamers.map((stream) => (
                  <Card key={stream.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                    <div className="relative">
                      <img 
                        src={stream.thumbnail_url?.replace('{width}', '440').replace('{height}', '248')} 
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
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{stream.title}</p>
                  <Button asChild className="w-full">
                    <a href={`https://twitch.tv/${stream.user_login}`} target="_blank" rel="noopener noreferrer">
                      <ArrowUpRight className="w-4 h-4 mr-2" />
                      Regarder sur Twitch
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  </div>
</div>
);
}