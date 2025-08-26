import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    streamer.profile?.twitch_username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Découverte des Streamers</h1>
          <p className="text-muted-foreground mb-6">
            Explorez les streamers en subathon et participez à leurs aventures !
          </p>
          
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher un streamer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
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
        ) : filteredStreamers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? 'Aucun streamer trouvé' : 'Aucun streamer en ligne'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? 'Essayez avec un autre terme de recherche.'
                : 'Aucun streamer n\'est actuellement en subathon.'
              }
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStreamers.map((streamer) => (
              <Card key={streamer.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage 
                        src={streamer.profile?.avatar_url} 
                        alt={streamer.profile?.twitch_display_name} 
                      />
                      <AvatarFallback>
                        {streamer.profile?.twitch_display_name?.charAt(0) || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
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
                    <Badge variant={streamer.is_live ? 'default' : 'secondary'}>
                      {streamer.is_live ? 'En direct' : 'Hors ligne'}
                    </Badge>
                  </div>
                  
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

                  <Link to={`/streamer/${streamer.id}`}>
                    <Button className="w-full">
                      Participer au Subathon
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}