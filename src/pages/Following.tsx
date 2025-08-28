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
import { Heart, Users, Clock, Gamepad2, Radio, Power, Tv, Trophy } from 'lucide-react';

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
  tag_ids: string[];
}

export default function Following() {
  const { user } = useAuth();
  const { liveStreamers, offlineStreamers, loading } = useFollowedStreamers();
  const [twitchLiveStreamers, setTwitchLiveStreamers] = useState<TwitchStream[]>([]);
  const [loadingTwitch, setLoadingTwitch] = useState(true);
  const [pauvrathonStreamers, setPauvrathonStreamers] = useState<any[]>([]);

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchTwitchFollowedStreams();
    fetchPauvrathonStreamers();
  }, []);

  const fetchTwitchFollowedStreams = async () => {
    try {
      setLoadingTwitch(true);
      // Appel à votre API backend qui utilise l'API Twitch
      const response = await fetch('/api/twitch/followed-streams', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTwitchLiveStreamers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching Twitch followed streams:', error);
    } finally {
      setLoadingTwitch(false);
    }
  };

  const fetchPauvrathonStreamers = async () => {
    try {
      const { data, error } = await supabase
        .from('streamers')
        .select(`
          *,
          profiles(*),
          follows!inner(user_id)
        `)
        .eq('follows.user_id', user?.id);

      if (error) throw error;

      setPauvrathonStreamers(data || []);
    } catch (error) {
      console.error('Error fetching pauvrathon streamers:', error);
    }
  };

  const totalFollowed = liveStreamers.length + offlineStreamers.length;
  const totalTwitchLive = twitchLiveStreamers.length;

  const renderTwitchStreamerCard = (stream: TwitchStream) => (
    <Card key={stream.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage 
                src={stream.thumbnail_url?.replace('{width}x{height}', '70x70')} 
                alt={stream.user_name} 
              />
              <AvatarFallback>
                {stream.user_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background bg-red-500 animate-pulse" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">
              {stream.user_name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              @{stream.user_login}
            </p>
          </div>
          <Badge variant="default" className="bg-red-500 text-white">
            EN DIRECT
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p className="font-medium text-primary">{stream.game_name}</p>
          <p className="text-muted-foreground mt-1">{stream.title}</p>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{stream.viewer_count.toLocaleString()} spectateurs</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Depuis {new Date(stream.started_at).toLocaleTimeString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" className="w-full">
            <a href={`https://twitch.tv/${stream.user_login}`} target="_blank" rel="noopener noreferrer">
              <Tv className="w-4 h-4 mr-2" />
              Regarder sur Twitch
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPauvrathonStreamerCard = (streamer: any, isLive: boolean) => (
    <Card key={streamer.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage 
                src={streamer.profile?.avatar_url} 
                alt={streamer.profile?.twitch_display_name} 
              />
              <AvatarFallback>
                {streamer.profile?.twitch_display_name?.charAt(0) || 'S'}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
              isLive ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">
              {streamer.profile?.twitch_display_name || 'Streamer'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              @{streamer.profile?.twitch_username}
            </p>
          </div>
          <Badge variant={isLive ? 'default' : 'secondary'} className="bg-purple-600">
            <Trophy className="w-3 h-3 mr-1" />
            Pauvrathon
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>+{streamer.time_increment}s par victoire</span>
          </div>
          <Badge variant={isLive ? 'default' : 'secondary'}>
            {isLive ? 'En direct' : 'Hors ligne'}
          </Badge>
        </div>
        
        {isLive && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Clics actuels:</span>
                <span className="font-medium">
                  {streamer.current_clicks}/{streamer.clicks_required}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(streamer.current_clicks / streamer.clicks_required) * 100}%` 
                  }}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Gamepad2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {streamer.active_minigames?.length || 0} mini-jeux actifs
              </span>
            </div>
          </>
        )}

        {streamer.stream_title && (
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
            {streamer.stream_title}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <FollowButton streamerId={streamer.id} showCount />
          {isLive && (
            <Link to={`/streamer/${streamer.id}`}>
              <Button className="w-full">
                <Trophy className="w-4 h-4 mr-2" />
                Participer au Pauvrathon
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Mes Suivis</h1>
          <p className="text-muted-foreground">
            Vos streamers suivis sur Twitch et leur participation au Pauvrathon
          </p>
        </div>

        {/* PARTIE 1: Streamers Twitch en direct via API */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <Tv className="h-6 w-6 text-purple-500" />
              <h2 className="text-2xl font-semibold">Streamers Twitch en direct</h2>
              <Badge variant="outline" className="text-purple-500 border-purple-500">
                {totalTwitchLive} en ligne
              </Badge>
            </div>

            {loadingTwitch ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <div className="rounded-full bg-muted h-12 w-12" />
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-24" />
                          <div className="h-3 bg-muted rounded w-16" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded w-3/4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : twitchLiveStreamers.length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <Radio className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Aucun streamer Twitch en direct
                </h3>
                <p className="text-muted-foreground">
                  Aucun de vos streamers suivis sur Twitch n'est actuellement en ligne.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {twitchLiveStreamers.map((stream) => renderTwitchStreamerCard(stream))}
              </div>
            )}
          </div>

          {/* PARTIE 2: Streamers du Pauvrathon */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <Trophy className="h-6 w-6 text-orange-500" />
              <h2 className="text-2xl font-semibold">Pauvrathon - Mes Suivis</h2>
              <Badge variant="outline" className="text-orange-500 border-orange-500">
                {totalFollowed} streamers
              </Badge>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <div className="rounded-full bg-muted h-12 w-12" />
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-24" />
                          <div className="h-3 bg-muted rounded w-16" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded w-3/4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : totalFollowed === 0 ? (
              <div className="text-center py-12">
                <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Aucun streamer Pauvrathon suivi
                </h3>
                <p className="text-muted-foreground mb-6">
                  Vous ne suivez aucun streamer participant au Pauvrathon. Découvrez-en !
                </p>
                <Button asChild>
                  <Link to="/decouverte">Découvrir des Streamers</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Streamers Pauvrathon en direct */}
                {liveStreamers.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Radio className="h-5 w-5 text-green-500" />
                      <h3 className="text-lg font-semibold">En direct ({liveStreamers.length})</h3>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {liveStreamers.map((streamer) => renderPauvrathonStreamerCard(streamer, true))}
                    </div>
                  </div>
                )}

                {/* Streamers Pauvrathon hors ligne */}
                {offlineStreamers.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Power className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-semibold">Hors ligne ({offlineStreamers.length})</h3>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {offlineStreamers.map((streamer) => renderPauvrathonStreamerCard(streamer, false))}
                    </div>
                  </div>
                )}

                {/* Message si seulement des streamers hors ligne */}
                {liveStreamers.length === 0 && offlineStreamers.length > 0 && (
                  <div className="text-center py-8 bg-muted/30 rounded-lg">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      Aucun de vos streamers Pauvrathon suivis n'est actuellement en direct.
                    </p>
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