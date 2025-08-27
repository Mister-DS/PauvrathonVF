import { Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navigation } from '@/components/Navigation';
import { FollowButton } from '@/components/FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowedStreamers } from '@/hooks/useFollowedStreamers';
import { Heart, Users, Clock, Gamepad2, Radio, Power } from 'lucide-react';

export default function Following() {
  const { user } = useAuth();
  const { liveStreamers, offlineStreamers, loading } = useFollowedStreamers();

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const totalFollowed = liveStreamers.length + offlineStreamers.length;

  const renderStreamerCard = (streamer: any, isLive: boolean) => (
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
                {streamer.active_minigames.length} mini-jeux actifs
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
                Participer au Subathon
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
          <h1 className="text-3xl font-bold mb-4">Mes Suivis Twitch & Pauvrathon</h1>
          <p className="text-muted-foreground">
            Vos streamers suivis sur Twitch et leur statut de subathon Pauvrathon ({totalFollowed} streamers)
          </p>
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
              Aucun streamer suivi
            </h3>
            <p className="text-muted-foreground mb-6">
              Vous ne suivez aucun streamer pour le moment. Découvrez de nouveaux streamers !
            </p>
            <Button asChild>
              <Link to="/decouverte">Découvrir des Streamers</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Streamers en direct */}
            {liveStreamers.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-6">
                  <Radio className="h-5 w-5 text-green-500" />
                  <h2 className="text-xl font-semibold">En direct ({liveStreamers.length})</h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {liveStreamers.map((streamer) => renderStreamerCard(streamer, true))}
                </div>
              </div>
            )}

            {/* Streamers hors ligne */}
            {offlineStreamers.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-6">
                  <Power className="h-5 w-5 text-gray-400" />
                  <h2 className="text-xl font-semibold">Hors ligne ({offlineStreamers.length})</h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {offlineStreamers.map((streamer) => renderStreamerCard(streamer, false))}
                </div>
              </div>
            )}

            {/* Message si seulement des streamers hors ligne */}
            {liveStreamers.length === 0 && offlineStreamers.length > 0 && (
              <div className="text-center py-8 bg-muted rounded-lg">
                <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  Aucun de vos streamers suivis n'est actuellement en direct.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}