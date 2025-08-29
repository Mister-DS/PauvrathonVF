import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Timer, 
  Gamepad2, 
  Trophy,
  Users,
  Star,
  Save,
  Play,
  Pause,
  RotateCcw,
  Dice1,
  Square,
  Eye,
  TrendingUp,
  Zap,
  Link
} from 'lucide-react';

interface Minigame {
  id: string;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

// Composant pour afficher le temps écoulé depuis le début du stream
const LiveTimer = ({ startTime }: { startTime: string | null }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    const calculateElapsedTime = () => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      setElapsedTime(Math.floor((now - start) / 1000));
    };

    calculateElapsedTime();
    const interval = setInterval(calculateElapsedTime, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!startTime) return null;

  return (
    <div className="flex items-center justify-center p-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg">
      <div className="text-center">
        <div className="flex items-center justify-center mb-2">
          <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse mr-2"></div>
          <span className="font-semibold">EN DIRECT</span>
        </div>
        <div className="text-2xl font-mono font-bold">{formatTime(elapsedTime)}</div>
        <p className="text-sm opacity-80 mt-1">Temps écoulé</p>
      </div>
    </div>
  );
};

// Composant pour les statistiques en direct
const LiveStats = ({ streamer, stats }: { streamer: Streamer, stats: SubathonStats[] }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-4 rounded-lg text-center">
        <Zap className="mx-auto h-6 w-6 mb-2" />
        <div className="text-2xl font-bold">{streamer.current_clicks}</div>
        <p className="text-sm opacity-80">Clics actuels</p>
      </div>
      
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 rounded-lg text-center">
        <Clock className="mx-auto h-6 w-6 mb-2" />
        <div className="text-2xl font-bold">{streamer.total_time_added}s</div>
        <p className="text-sm opacity-80">Temps ajouté</p>
      </div>
      
      <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white p-4 rounded-lg text-center">
        <Eye className="mx-auto h-6 w-6 mb-2" />
        <div className="text-2xl font-bold">{stats.length}</div>
        <p className="text-sm opacity-80">Participants</p>
      </div>
      
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 rounded-lg text-center">
        <TrendingUp className="mx-auto h-6 w-6 mb-2" />
        <div className="text-2xl font-bold">
          {stats.reduce((sum, stat) => sum + stat.games_played, 0)}
        </div>
        <p className="text-sm opacity-80">Parties jouées</p>
      </div>
    </div>
  );
};

