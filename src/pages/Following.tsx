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
  Eye, 
  Clock, 
  Trophy, 
  RefreshCw,
  AlertCircle,
  Square,
  ArrowUpRight,
  Heart,
  ExternalLink,
  Loader2, // Import du loader pour un meilleur rendu
  Play
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Utilisation d'interfaces pour un typage précis et une meilleure lisibilité
interface PauvrathonStreamer {
  id: string;
  is_live: boolean;
  stream_title?: string;
  current_clicks: number;
  clicks_required: number;
  total_time_added: number;
  initial_duration?: number;
  status: 'live' | 'paused' | 'offline'; // Correction : status est un string
  profile?: {
    twitch_display_name?: string;
    twitch_username?: string;
    avatar_url?: string;
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

// Hook personnalisé pour gérer la logique de récupération des follows
// C'est une bonne pratique pour isoler la logique de données du composant UI
const useFollowedStreamers = (user: any) => {
  const [pauvrathonFollows, setPauvrathonFollows] = useState<PauvrathonStreamer[]>([]);
  const [twitchFollows, setTwitchFollows] = useState<TwitchStream[]>([]);
  const [loadingPauvrathon, setLoadingPauvrathon] = useState(true);
  const [loadingTwitch, setLoadingTwitch] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fonction de récupération des follows Pauvrathon, encapsulée dans useCallback pour la mémoïsation
  const fetchPauvrathonFollows = useCallback(async () => {
    try {
      setLoadingPauvrathon(true);
      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          streamers!inner (
            id,
            is_live,
            stream_title,
            current_clicks,
            clicks_required,
            total_time_added,
            status,
            initial_duration,
            profiles!inner (
              twitch_display_name,
              twitch_username,
              avatar_url
            )
          )
        `)
        .eq('follower_user_id', user.id);

      if (error) throw error;
      
      const followedStreamers = (data || []).map(f => {
        const streamer = f.streamers;
        if (!streamer || !streamer.profiles) return null;
        return {
          ...streamer,
          profile: streamer.profiles
        };
      }).filter(Boolean);
      
      // Prioriser les streamers en live
      const sortedStreamers = followedStreamers.sort((a, b) => {
        if (a.is_live && !b.is_live) return -1;
        if (!a.is_live && b.is_live) return 1;
        return 0;
      });

      setPauvrathonFollows(sortedStreamers);
      
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
  }, [user]);

  // Fonction de récupération des follows Twitch, encapsulée dans useCallback
  const fetchTwitchFollows = useCallback(async () => {
    try {
      setLoadingTwitch(true);
      // Utilisation de l'Edge Function, mais en passant le token de l'utilisateur
      const { data: twitchData, error: twitchError } = await supabase.functions.invoke('get-twitch-follows', {
        body: { userId: user.id }
      });

      if (twitchError) throw twitchError;
      
      const follows = twitchData?.streams || [];
      setTwitchFollows(follows as TwitchStream[]);
      
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
  }, [user]);

  // Fonction pour tout actualiser
  const handleRefresh = useCallback(async () => {
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
  }, [fetchPauvrathonFollows, fetchTwitchFollows]);

  // Effet pour le chargement initial et la souscription aux changements
  useEffect(() => {
    if (user) {
      fetchPauvrathonFollows();
      fetchTwitchFollows();
      
      // Souscription aux changements pour les follows Pauvrathon
      const subscription = supabase
        .channel(`following_channel_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_follows', filter: `follower_user_id=eq.${user.id}` },
          () => {
            fetchPauvrathonFollows();
          }
        )
        .subscribe();
      
      // Retourne une fonction de nettoyage
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user, fetchPauvrathonFollows, fetchTwitchFollows]);

  return { 
    pauvrathonFollows, 
    twitchFollows, 
    loadingPauvrathon, 
    loadingTwitch, 
    refreshing, 
    handleRefresh 
  };
};

export default function FollowsPage() {
  const { user } = useAuth();
  
  // Utilisation du hook personnalisé pour la logique
  const { 
    pauvrathonFollows, 
    twitchFollows, 
    loadingPauvrathon, 
    loadingTwitch, 
    refreshing, 
    handleRefresh 
  } = useFollowedStreamers(user);

  // Redirection si l'utilisateur n'est pas connecté
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Fonctions d'aide pour le rendu
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
  
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-16">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
  
  const EmptyState = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
    <Card className="text-center py-12">
      <CardContent>
        {icon}
        <h3 className="text-xl font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
        <Button asChild className="mt-4">
          <Link to="/discovery">
            <Eye className="w-4 h-4 mr-2" />
            Découvrir des streamers
          </Link>
        </Button>
      </CardContent>
    </Card>
  );

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
              <LoadingSpinner />
            ) : pauvrathonFollows.length === 0 ? (
              <EmptyState
                icon={<Heart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />}
                title="Aucun follow Pauvrathon"
                description="Vous ne suivez aucun streamer Pauvrathon pour le moment."
              />
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
                            <Link to={`/streamer/${streamer.id}`} className="hover:underline">
                              {getStreamerDisplayName(streamer)}
                            </Link>
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

                        {streamer.initial_duration && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center">
                              <Play className="w-4 h-4 mr-1 text-purple-500" />
                              Durée initiale
                            </span>
                            <span className="font-medium">
                              {formatTime(streamer.initial_duration)}
                            </span>
                          </div>
                        )}

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
              <LoadingSpinner />
            ) : twitchFollows.length === 0 ? (
              <EmptyState
                icon={<Radio className="mx-auto h-16 w-16 text-muted-foreground mb-4" />}
                title="Aucun follow Twitch en live"
                description="Aucun de vos follows Twitch n'est actuellement en direct, ou vous n'avez pas encore connecté votre compte Twitch."
              />
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