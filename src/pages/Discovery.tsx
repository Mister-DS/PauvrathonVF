import { useState, useEffect, useCallback } from 'react';
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
  Clock,
  Trophy,
  Search,
  RefreshCw,
  AlertCircle,
  Square,
  ArrowUpRight,
  Filter,
  Globe,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

// Interfaces pour un typage plus précis
interface PauvrathonStreamer {
  id: string;
  is_live: boolean;
  status?: string;
  stream_title?: string;
  current_clicks: number;
  clicks_required: number;
  total_time_added: number;
  profile?: {
    avatar_url?: string;
    twitch_display_name?: string;
    twitch_username?: string;
  };
  profiles?: {
    avatar_url?: string;
    twitch_display_name?: string;
    twitch_username?: string;
  };
}

interface TwitchStream {
  id: string;
  user_id: string;
  user_name: string;
  user_login: string;
  display_name?: string;
  title: string;
  game_name?: string;
  viewer_count: number;
  thumbnail_url: string;
  started_at: string;
  language?: string;
  tags?: string[];
}

type FilterType = 'all' | 'live';

// Langues les plus courantes sur Twitch
const LANGUAGES = [
  { code: 'all', name: 'Toutes les langues', flag: '🌍' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' }
];

// Composants de Rendu pour la lisibilité
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-16">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <Card className="text-center py-8">
    <CardContent>
      <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const formatStreamDuration = (startedAt: string): string => {
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

// Fonction pour obtenir l'URL de l'avatar d'un streamer.
const getStreamerAvatar = (streamer: PauvrathonStreamer): string => {
  const profileData = streamer.profile || streamer.profiles;
  const displayName = profileData?.twitch_display_name || profileData?.twitch_username || 'Streamer';

  return (
    profileData?.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`
  );
};

// Fonction pour obtenir le nom d'affichage d'un streamer.
const getStreamerDisplayName = (streamer: PauvrathonStreamer): string => {
  const profileData = streamer.profile || streamer.profiles;
  return (
    profileData?.twitch_display_name ||
    profileData?.twitch_username ||
    'Streamer inconnu'
  );
};

export default function Discovery() {
  const { user } = useAuth();
  const { streamers, loading: loadingPauvrathon, refetch } = useStreamers();
  const [filter, setFilter] = useState<FilterType>('all'); // Changé de 'live' à 'all' par défaut
  const [twitchStreamers, setTwitchStreamers] = useState<TwitchStream[]>([]);
  const [loadingTwitch, setLoadingTwitch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [searchTerm, setSearchTerm] = useState('subathon');
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  // Debug: Log des streamers reçus
  useEffect(() => {
    console.log('Streamers reçus:', streamers);
    console.log('Loading:', loadingPauvrathon);
  }, [streamers, loadingPauvrathon]);

  // Fonction de debounce manuelle pour éviter les dépendances externes
  const debouncedSearch = useCallback(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    const timeout = setTimeout(() => {
      searchTwitchStreamers();
    }, 500);
    
    setDebounceTimeout(timeout);
  }, [searchQuery, selectedLanguage, searchTerm]);

  const searchTwitchStreamers = useCallback(async () => {
    setLoadingTwitch(true);
    try {
      const termToSearch = searchQuery.trim() || searchTerm;
      
      if (!termToSearch.trim()) {
        setTwitchStreamers([]);
        return;
      }

      const { data, error } = await supabase.functions.invoke('search-twitch-streams', {
        body: {
          query: termToSearch,
          language: selectedLanguage === 'all' ? undefined : selectedLanguage,
        },
      });

      if (error) throw error;

      if (data && data.streams) {
        setTwitchStreamers(data.streams as TwitchStream[]);
        toast({
          title: 'Recherche terminée',
          description: `${data.streams.length} stream(s) trouvé(s) pour "${termToSearch}"${
            selectedLanguage !== 'all' ? ` en ${LANGUAGES.find(l => l.code === selectedLanguage)?.name}` : ''
          }`,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la recherche de streams Twitch:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer les streams Twitch.',
        variant: 'destructive',
      });
    } finally {
      setLoadingTwitch(false);
    }
  }, [searchQuery, searchTerm, selectedLanguage]);

  useEffect(() => {
    debouncedSearch();
    
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debouncedSearch]);

  const handleRefresh = () => {
    refetch();
    searchTwitchStreamers();
  };

  const handleCustomSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Terme de recherche vide',
        description: 'Veuillez entrer un terme de recherche.',
        variant: 'destructive',
      });
      return;
    }
    setSearchTerm(searchQuery);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
  };

  const handleQuickSearch = (term: string) => {
    setSearchTerm(term);
    setSearchQuery(term);
  };

  // Conversion des streamers au bon type - CORRIGÉE
  const typedStreamers: PauvrathonStreamer[] = (streamers || []).map(streamer => {
    console.log('Mapping streamer:', streamer); // Debug
    return {
      id: streamer.id,
      is_live: streamer.is_live || streamer.status === 'live', // Vérifier les deux champs
      status: streamer.status,
      stream_title: streamer.stream_title,
      current_clicks: streamer.current_clicks || 0,
      clicks_required: streamer.clicks_required || 100,
      total_time_added: streamer.total_time_added || 0,
      profile: streamer.profile,
      profiles: streamer.profiles
    };
  });

  // Filtrage des streamers - CORRIGÉ
  const filteredStreamers = typedStreamers.filter(streamer => {
    console.log(`Streamer ${streamer.id}: is_live=${streamer.is_live}, status=${streamer.status}, filter=${filter}`); // Debug
    
    if (filter === 'live') {
      return streamer.is_live || streamer.status === 'live';
    }
    return true; // Pour 'all', on affiche tous les streamers
  });

  console.log('Streamers filtrés:', filteredStreamers); // Debug

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
            Découverte
          </h1>
          <p className="text-muted-foreground">
            Découvrez les streamers actifs et participez à leurs pauvrathons
          </p>
        </div>

        <Tabs defaultValue="pauvrathon" className="w-full mb-8">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="pauvrathon">Streamers Pauvrathon</TabsTrigger>
              <TabsTrigger value="twitch">Subathons Twitch</TabsTrigger>
            </TabsList>

            <Button variant="outline" onClick={handleRefresh} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>

          <TabsContent value="pauvrathon">
            <div className="flex justify-between items-center mb-6">
              <div className="flex space-x-2">
                <Button 
                  variant={filter === 'all' ? 'default' : 'outline'} 
                  onClick={() => setFilter('all')} 
                  size="sm"
                >
                  Tous ({typedStreamers.length})
                </Button>
                <Button
                  variant={filter === 'live' ? 'default' : 'outline'}
                  onClick={() => setFilter('live')}
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <Radio className="w-4 h-4 text-red-500" />
                  <span>En live ({typedStreamers.filter(s => s.is_live || s.status === 'live').length})</span>
                </Button>
              </div>
            </div>

            {/* Debug info - à supprimer après tests */}
            <div className="mb-4 p-3 bg-muted rounded text-sm">
              <p>Debug: {streamers?.length || 0} streamers total, {filteredStreamers.length} après filtrage</p>
              <p>Filter actuel: {filter}</p>
            </div>

            {loadingPauvrathon ? (
              <LoadingSpinner />
            ) : filteredStreamers.length === 0 ? (
              <EmptyState
                title="Aucun streamer trouvé"
                description={
                  filter === 'live'
                    ? 'Aucun streamer n\'est actuellement en live.'
                    : streamers?.length === 0 
                    ? 'Aucun streamer enregistré sur la plateforme.'
                    : 'Erreur de filtrage des streamers.'
                }
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredStreamers.map(streamer => (
                  <Card
                    key={streamer.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow border-2 border-primary/20"
                  >
                    <CardContent className="p-6">
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
                            {(streamer.is_live || streamer.status === 'live') ? (
                              <Badge className="bg-red-500 text-white">
                                <Radio className="w-3 h-3 mr-1" />
                                En live
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Square className="w-3 h-3 mr-1" />
                                {streamer.status === 'offline' ? 'Hors ligne' : 
                                 streamer.status === 'paused' ? 'En pause' :
                                 streamer.status === 'ended' ? 'Terminé' : 'Hors ligne'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {streamer.stream_title && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{streamer.stream_title}</p>
                      )}

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
                            {Math.floor((streamer.total_time_added || 0) / 60)}:
                            {String((streamer.total_time_added || 0) % 60).padStart(2, '0')}
                          </span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        {user && <FollowButton streamerId={streamer.id} />}
                        <Button asChild variant="outline" className="flex-1">
                          <Link to={`/streamer/${streamer.id}`}>
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

          <TabsContent value="twitch">
            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher des streams (ex: subathon, marathon, 24h...)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1"
                  onKeyPress={e => e.key === 'Enter' && handleCustomSearch()}
                />
                <Button onClick={handleCustomSearch} disabled={loadingTwitch}>
                  <Search className="w-4 h-4 mr-2" />
                  Rechercher
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-muted-foreground flex items-center">
                  <Filter className="w-4 h-4 mr-1" />
                  Recherches rapides:
                </span>

                {['subathon', 'marathon', '24h stream', 'charity stream', 'endurance'].map(term => (
                  <Button
                    key={term}
                    variant={searchTerm === term ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleQuickSearch(term)}
                  >
                    {term}
                  </Button>
                ))}

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <span>{LANGUAGES.find(l => l.code === selectedLanguage)?.flag}</span>
                          <span>{LANGUAGES.find(l => l.code === selectedLanguage)?.name}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(language => (
                        <SelectItem key={language.code} value={language.code}>
                          <div className="flex items-center gap-2">
                            <span>{language.flag}</span>
                            <span>{language.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Recherche actuelle: <span className="font-medium">"{searchTerm}"</span>
                {selectedLanguage !== 'all' && (
                  <span>
                    {' '}
                    en <span className="font-medium">{LANGUAGES.find(l => l.code === selectedLanguage)?.name}</span>
                  </span>
                )}
              </div>
            </div>

            {loadingTwitch ? (
              <LoadingSpinner />
            ) : twitchStreamers.length === 0 ? (
              <EmptyState
                title="Aucun stream trouvé"
                description={`Aucun streamer avec "${searchTerm}" dans le titre n'a été trouvé${
                  selectedLanguage !== 'all' ? ` en ${LANGUAGES.find(l => l.code === selectedLanguage)?.name}` : ''
                }.`}
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {twitchStreamers.map(stream => (
                  <Card key={stream.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <div className="relative">
                        <img
                          src={stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248')}
                          alt={stream.title}
                          className="w-full h-auto"
                          onError={e => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/440x248/667eea/ffffff?text=Stream+Live';
                          }}
                        />
                        <div className="absolute top-2 left-2 flex gap-2">
                          <Badge className="bg-red-500 text-white">
                            <Radio className="w-3 h-3 mr-1" />
                            {stream.viewer_count.toLocaleString()} spectateurs
                          </Badge>
                          {stream.language && (
                            <Badge variant="secondary">
                              {LANGUAGES.find(l => l.code === stream.language)?.flag || '🌍'}
                              {stream.language.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        {stream.started_at && (
                          <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatStreamDuration(stream.started_at)}
                          </Badge>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(stream.user_name)}`} 
                              alt={stream.user_name} 
                            />
                            <AvatarFallback>{stream.user_name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold">{stream.display_name || stream.user_name}</h3>
                            <p className="text-xs text-muted-foreground">{stream.game_name || 'Juste bavardage'}</p>
                          </div>
                        </div>

                        <p className="text-sm line-clamp-2 mb-4 leading-relaxed">{stream.title}</p>

                        {stream.tags && stream.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {stream.tags.slice(0, 3).map((tag: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {stream.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{stream.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        <Button asChild variant="outline" className="w-full">
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
                Ces streams sont en direct sur Twitch avec "{searchTerm}" dans leur titre. Ils ne sont pas
                nécessairement affiliés à notre plateforme.
              </p>
              <p className="mt-1">
                Résultats: {twitchStreamers.length} stream(s) - Langue:{' '}
                {LANGUAGES.find(l => l.code === selectedLanguage)?.name}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}