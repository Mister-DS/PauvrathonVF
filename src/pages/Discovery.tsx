import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FollowButton } from '@/components/FollowButton';
import { useStreamers } from '@/hooks/useStreamers';
import { useStreamUpdates } from '@/hooks/useStreamUpdates';
import { Navigation } from '@/components/Navigation';
import { Search, Users, Clock, Gamepad2 } from 'lucide-react';

export default function Discovery() {
  const { streamers, loading } = useStreamers();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Auto-update stream info periodically
  useStreamUpdates();

  const filteredStreamers = streamers.filter(streamer =>
    streamer.profile?.twitch_display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    streamer.profile?.twitch_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    streamer.stream_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4 gradient-text">Découverte des Streamers</h1>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Explorez les streamers en direct et participez à leurs subathons ! Jouez aux mini-jeux et aidez vos streamers préférés.
          </p>
          
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher un streamer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 neon-border"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse glass-effect">
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
        ) : filteredStreamers.length === 0 ? (
          <div className="text-center py-12">
            <div className="glass-effect rounded-lg p-8 max-w-md mx-auto">
              <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {searchTerm ? 'Aucun streamer trouvé' : 'Aucun streamer en ligne'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Essayez avec un autre terme de recherche.'
                  : 'Aucun streamer n\'est actuellement en direct. Revenez plus tard !'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStreamers.map((streamer) => (
              <Card key={streamer.id} className="neon-border glass-effect hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <CardHeader className="relative">
                  <div className="absolute top-4 right-4">
                    <Badge variant="default" className="bg-green-500 text-white animate-pulse">
                      🔴 LIVE
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16 border-2 border-primary">
                        <AvatarImage 
                          src={streamer.profile?.avatar_url} 
                          alt={streamer.profile?.twitch_display_name} 
                        />
                        <AvatarFallback className="text-lg font-bold">
                          {streamer.profile?.twitch_display_name?.charAt(0) || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl gradient-text">
                        {streamer.profile?.twitch_display_name || 'Streamer'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        @{streamer.profile?.twitch_username}
                      </p>
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
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progression:</span>
                      <span className="font-medium text-primary">
                        {streamer.current_clicks}/{streamer.clicks_required}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all duration-500 neon-glow"
                        style={{ 
                          width: `${Math.min((streamer.current_clicks / streamer.clicks_required) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 bg-muted/30 p-2 rounded">
                    <Gamepad2 className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">
                      {streamer.active_minigames?.length || 0} mini-jeux actifs
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <FollowButton streamerId={streamer.id} showCount />
                    <Link to={`/streamer/${streamer.id}`}>
                      <Button className="w-full neon-glow pulse-neon">
                        🎮 Participer au Subathon
                      </Button>
                    </Link>
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