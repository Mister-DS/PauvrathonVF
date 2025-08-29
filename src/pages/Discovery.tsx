import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Navigation } from '@/components/Navigation';
import { FollowButton } from '@/components/FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { useStreamers } from '@/hooks/useStreamers';
import { supabase } from '@/integrations/supabase/client';
import { 
  Radio, 
  Eye, 
  Users, 
  Clock, 
  Trophy, 
  Search,
  RefreshCw,
  AlertCircle,
  Square,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

export default function Discovery() {
  const { user } = useAuth();
  const { streamers, loading, refetch } = useStreamers();
  const [filter, setFilter] = useState<'all' | 'live'>('all');
  const [twitchStreamers, setTwitchStreamers] = useState<any[]>([]);
  const [loadingTwitch, setLoadingTwitch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrer les streamers locaux (Pauvrathon)
  const filteredStreamers = streamers.filter(streamer => {
    if (filter === 'live') return streamer.is_live;
    return true;
  });

  // Rechercher les streamers Twitch avec "subathon" dans le titre
  const searchTwitchStreamers = async () => {
    setLoadingTwitch(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-twitch-streams', {
        body: { query: 'subathon' }
      });

      if (error) throw error;
      
      if (data && data.streams) {
        setTwitchStreamers(data.streams);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche de streams Twitch:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les streams Twitch.",
        variant: "destructive",
      });
    } finally {
      setLoadingTwitch(false);
    }
  };

  // Charger les streamers Twitch au chargement de la page
  useEffect(() => {
    searchTwitchStreamers();
  }, []);

  // Fonction pour actualiser toutes les données
  const handleRefresh = () => {
    refetch();
    searchTwitchStreamers();
  };

  if (loading && loadingTwitch) {
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

        <Tabs defaultValue="pauvrathon" className="w-full mb-8">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="pauvrathon">Streamers Pauvrathon</TabsTrigger>
              <TabsTrigger value="twitch">Subathons Twitch</TabsTrigger>
            </TabsList>
            
            <Button
              variant="outline"
              onClick={handleRefresh}
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {/* Section Streamers Pauvrathon */}
          <TabsContent value="pauvrathon">
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
            </div>

            {/* Streamers Pauvrathon Grid */}
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
                            {Math.floor((streamer.total_time_added || 0) / 60)}:{String((streamer.total_time_added || 0) % 60).padStart(2, '0')}
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
                          <Link to={`/subathon/${streamer.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            Participer
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Section Streamers Twitch avec Subathon */}
          <TabsContent value="twitch">
            {/* Search bar */}
            <div className="mb-6">
              <div className="flex gap-2">
                <Input 
                  placeholder="Rechercher des streams..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={searchTwitchStreamers}
                  disabled={loadingTwitch}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Rechercher
                </Button>
              </div>
            </div>

            {/* Twitch Streamers Grid */}
            {loadingTwitch ? (
              <div className="animate-pulse space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-64 bg-muted rounded" />
                  ))}
                </div>
              </div>
            ) : twitchStreamers.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun stream trouvé</h3>
                  <p className="text-muted-foreground">
                    Aucun streamer avec "subathon" dans le titre n'a été trouvé sur Twitch.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {twitchStreamers
                  .filter(stream => 
                    !searchQuery || 
                    stream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    stream.user_name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((stream) => (
                    <Card key={stream.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <CardContent className="p-0">
                        {/* Thumbnail */}
                        <div className="relative">
                          <img 
                            src={stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248')} 
                            alt={stream.title}
                            className="w-full h-auto"
                          />
                          <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                            <Radio className="w-3 h-3 mr-1" />
                            {stream.viewer_count} spectateurs
                          </Badge>
                        </div>

                        <div className="p-4">
                          {/* Header with Avatar and Name */}
                          <div className="flex items-center space-x-3 mb-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {stream.user_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h3 className="font-semibold">{stream.user_name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {stream.game_name}
                              </p>
                            </div>
                          </div>

                          {/* Stream Title */}
                          <p className="text-sm line-clamp-2 mb-4">
                            {stream.title}
                          </p>

                          {/* Actions */}
                          <Button 
                            asChild 
                            variant="outline" 
                            className="w-full"
                          >
                            <a href={`https://twitch.tv/${stream.user_login}`} target="_blank" rel="noopener noreferrer">
                              <ArrowUpRight className="w-4 h-4 mr-2" />
                              Voir sur Twitch
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}

            <div className="mt-6 text-center text-muted-foreground text-sm">
              <p>
                Ces streams sont en direct sur Twitch avec "subathon" dans leur titre. 
                Ils ne sont pas nécessairement affiliés à notre plateforme.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}