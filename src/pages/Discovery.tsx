import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Navigation } from '@/components/Navigation';
import { FollowButton } from '@/components/FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { useStreamers } from '@/hooks/useStreamers';
import { 
  Radio, 
  Eye, 
  Users, 
  Clock, 
  Trophy, 
  Search,
  RefreshCw,
  AlertCircle,
  Square
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Discovery() {
  const { user } = useAuth();
  const { streamers, loading, refetch } = useStreamers();
  const [filter, setFilter] = useState<'all' | 'live'>('all');

  const filteredStreamers = streamers.filter(streamer => {
    if (filter === 'live') return streamer.is_live;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 gradient-text">Découverte</h1>
          <p className="text-muted-foreground">
            Découvrez les streamers actifs et participez à leurs subathons
          </p>
        </div>

        {/* Filters */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              Tous
            </Button>
            <Button
              variant={filter === 'live' ? 'default' : 'outline'}
              onClick={() => setFilter('live')}
              size="sm"
              className="flex items-center space-x-1"
            >
              <Radio className="w-4 h-4 text-red-500" />
              <span>En live</span>
            </Button>
          </div>
          
          <Button
            variant="outline"
            onClick={refetch}
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Streamers Grid */}
        {filteredStreamers.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun streamer trouvé</h3>
              <p className="text-muted-foreground">
                {filter === 'live' 
                  ? 'Aucun streamer n\'est actuellement en live.'
                  : 'Aucun streamer disponible pour le moment.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredStreamers.map((streamer) => (
              <Card key={streamer.id} className="overflow-hidden hover:shadow-lg transition-shadow neon-border">
                <CardContent className="p-6">
                  {/* Header with Avatar and Status */}
                  <div className="flex items-center space-x-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={streamer.profile?.avatar_url || ''} />
                      <AvatarFallback>
                        {streamer.profile?.twitch_display_name?.charAt(0) || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {streamer.profile?.twitch_display_name || streamer.profile?.twitch_username || 'Streamer inconnu'}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {streamer.is_live ? (
                          <Badge className="bg-red-500 text-white">
                            <Radio className="w-3 h-3 mr-1" />
                            En live
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

                  {/* Stream Title */}
                  {streamer.stream_title && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {streamer.stream_title}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center">
                        <Trophy className="w-4 h-4 mr-1" />
                        Clics
                      </span>
                      <span className="font-medium">
                        {streamer.current_clicks}/{streamer.clicks_required}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Temps ajouté
                      </span>
                      <span className="font-medium">
                        {Math.floor((streamer.time_increment || 0) / 60)}:{String((streamer.time_increment || 0) % 60).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {user && (
                      <FollowButton 
                        streamerId={streamer.id}
                      />
                    )}
                    
                    <Button asChild variant="outline" className="flex-1">
                      <Link to={`/streamer/${streamer.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        Voir
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