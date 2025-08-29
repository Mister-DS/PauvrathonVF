import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Streamer, SubathonStats } from '@/types';
import { 
  Settings, 
  Clock, 
  MousePointer, 
  Timer, 
  Gamepad2, 
  Trophy,
  Users,
  Star,
  Save,
  Play,
  Pause,
  RotateCcw,
  Dice1
} from 'lucide-react';

interface Minigame {
  id: string;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

export default function StreamerPanel() {
  const { user, profile } = useAuth();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [stats, setStats] = useState<SubathonStats[]>([]);
  const [availableMinigames, setAvailableMinigames] = useState<Minigame[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    time_increment: 30,
    clicks_required: 100,
    cooldown_seconds: 300,
    status: 'offline' as 'live' | 'paused' | 'offline' | 'ended',
    time_mode: 'fixed' as 'fixed' | 'random',
    max_random_time: 60,
    initial_duration: 7200, // 2 heures par défaut
    active_minigames: [] as string[],
  });
  
  // Configuration du temps initial
  const [initialHours, setInitialHours] = useState(2);
  const [initialMinutes, setInitialMinutes] = useState(0);

  // Redirect if not authenticated or not a streamer
  if (!user || (profile?.role !== 'streamer' && profile?.role !== 'admin')) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchStreamerData();
    fetchStats();
    fetchAvailableMinigames();
    