export default function StreamerPanel() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
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
  const [subathonUrl, setSubathonUrl] = useState('');

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
      fetchStats();
    }, 5000); // Refresh every 5 seconds for live data

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (streamer) {
      setSubathonUrl(`${window.location.origin}/streamer/${streamer.id}`);
    }
  }, [streamer]);

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

  const handleMinigameToggle = (minigameId: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      active_minigames: checked 
        ? [...prev.active_minigames, minigameId]
        : prev.active_minigames.filter(id => id !== minigameId)
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

  const handleStatusChange = async (newStatus: 'live' | 'paused' | 'offline' | 'ended') => {
    if (!streamer) return;

    try {
      // Ajouter un délai avant la mise à jour pour éviter les problèmes de concurrence
      await new Promise(resolve => setTimeout(resolve, 100));

      const updateData: any = { 
        status: newStatus,
        is_live: newStatus === 'live'
      };

      // Si on démarre, enregistrer le timestamp
      if (newStatus === 'live' && settings.status !== 'live') {
        updateData.stream_started_at = new Date().toISOString();
        
        // S'assurer que les mini-jeux sont correctement configurés avant de démarrer
        if (!settings.active_minigames || settings.active_minigames.length === 0) {
          toast({
            title: "Attention",
            description: "Vous n'avez sélectionné aucun mini-jeu. Les viewers ne pourront pas jouer.",
            variant: "default",
          });
        }
      }

      // Si on met en pause, enregistrer le timestamp
      if (newStatus === 'paused') {
        updateData.pause_started_at = new Date().toISOString();
      }

      // Si on termine, remettre à zéro
      if (newStatus === 'ended') {
        updateData.current_clicks = 0;
      }

      // Ajouter une vérification pour s'assurer que les paramètres essentiels sont définis
      if (newStatus === 'live' && (!settings.clicks_required || settings.clicks_required <= 0)) {
        updateData.clicks_required = 100; // Valeur par défaut
      }

      // Mettre à jour les paramètres locaux avant la base de données
      setSettings(prev => ({ ...prev, status: newStatus }));

      // Mettre à jour la base de données
      const { error } = await supabase
        .from('streamers')
        .update(updateData)
        .eq('id', streamer.id);

      if (error) throw error;

      // Mettre à jour l'état local après confirmation de la mise à jour en DB
      setStreamer(prev => prev ? { ...prev, ...updateData } : null);
      
      const statusMessages = {
        live: "Stream en direct",
        paused: "Stream en pause", 
        offline: "Stream hors ligne",
        ended: "Pauvrathon terminé"
      };

      toast({
        title: statusMessages[newStatus],
        description: `Votre pauvrathon est maintenant ${newStatus === 'live' ? 'en direct' : newStatus === 'paused' ? 'en pause' : newStatus === 'ended' ? 'terminé' : 'hors ligne'}.`,
      });

      // Si nécessaire, rafraîchir les données après la mise à jour
      if (newStatus === 'live') {
        await fetchStreamerData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
      
      // Revenir à l'état précédent en cas d'erreur
      setSettings(prev => ({ ...prev, status: streamer.status }));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(subathonUrl);
    toast({
      title: "Lien copié",
      description: "Le lien de votre pauvrathon a été copié dans le presse-papier.",
    });
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
          <h1 className="text-3xl font-bold mb-2">Panneau Streamer</h1>
          <p className="text-muted-foreground">
            Gérez votre Pauvrathon et personnalisez votre expérience
          </p>
        </div>

        {/* Affichage du timer en direct si le stream est live */}
        {streamer.status === 'live' && (
          <div className="mb-6">
            <LiveTimer startTime={streamer.stream_started_at} />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Statistiques en direct si le stream est live */}
            {streamer.status === 'live' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Statistiques en Direct
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LiveStats streamer={streamer} stats={stats} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Paramètres du Pauvrathon
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

                {/* Configuration du temps ajouté */}
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
                            checked={settings.active_minigames.includes(minigame.id)}
                            onCheckedChange={(checked) => 
                              handleMinigameToggle(minigame.id, checked as boolean)
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

                {/* Autres paramètres */}
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
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleResetClicks}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Clics
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Statut actuel */}
            <Card>
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
                    }>
                      {streamer.status === 'live' ? 'En direct' : 
                       streamer.status === 'paused' ? 'En pause' :
                       streamer.status === 'ended' ? 'Terminé' : 'Hors ligne'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contrôles rapides */}
            <Card>
              <CardHeader>
                <CardTitle>Contrôles du Pauvrathon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={settings.status === 'live' ? "default" : "outline"}
                    onClick={() => handleStatusChange(settings.status === 'live' ? 'paused' : 'live')}
                    disabled={settings.status === 'ended'}
                  >
                    {settings.status === 'live' ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Live
                      </>
                    )}
                  </Button>

                  <Button 
                    variant="destructive"
                    onClick={() => handleStatusChange('ended')}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Terminer
                  </Button>
                </div>

                {settings.status === 'ended' && (
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => handleStatusChange('offline')}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Nouveau Pauvrathon
                  </Button>
                )}

                <div className="pt-2 border-t">
                  <h4 className="text-sm font-medium mb-2">Lien de votre pauvrathon</h4>
                  <div className="flex items-center space-x-2">
                    <Input 
                      value={subathonUrl} 
                      readOnly 
                      className="text-xs"
                    />
                    <Button size="icon" onClick={copyToClipboard}>
                      <Link className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={() => window.open(subathonUrl, '_blank')}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Ouvrir ma page Pauvrathon
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Meilleur contributeur */}
            <Card>
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

            {/* Statistiques */}
            <Card>
              <CardHeader>
                <CardTitle>Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Participants uniques:</span>
                  <span className="font-bold">{stats.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total clics:</span>
                  <span className="font-bold">
                    {stats.reduce((sum, stat) => sum + stat.clicks_contributed, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total parties:</span>
                  <span className="font-bold">
                    {stats.reduce((sum, stat) => sum + stat.games_played, 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}