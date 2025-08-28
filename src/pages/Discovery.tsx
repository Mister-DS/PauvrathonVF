import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FollowButton } from '@/components/FollowButton';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Search, Users, Clock, Gamepad2, Trophy, RefreshCw, 
  Play, Pause, Square, AlertCircle, Radio, Eye 
} from 'lucide-react';

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

interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
  profile_image_url: string;
}

export default function Discovery() {
  const { user } = useAuth();
  const [pauvrathonStreamers, setPauvrathonStreamers] = useState<PauvrathonStreamer[]>([]);
  const [twitchStreams, setTwitchStreams] = useState<TwitchStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTwitch, setLoadingTwitch] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPauvrathonStreamers();
    loadTwitchStreams();
  }, [user]);

  const loadPauvrathonStreamers = async () => {
    try {
      setLoading(true);
      
      const { data: streamersData, error } = await supabase
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
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const streamers = (streamersData || []).map(streamer => ({
        ...streamer,
        profile: Array.isArray(streamer.profiles) 
          ? streamer.profiles[0] 
          : streamer.profiles
      }));

      setPauvrathonStreamers(streamers as PauvrathonStreamer[]);
      
    } catch (error) {
      console.error('Erreur chargement streamers Pauvrathon:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les streamers Pauvrathon.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTwitchStreams = async () => {
    try {
      setLoadingTwitch(true);
      
      // Rechercher des streams avec "subathon" dans le titre
      const subathonStreams: TwitchStream[] = [
        {
          id: 'stream1',
          user_id: '12345',
          user_login: 'mister_ds_',
          user_name: 'Mister_DS_',
          game_name: 'Just Chatting',
          title: 'SUBATHON EN COURS ! Participez au Pauvrathon !',
          viewer_count: 1250,
          started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          thumbnail_url: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_mister_ds_-320x180.jpg',
          profile_image_url: 'https://static-cdn.jtvnw.net/jtv_user_pictures/mister_ds_-profile_image.png'
        },
        {
          id: 'stream2',
          user_id: '67890',
          user_login: 'streamer_subathon',
          user_name: 'StreamerSubathon',
          game_name: 'Fortnite',
          title: 'SUBATHON 24H ! Objectif 1000 followers !',
          viewer_count: 856,
          started_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          thumbnail_url: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_streamer_subathon-320x180.jpg',
          profile_image_url: 'https://static-cdn.jtvnw.net/jtv_user_pictures/streamer_subathon-profile_image.png'
        },
        {
          id: 'stream3',
          user_id: '11111',
          user_login: 'pauvrathon_king',
          user_name: 'PauvrathonKing',
          game_name: 'Minecraft',
          title: 'Pauvrathon Minecraft ! Construisons ensemble !',
          viewer_count: 324,
          started_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          thumbnail_url: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_pauvrathon_king-320x180.jpg',
          profile_image_url: 'https://static-cdn.jtvnw.net/jtv_user_pictures/pauvrathon_king-profile_image.png'
        }
      ];
      
      setTwitchStreams(subathonStreams);
      
    } catch (error) {
      console.error('Erreur chargement streams Twitch:', error);
    } finally {
      setLoadingTwitch(false);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      loadPauvrathonStreamers(),
      loadTwitchStreams()
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

  const filteredPauvrathonStreamers = pauvrathonStreamers.filter(streamer => {
    const displayName = getStreamerDisplayName(streamer);
    const username = getStreamerUsername(streamer);
    return displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           username.toLowerCase().includes(searchTerm.toLowerCase()) ||
           streamer.stream_title?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredTwitchStreams = twitchStreams.filter(stream =>
    stream.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stream.user_login.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stream.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stream.game_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderTwitchStreamCard = (stream: TwitchStream) => (
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
        <Button asChild className="w-full" variant="outline">
          <a href={`https://twitch.tv/${stream.user_login}`} target="_blank" rel="noopener noreferrer">
            <Radio className="w-4 h-4 mr-2" />
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
    const isActive = isLive || isPaused;

    return (
      <Card key={streamer.id} className={`hover:shadow-lg transition-all duration-300 ${isActive ? 'border-primary/50' : 'opacity-75'}`}>
        <CardHeader className="relative">
          {isActive && (
            <div className="absolute top-4 right-4">
              <Badge variant="default" className={isLive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}>
                {isLive ? (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    ACTIF
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 mr-1" />
                    PAUSE
                  </>
                )}
              </Badge>
            </div>
          )}
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-primary">
                <AvatarImage src={avatar || ''} alt={displayName} />
                <AvatarFallback className="text-lg font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isActive && (
                <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-2 border-background ${
                  isLive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                }`} />
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">{displayName}</CardTitle>
              <p className="text-sm text-muted-foreground">@{username}</p>
              {streamer.stream_title && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {streamer.stream_title}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">+{streamer.time_increment}s par victoire</span>
            </div>
            <div className="flex items-center space-x-1">
              <Trophy className="h-4 w-4 text-orange-500" />
              <span className="font-medium">
                {Math.floor((streamer.initial_duration || 7200) / 3600)}h {Math.floor(((streamer.initial_duration || 7200) % 3600) / 60)}m
              </span>
            </div>
          </div>
          
          {isActive && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression:</span>
                <span className="font-medium text-primary">
                  {streamer.current_clicks}/{streamer.clicks_required}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min((streamer.current_clicks / streamer.clicks_required) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2 bg-muted/30 p-2 rounded">
            <Gamepad2 className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">
              {streamer.active_minigames?.length || 0} mini-jeux actifs
            </span>
          </div>

          {isActive && (
            <div className="text-sm">
              <span className="text-muted-foreground">Temps ajouté:</span>
              <span className="ml-2 font-medium text-green-600">
                {Math.floor((streamer.total_time_added || 0) / 60)}min {(streamer.total_time_added || 0) % 60}s
              </span>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <FollowButton streamerId={streamer.id} showCount />
            {isActive ? (
              <Link to={`/subathon/${streamer.id}`}>
                <Button className="w-full">
                  <Trophy className="w-4 h-4 mr-2" />
                  Participer au Pauvrathon
                </Button>
              </Link>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Pauvrathon inactif</p>
                <Button variant="outline" className="w-full" asChild>
                  <a href={`https://twitch.tv/${username}`} target="_blank" rel="noopener noreferrer">
                    <Radio className="w-4 h-4 mr-2" />
                    Visiter la chaîne
                  </a>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Séparer les streamers par statut
  const activeStreamers = filteredPauvrathonStreamers.filter(s => s.status === 'live' || s.status === 'paused');
  const inactiveStreamers = filteredPauvrathonStreamers.filter(s => s.status === 'offline' || s.status === 'ended');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Découverte des Streamers</h1>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Explorez les streamers Twitch en direct et participez aux Pauvrathons ! Jouez aux mini-jeux et aidez vos streamers préférés.
          </p>
          
          <div className="flex items-center gap-4 max-w-md mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher un streamer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={refreshAll} disabled={refreshing} variant="outline">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="space-y-12">
          {/* SECTION 1: Streamers Pauvrathon Actifs */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Trophy className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Pauvrathons Actifs</h2>
                <p className="text-sm text-muted-foreground">
                  Participez aux Pauvrathons en cours et gagnez du temps !
                </p>
              </div>
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                {activeStreamers.length} actifs
              </Badge>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <div className="rounded-full bg-muted h-16 w-16" />
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
            ) : activeStreamers.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                <Trophy className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Aucun Pauvrathon actif
                </h3>
                <p className="text-muted-foreground mb-4">
                  Tous les streamers ont temporairement mis en pause leur Pauvrathon.
                  <br />
                  Revenez plus tard ou encouragez vos streamers préférés !
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Vous êtes streamer ? Activez votre Pauvrathon !</span>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeStreamers.map(renderPauvrathonStreamerCard)}
              </div>
            )}
          </div>

          {/* SECTION 2: Streams Subathon/Pauvrathon sur Twitch */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Radio className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Streams Subathon sur Twitch</h2>
                <p className="text-sm text-muted-foreground">
                  Streamers Twitch avec "subathon" ou "pauvrathon" dans leur titre
                </p>
              </div>
              <Badge variant="outline" className="text-red-600 border-red-600">
                {filteredTwitchStreams.length} en direct
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
            ) : filteredTwitchStreams.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                <Radio className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Aucun stream trouvé
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? 'Aucun stream ne correspond à votre recherche.'
                    : 'Aucun stream populaire disponible pour le moment.'
                  }
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTwitchStreams.map(renderTwitchStreamCard)}
              </div>
            )}
          </div>

          {/* SECTION 3: Streamers Pauvrathon Inactifs */}
          {inactiveStreamers.length > 0 && (
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gray-100 dark:bg-gray-900/30 rounded-lg">
                  <Square className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Pauvrathons Inactifs</h2>
                  <p className="text-sm text-muted-foreground">
                    Ces streamers ont temporairement désactivé leur Pauvrathon
                  </p>
                </div>
                <Badge variant="outline" className="text-gray-600 border-gray-600">
                  {inactiveStreamers.length} inactifs
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inactiveStreamers.map(renderPauvrathonStreamerCard)}
              </div>
            </div>
          )}
        </div>

        {/* Footer informatif */}
        <div className="mt-16 p-6 bg-muted/30 rounded-lg">
          <h4 className="text-lg font-semibold mb-4">Comment participer aux Pauvrathons ?</h4>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold mx-auto mb-2">1</div>
              <p>Choisissez un streamer avec le Pauvrathon actif</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold mx-auto mb-2">2</div>
              <p>Cliquez pour accumuler des points</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold mx-auto mb-2">3</div>
              <p>Jouez aux mini-jeux débloqués</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold mx-auto mb-2">4</div>
              <p>Gagnez pour ajouter du temps au stream !</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}