    // Set up real-time updates for streamer data
    const interval = setInterval(() => {
      fetchStreamerData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  const fetchStreamerData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('streamers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setStreamer(data as Streamer);
        
        // Calculer les heures et minutes depuis initial_duration
        const duration = data.initial_duration || 7200;
        setInitialHours(Math.floor(duration / 3600));
        setInitialMinutes(Math.floor((duration % 3600) / 60));
        
        setSettings({
          time_increment: data.time_increment,
          clicks_required: data.clicks_required,
          cooldown_seconds: data.cooldown_seconds,
          status: (data.status as 'live' | 'paused' | 'offline' | 'ended') || 'offline',
          time_mode: (data.time_mode as 'fixed' | 'random') || 'fixed',
          max_random_time: data.max_random_time || 60,
          initial_duration: duration,
          active_minigames: data.active_minigames || [],
        });
      }
    } catch (error) {
      console.error('Error fetching streamer data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos données de streamer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMinigames = async () => {
    try {
      const { data, error } = await supabase
        .from('minigames')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      setAvailableMinigames(data || []);
    } catch (error) {
      console.error('Error fetching minigames:', error);
    }
  };

  const fetchStats = async () => {
    if (!streamer) return;

    try {
      const { data, error } = await supabase
        .from('subathon_stats')
        .select('*')
        .eq('streamer_id', streamer.id)
        .order('time_contributed', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setStats(data || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!streamer) return;

    setSaving(true);
    try {
      // Calculer initial_duration à partir des heures/minutes
      const calculatedDuration = (initialHours * 3600) + (initialMinutes * 60);
      
      const updatedSettings = {
        ...settings,
        initial_duration: calculatedDuration
      };

      const { error } = await supabase
        .from('streamers')
        .update(updatedSettings)
        .eq('id', streamer.id);

      if (error) throw error;

      setStreamer(prev => prev ? { ...prev, ...updatedSettings } : null);
      
      toast({
        title: "Paramètres sauvegardés",
        description: "Vos paramètres ont été mis à jour avec succès.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMinigameToggle = (minigameCode: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      active_minigames: checked 
        ? [...prev.active_minigames, minigameCode]
        : prev.active_minigames.filter(code => code !== minigameCode)
    }));
  };

  const handleResetClicks = async () => {
    if (!streamer) return;

    try {
      const { error } = await supabase
        .from('streamers')
        .update({ current_clicks: 0 })
        .eq('id', streamer.id);

      if (error) throw error;

      setStreamer(prev => prev ? { ...prev, current_clicks: 0 } : null);
      
      toast({
        title: "Clics remis à zéro",
        description: "Le compteur de clics a été réinitialisé.",
      });
    } catch (error) {
      console.error('Error resetting clicks:', error);
      toast({
        title: "Erreur",
        description: "Impossible de remettre à zéro les clics.",
        variant: "destructive",
      });
    }
  };

  const topContributor = stats.length > 0 ? stats[0] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!streamer) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Configuration requise</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Vous devez d'abord être approuvé comme streamer pour accéder à ce panneau.
              </p>
              <Button asChild>
                <a href="/demande-streamer">Faire une demande</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text">Panneau Streamer</h1>
          <p className="text-muted-foreground">
            Gérez votre subathon et personnalisez votre expérience
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Settings */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="neon-border">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Paramètres du Subathon
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Configuration du temps initial */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-medium flex items-center">
                    <Timer className="mr-2 h-4 w-4" />
                    Temps Initial du Pauvrathon
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="initial_hours">Heures</Label>
                      <Input
                        id="initial_hours"
                        type="number"
                        min="0"
                        max="23"
                        value={initialHours}
                        onChange={(e) => setInitialHours(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="initial_minutes">Minutes</Label>
                      <Input
                        id="initial_minutes"
                        type="number"
                        min="0"
                        max="59"
                        value={initialMinutes}
                        onChange={(e) => setInitialMinutes(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Durée totale: <strong>{initialHours}h {initialMinutes}m</strong> ({(initialHours * 3600) + (initialMinutes * 60)} secondes)
                  </p>
                </div>

                {/* Time Configuration Section */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-medium flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Configuration du Temps Ajouté
                  </h3>
                  
                  <RadioGroup
                    value={settings.time_mode}
                    onValueChange={(value) => setSettings(prev => ({ 
                      ...prev, 
                      time_mode: value as 'fixed' | 'random' 
                    }))}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                      <RadioGroupItem value="fixed" id="fixed" />
                      <Label htmlFor="fixed" className="flex-1 cursor-pointer">
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          Temps fixe
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                      <RadioGroupItem value="random" id="random" />
                      <Label htmlFor="random" className="flex-1 cursor-pointer">
                        <div className="flex items-center">
                          <Dice1 className="mr-2 h-4 w-4" />
                          Temps aléatoire
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="grid md:grid-cols-2 gap-4">
                    {settings.time_mode === 'fixed' ? (
                      <div>
                        <Label htmlFor="time_increment">Temps ajouté par victoire (secondes)</Label>
                        <Input
                          id="time_increment"
                          type="number"
                          min="1"
                          max="300"
                          value={settings.time_increment}
                          onChange={(e) => setSettings(prev => ({ 
                            ...prev, 
                            time_increment: parseInt(e.target.value) || 1
                          }))}
                        />
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="max_random_time">Temps maximum aléatoire (secondes)</Label>
                        <Input
                          id="max_random_time"
                          type="number"
                          min="1"
                          max="300"
                          value={settings.max_random_time}
                          onChange={(e) => setSettings(prev => ({ 
                            ...prev, 
                            max_random_time: parseInt(e.target.value) || 1
                          }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Entre 1 et {settings.max_random_time} secondes seront ajoutées
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mini-jeux disponibles */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-medium flex items-center">
                    <Gamepad2 className="mr-2 h-4 w-4" />
                    Mini-jeux Disponibles
                  </h3>
                  
                  {availableMinigames.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun mini-jeu disponible</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {availableMinigames.map((minigame) => (
                        <div key={minigame.id} className="flex items-center space-x-3 p-3 border rounded">
                          <Checkbox
                            id={`minigame-${minigame.id}`}
                            checked={settings.active_minigames.includes(minigame.code)}
                            onCheckedChange={(checked) => 
                              handleMinigameToggle(minigame.code, checked as boolean)
                            }
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor={`minigame-${minigame.id}`} 
                              className="cursor-pointer font-medium"
                            >
                              {minigame.name}
                            </Label>
                            {minigame.description && (
                              <p className="text-sm text-muted-foreground">
                                {minigame.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Other Settings */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clicks_required">Clics requis pour mini-jeu</Label>
                    <Input
                      id="clicks_required"
                      type="number"
                      min="10"
                      max="1000"
                      value={settings.clicks_required}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        clicks_required: parseInt(e.target.value) || 10
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cooldown_seconds">Cooldown après mini-jeu (secondes)</Label>
                    <Input
                      id="cooldown_seconds"
                      type="number"
                      min="0"
                      max="3600"
                      value={settings.cooldown_seconds}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        cooldown_seconds: parseInt(e.target.value) || 0
                      }))}
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button 
                    onClick={handleSaveSettings} 
                    disabled={saving}
                    className="neon-glow"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleResetClicks}
                    className="neon-border"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Clics
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Status */}
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="mr-2 h-5 w-5" />
                  Statut Actuel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {streamer.current_clicks}
                    </div>
                    <p className="text-sm text-muted-foreground">Clics actuels</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">
                      {streamer.total_time_added}s
                    </div>
                    <p className="text-sm text-muted-foreground">Temps ajouté</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {Math.floor((streamer.initial_duration || 7200) / 3600)}h{Math.floor(((streamer.initial_duration || 7200) % 3600) / 60)}m
                    </div>
                    <p className="text-sm text-muted-foreground">Temps initial</p>
                  </div>
                  
                  <div className="text-center">
                    <Badge variant={
                      streamer.status === 'live' ? 'default' : 
                      streamer.status === 'paused' ? 'secondary' : 
                      streamer.status === 'ended' ? 'destructive' : 'outline'
                    } className="pulse-neon">
                      {streamer.status === 'live' ? 'En direct' : 
                       streamer.status === 'paused' ? 'En pause' :
                       streamer.status === 'ended' ? 'Terminé' : 'Hors ligne'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Stats - même contenu que l'original */}
          <div className="space-y-6">
            {/* Top Contributor */}
            <Card className="neon-border">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="mr-2 h-5 w-5" />
                  Meilleur Contributeur
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topContributor ? (
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">
                      {topContributor.player_twitch_username || 'Anonyme'}
                    </div>
                    <div className="text-2xl font-bold mt-2">
                      {topContributor.time_contributed}s
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {topContributor.games_won} victoires sur {topContributor.games_played} parties
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-2" />
                    <p>Aucun contributeur pour le moment</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions - mêmes actions que l'original mais simplifiées */}
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full neon-border"
                  asChild
                >
                  <a href={`/subathon/${streamer.id}`} target="_blank">
                    <Play className="mr-2 h-4 w-4" />
                    Voir ma page Pauvrathon
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      
      // Appel à la fonction Supabase pour rechercher des streams avec "subathon"
      const { data, error } = await supabase.functions.invoke('search-twitch-streams');

      if (error) {
        console.error('Erreur recherche streams Twitch:', error);
        // Fallback avec données mockées si l'API échoue
        const fallbackStreams: TwitchStream[] = [
          {
            id: 'fallback1',
            user_id: '12345',
            user_login: 'mister_ds_',
            user_name: 'Mister_DS_',
            game_name: 'Just Chatting',
            title: 'SUBATHON EN COURS ! Participez au Pauvrathon !',
            viewer_count: 1250,
            started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            thumbnail_url: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_mister_ds_-320x180.jpg',
            profile_image_url: 'https://static-cdn.jtvnw.net/jtv_user_pictures/mister_ds_-profile_image.png'
          }
        ];
        setTwitchStreams(fallbackStreams);
        return;
      }

      // Utiliser les vrais streams trouvés
      setTwitchStreams(data?.streams || []);
      
      if (data?.streams?.length > 0) {
        console.log(`Trouvé ${data.streams.length} streams avec subathon/pauvrathon`);
      }
      
    } catch (error) {
      console.error('Erreur chargement streams Twitch:', error);
      setTwitchStreams([]);
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