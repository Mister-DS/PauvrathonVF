import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Radio, 
  Eye, 
  Users, 
  Clock, 
  Trophy, 
  RefreshCw,
  AlertCircle,
  Square,
  ArrowUpRight,
  Heart,
  ExternalLink,
  Play
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PauvrathonStreamer {
  id: string;
  user_id: string;
  twitch_id: string;
  time_increment: number;
  clicks_required: number;
  cooldown_seconds: number;
  current_clicks: number;
  total_time_added: number;
  is_live: boolean;
  stream_title: string;
  time_mode: string;
  max_random_time: number;
  status: string;
  stream_started_at: string;
  pause_started_at: string;
  total_paused_duration: number;
  initial_duration: number;
  profile?: {
    twitch_display_name: string;
    twitch_username: string;
    avatar_url: string;
  };
}

interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
  game_name: string;
  thumbnail_url: string;
  profile_image_url: string;
}

export default function FollowsPage() {
  const { user } = useAuth();
  const [pauvrathonFollows, setPauvrathonFollows] = useState<PauvrathonStreamer[]>([]);
  const [twitchFollows, setTwitchFollows] = useState<TwitchStream[]>([]);
  const [loadingPauvrathon, setLoadingPauvrathon] = useState(true);
  const [loadingTwitch, setLoadingTwitch] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchPauvrathonFollows();
    fetchTwitchFollows();
    
    // Actualiser toutes les 30 secondes
    const interval = setInterval(() => {
      fetchPauvrathonFollows();
      fetchTwitchFollows();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  const fetchPauvrathonFollows = async () => {
    try {
      // Récupérer les streamers que l'utilisateur suit
      const { data: followsData, error: followsError } = await supabase
        .from('user_follows')
        .select(`
          streamer_id,
          streamers!inner (
            id,
            user_id,
            twitch_id,
            time_increment,
            clicks_required,
            cooldown_seconds,
            current_clicks,
            total_time_added,
            is_live,
            stream_title,
            time_mode,
            max_random_time,
            status,
            stream_started_at,
            pause_started_at,
            total_paused_duration,
            initial_duration,
            profiles!inner (
              twitch_display_name,
              twitch_username,
              avatar_url
            )
          )
        `)
        .eq('follower_user_id', user.id);

      if (followsError) {
        console.error('Erreur follows:', followsError);
        
        // Fallback : récupérer quelques streamers actifs pour la démo
        const { data: allStreamers, error: streamersError } = await supabase
          .from('streamers')
          .select(`
            id,
            user_id,
            twitch_id,
            time_increment,
            clicks_required,
            cooldown_seconds,
            current_clicks,
            total_time_added,
            is_live,
            stream_title,
            time_mode,
            max_random_time,
            status,
            stream_started_at,
            pause_started_at,
            total_paused_duration,
            initial_duration,
            profiles!inner (
              twitch_display_name,
              twitch_username,
              avatar_url
            )
          `)
          .eq('is_live', true)
          .limit(6);

        if (!streamersError && allStreamers) {
          setPauvrathonFollows(allStreamers as any);
        }
      } else {
        // Transformer les données pour avoir la bonne structure
        const streamers = followsData
          ?.map((follow: any) => follow.streamers)
          ?.filter(Boolean) || [];
        
        setPauvrathonFollows(streamers as any);
      }
    } catch (error) {
      console.error('Erreur récupération follows Pauvrathon:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos follows Pauvrathon.",
        variant: "destructive",
      });
    } finally {
      setLoadingPauvrathon(false);
    }
  };

  const fetchTwitchFollows = async () => {
    try {
      // Utiliser votre Edge Function existante
      const { data: twitchData, error: twitchError } = await supabase.functions.invoke('get-twitch-follows');

      if (twitchError) {
        console.error('Erreur Edge Function Twitch:', twitchError);
        setTwitchFollows([]);
        return;
      }

      // Traiter les données retournées par l'Edge Function
      const follows = twitchData?.follows || [];
      
      // Transformer les données Twitch pour correspondre à votre interface
      const transformedFollows = follows.map((stream: any) => ({
        id: stream.id,
        user_id: stream.user_id,
        user_login: stream.user_login,
        user_name: stream.display_name || stream.user_name,
        title: stream.title,
        viewer_count: stream.viewer_count,
        started_at: stream.started_at,
        game_name: stream.game_name || 'Juste bavardage',
        thumbnail_url: stream.thumbnail_url || 'https://via.placeholder.com/440x248/667eea/ffffff?text=Stream+Live',
        profile_image_url: stream.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(stream.user_name)}`,
      }));
      
      setTwitchFollows(transformedFollows);
    } catch (error) {
      console.error('Erreur récupération follows Twitch:', error);
      setTwitchFollows([]);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos follows Twitch.",
        variant: "destructive",
      });
    } finally {
      setLoadingTwitch(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchPauvrathonFollows(),
      fetchTwitchFollows()
    ]);
    setRefreshing(false);
    toast({
      title: "Actualisation terminée",
      description: "Les données ont été mises à jour.",
    });
  };

  const getStreamerStatus = (streamer: PauvrathonStreamer) => {
    if (streamer.is_live && streamer.status === 'live') {
      return 'live';
    } else if (streamer.status === 'paused') {
      return 'paused';
    } else {
      return 'offline';
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatStreamDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  const getStreamerDisplayName = (streamer: PauvrathonStreamer) => {
    return streamer.profile?.twitch_display_name || 
           streamer.profile?.twitch_username || 
           'Streamer inconnu';
  };

  const getStreamerAvatar = (streamer: PauvrathonStreamer) => {
    const displayName = getStreamerDisplayName(streamer);
    return streamer.profile?.avatar_url || 
           `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
  };

  const handleFollowStreamer = async (streamerId: string) => {
    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_user_id: user.id,
          streamer_id: streamerId
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Déjà suivi",
            description: "Vous suivez déjà ce streamer.",
            variant: "default",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Suivi ajouté",
          description: "Vous suivez maintenant ce streamer.",
        });
        fetchPauvrathonFollows(); // Refresh the list
      }
    } catch (error) {
      console.error('Erreur follow:', error);
      toast({
        title: "Erreur",
        description: "Impossible de suivre ce streamer.",
        variant: "destructive",
      });
    }
  };

  const handleUnfollowStreamer = async (streamerId: string) => {
    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_user_id', user.id)
        .eq('streamer_id', streamerId);

      if (error) {
        throw error;
      }

      toast({
        title: "Suivi retiré",
        description: "Vous ne suivez plus ce streamer.",
      });
      fetchPauvrathonFollows(); // Refresh the list
    } catch (error) {
      console.error('Erreur unfollow:', error);
      toast({
        title: "Erreur",
        description: "Impossible de ne plus suivre ce streamer.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
                Mes Suivis
              </h1>
              <p className="text-muted-foreground">
                Suivez vos streamers préférés et découvrez qui est en live
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        <Tabs defaultValue="pauvrathon" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pauvrathon" className="flex items-center">
              <Trophy className="w-4 h-4 mr-2" />
              Follows Pauvrathon ({pauvrathonFollows.length})
            </TabsTrigger>
            <TabsTrigger value="twitch" className="flex items-center">
              <Radio className="w-4 h-4 mr-2" />
              Lives Twitch ({twitchFollows.length})
            </TabsTrigger>
          </TabsList>

          {/* Section 1 : Follows Pauvrathon */}
          <TabsContent value="pauvrathon">
            {loadingPauvrathon ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                      <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pauvrathonFollows.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Heart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Aucun follow Pauvrathon</h3>
                  <p className="text-muted-foreground mb-4">
                    Vous ne suivez aucun streamer Pauvrathon pour le moment.
                  </p>
                  <Button asChild>
                    <Link to="/discovery">
                      <Eye className="w-4 h-4 mr-2" />
                      Découvrir des streamers
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pauvrathonFollows.map((streamer) => (
                  <Card key={streamer.id} className="overflow-hidden hover:shadow-lg transition-shadow border-2 border-primary/20">
                    <CardContent className="p-6">
                      {/* Header avec Avatar et Status */}
                      <div className="flex items-center space-x-3 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={getStreamerAvatar(streamer)} alt={getStreamerDisplayName(streamer)} />
                          <AvatarFallback>
                            {getStreamerDisplayName(streamer).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {getStreamerDisplayName(streamer)}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {getStreamerStatus(streamer) === 'live' ? (
                              <Badge className="bg-red-500 text-white">
                                <Radio className="w-3 h-3 mr-1" />
                                En live
                              </Badge>
                            ) : getStreamerStatus(streamer) === 'paused' ? (
                              <Badge className="bg-yellow-500 text-white">
                                <Clock className="w-3 h-3 mr-1" />
                                En pause
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Square className="w-3 h-3 mr-1" />
                                Hors ligne
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Statistiques */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center">
                            <Trophy className="w-4 h-4 mr-1 text-orange-500" />
                            Progression
                          </span>
                          <span className="font-medium">
                            {streamer.current_clicks}/{streamer.clicks_required}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-blue-500" />
                            Temps ajouté
                          </span>
                          <span className="font-medium text-green-600">
                            +{formatTime(streamer.total_time_added || 0)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center">
                            <Play className="w-4 h-4 mr-1 text-purple-500" />
                            Durée initiale
                          </span>
                          <span className="font-medium">
                            {formatTime(streamer.initial_duration || 7200)}
                          </span>
                        </div>

                        {/* Afficher le titre du stream s'il existe */}
                        {streamer.stream_title && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                            <span className="font-medium">Stream :</span> {streamer.stream_title}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <Button asChild variant="outline" className="flex-1">
                          <Link to={`/streamer/${streamer.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            Voir
                          </Link>
                        </Button>
                        
                        {streamer.profile?.twitch_username && (
                          <Button asChild variant="outline" size="icon">
                            <a 
                              href={`https://twitch.tv/${streamer.profile.twitch_username}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Section 2 : Follows Twitch en live */}
          <TabsContent value="twitch">
            {loadingTwitch ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-0">
                      <div className="h-48 bg-muted" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : twitchFollows.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Radio className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Aucun follow Twitch en live</h3>
                  <p className="text-muted-foreground">
                    Aucun de vos follows Twitch n'est actuellement en direct, ou vous n'avez pas encore connecté votre compte Twitch.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {twitchFollows.map((stream) => (
                  <Card key={stream.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      {/* Thumbnail */}
                      <div className="relative">
                        <img 
                          src={stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248')} 
                          alt={stream.title}
                          className="w-full h-auto aspect-video object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/440x248/667eea/ffffff?text=Stream+Live';
                          }}
                        />
                        <div className="absolute top-2 left-2 flex gap-2">
                          <Badge className="bg-red-500 text-white">
                            <Radio className="w-3 h-3 mr-1" />
                            {stream.viewer_count?.toLocaleString() || '0'} spectateurs
                          </Badge>
                        </div>
                        <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatStreamDuration(stream.started_at)}
                        </Badge>
                      </div>

                      <div className="p-4">
                        {/* Header avec Avatar et Nom */}
                        <div className="flex items-center space-x-3 mb-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={stream.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(stream.user_name)}`} 
                              alt={stream.user_name} 
                            />
                            <AvatarFallback>
                              {stream.user_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold">{stream.user_name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {stream.game_name}
                            </p>
                          </div>
                        </div>

                        {/* Titre du stream */}
                        <p className="text-sm line-clamp-2 mb-4 leading-relaxed">
                          {stream.title}
                        </p>

                        {/* Action */}
                        <Button 
                          asChild 
                          variant="outline" 
                          className="w-full"
                        >
                          <a 
                            href={`https://twitch.tv/${stream.user_login}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ArrowUpRight className="w-4 h-4 mr-2" />
                            Regarder sur Twitch
                          </a>
                        </Button>
                      </div>
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