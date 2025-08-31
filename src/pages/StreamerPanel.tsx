import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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
  BarChart3,
  ArrowRight,
  Link,
  ExternalLink,
  HelpCircle,
  Clock4,
  ClipboardCheck,
  Check,
  Monitor,
  Copy
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Minigame {
  id: string;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

// Composant pour le timer de pauvrathon
const PauvrathonTimer = ({ status, startTime, initialDuration, addedTime }) => {
  const [timeRemaining, setTimeRemaining] = useState(initialDuration);
  const [elapsedPercent, setElapsedPercent] = useState(100);

  useEffect(() => {
    if (status !== 'live') return;
    
    const interval = setInterval(() => {
      if (!startTime) return;
      
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const elapsedSeconds = Math.floor((now - start) / 1000);
      const totalDuration = initialDuration + addedTime;
      const remaining = Math.max(0, totalDuration - elapsedSeconds);
      
      setTimeRemaining(remaining);
      setElapsedPercent(Math.min(100, Math.max(0, (remaining / totalDuration) * 100)));
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [status, startTime, initialDuration, addedTime]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (status !== 'live' && status !== 'paused') {
    return (
      <div className="text-center p-4 bg-muted rounded-lg">
        <Clock className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Pauvrathon non démarré</p>
      </div>
    );
  }

  const statusColor = status === 'paused' ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="text-center p-4 bg-card rounded-lg border-2 border-primary/20">
      <div className="flex items-center justify-center mb-2">
        <div className={`w-3 h-3 ${statusColor} rounded-full animate-pulse mr-2`}></div>
        <span className="font-semibold">{status === 'paused' ? 'EN PAUSE' : 'EN DIRECT'}</span>
      </div>
      
      <div className="text-3xl font-mono font-bold text-primary mb-2">
        {formatTime(timeRemaining)}
      </div>
      
      <Progress value={elapsedPercent} className="h-2 mb-1" />
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatTime(initialDuration + addedTime)}</span>
        <span>Temps restant</span>
        <span>00:00:00</span>
      </div>
    </div>
  );
};

export default function AdminPanel() {
  const { user, profile } = useAuth();
  const [streamer, setStreamer] = useState(null);
  const [originalStreamerData, setOriginalStreamerData] = useState(null); // NOUVEAU : pour tracking des changements
  const [availableMinigames, setAvailableMinigames] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // NOUVEAU : indicateur de changements
  
  // États pour la configuration
  const [timeMode, setTimeMode] = useState('fixed');
  const [initialHours, setInitialHours] = useState(2);
  const [initialMinutes, setInitialMinutes] = useState(0);
  const [fixedTime, setFixedTime] = useState(30);
  const [minRandomTime, setMinRandomTime] = useState(10);
  const [maxRandomTime, setMaxRandomTime] = useState(60);
  const [clicksRequired, setClicksRequired] = useState(100);
  const [cooldownTime, setCooldownTime] = useState(30);
  const [selectedGames, setSelectedGames] = useState([]);
  
  // URLs
  const [pauvrathonUrl, setPauvrathonUrl] = useState('');
  const [overlayUrl, setOverlayUrl] = useState(''); // NOUVEAU : URL overlay
  
  // Redirect if not authenticated or not an admin
  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchStreamerData();
    fetchAvailableMinigames();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      if (streamer?.status === 'live') {
        fetchStreamerData();
        fetchStats();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (streamer) {
      fetchStats();
    }
  }, [streamer]);
  
  // Mettre à jour les URLs quand le streamer est chargé
  useEffect(() => {
    if (streamer) {
      setPauvrathonUrl(`${window.location.origin}/streamer/${streamer.id}`);
      setOverlayUrl(`${window.location.origin}/overlay/${streamer.id}`); // NOUVEAU
    }
  }, [streamer]);

  // NOUVEAU : Détecter les changements non sauvegardés
  useEffect(() => {
    if (!originalStreamerData) return;
    
    const currentConfig = {
      time_mode: timeMode,
      time_increment: fixedTime,
      min_random_time: minRandomTime,
      max_random_time: maxRandomTime,
      clicks_required: clicksRequired,
      cooldown_seconds: cooldownTime,
      initial_duration: (initialHours * 3600) + (initialMinutes * 60),
      active_minigames: selectedGames
    };
    
    const originalConfig = {
      time_mode: originalStreamerData.time_mode || 'fixed',
      time_increment: originalStreamerData.time_increment || 30,
      min_random_time: originalStreamerData.min_random_time || 10,
      max_random_time: originalStreamerData.max_random_time || 60,
      clicks_required: originalStreamerData.clicks_required || 100,
      cooldown_seconds: originalStreamerData.cooldown_seconds || 30,
      initial_duration: originalStreamerData.initial_duration || 7200,
      active_minigames: originalStreamerData.active_minigames || []
    };
    
    const hasChanges = JSON.stringify(currentConfig) !== JSON.stringify(originalConfig);
    setHasUnsavedChanges(hasChanges);
  }, [timeMode, fixedTime, minRandomTime, maxRandomTime, clicksRequired, cooldownTime, initialHours, initialMinutes, selectedGames, originalStreamerData]);

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
        setStreamer(data);
        setOriginalStreamerData(data); // NOUVEAU : sauvegarder les données originales
        
        // Initialiser les états avec les données du streamer
        setInitialHours(Math.floor((data.initial_duration || 7200) / 3600));
        setInitialMinutes(Math.floor(((data.initial_duration || 7200) % 3600) / 60));
        setTimeMode(data.time_mode || 'fixed');
        setFixedTime(data.time_increment || 30);
        setMinRandomTime(data.min_random_time || 10);
        setMaxRandomTime(data.max_random_time || 60);
        setClicksRequired(data.clicks_required || 100);
        setCooldownTime(data.cooldown_seconds || 30);
        setSelectedGames(data.active_minigames || []);
      }
    } catch (error) {
      console.error('Error fetching streamer data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du streamer.",
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
        .order('time_contributed', { ascending: false });

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
        time_mode: timeMode,
        time_increment: fixedTime,
        min_random_time: minRandomTime,
        max_random_time: maxRandomTime,
        clicks_required: clicksRequired,
        cooldown_seconds: cooldownTime,
        initial_duration: calculatedDuration,
        active_minigames: selectedGames,
        updated_at: new Date().toISOString() // NOUVEAU : timestamp de mise à jour
      };

      console.log('Sauvegarde des paramètres:', updatedSettings); // DEBUG

      const { data, error } = await supabase
        .from('streamers')
        .update(updatedSettings)
        .eq('id', streamer.id)
        .select()
        .single(); // NOUVEAU : récupérer les données mises à jour

      if (error) {
        console.error('Erreur de sauvegarde:', error);
        throw error;
      }

      console.log('Données sauvegardées:', data); // DEBUG

      // Mettre à jour l'état local avec les nouvelles données
      setStreamer(data);
      setOriginalStreamerData(data); // NOUVEAU : mettre à jour les données originales
      setHasUnsavedChanges(false); // NOUVEAU : plus de changements non sauvegardés
      
      toast({
        title: "Paramètres sauvegardés",
        description: "Les paramètres du Pauvrathon ont été mis à jour avec succès.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: `Impossible de sauvegarder les paramètres: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!streamer) return;

    try {
      const updateData = { 
        status: newStatus,
        is_live: newStatus === 'live',
        updated_at: new Date().toISOString()
      };

      // Si on démarre, enregistrer le timestamp
      if (newStatus === 'live' && streamer.status !== 'live') {
        updateData.stream_started_at = new Date().toISOString();
        
        // Vérifier les mini-jeux
        if (!selectedGames.length) {
          toast({
            title: "Attention",
            description: "Aucun mini-jeu n'a été sélectionné. Les viewers ne pourront pas jouer.",
            variant: "destructive",
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
        updateData.total_time_added = 0;
      }

      console.log('Mise à jour du statut:', updateData); // DEBUG

      const { data, error } = await supabase
        .from('streamers')
        .update(updateData)
        .eq('id', streamer.id)
        .select()
        .single();

      if (error) {
        console.error('Erreur mise à jour statut:', error);
        throw error;
      }

      setStreamer(data);
      
      const statusMessages = {
        live: "Pauvrathon démarré",
        paused: "Pauvrathon en pause", 
        offline: "Pauvrathon arrêté",
        ended: "Pauvrathon terminé"
      };

      toast({
        title: statusMessages[newStatus],
        description: `Le Pauvrathon est maintenant ${newStatus === 'live' ? 'en direct' : newStatus === 'paused' ? 'en pause' : newStatus === 'ended' ? 'terminé' : 'arrêté'}.`,
      });
      
      if (newStatus === 'live') {
        await fetchStreamerData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour le statut: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleMinigameToggle = (minigameId, checked) => {
    if (checked) {
      setSelectedGames(prev => [...prev, minigameId]);
    } else {
      setSelectedGames(prev => prev.filter(id => id !== minigameId));
    }
  };

  const handleResetClicks = async () => {
    if (!streamer) return;

    try {
      const { data, error } = await supabase
        .from('streamers')
        .update({ 
          current_clicks: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', streamer.id)
        .select()
        .single();

      if (error) throw error;

      setStreamer(data);
      
      toast({
        title: "Clics remis à zéro",
        description: "Le compteur de clics a été réinitialisé.",
      });
    } catch (error) {
      console.error('Error resetting clicks:', error);
      toast({
        title: "Erreur",
        description: `Impossible de remettre à zéro les clics: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (url, type) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Lien copié",
      description: `Le lien ${type} a été copié dans le presse-papier.`,
    });
  };

  const copyOverlayLink = () => {
    copyToClipboard(overlayUrl, 'de l\'overlay');
  };

  const copyPauvrathonLink = () => {
    copyToClipboard(pauvrathonUrl, 'de la page Pauvrathon');
  };

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
            Panneau d'Administration Pauvrathon
          </h1>
          <p className="text-muted-foreground">
            Configurez et gérez le Pauvrathon en temps réel
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* PARTIE GAUCHE - Configuration */}
          <div className="lg:col-span-3 space-y-6">
            <Tabs defaultValue="configuration">
              <TabsList className="mb-4">
                <TabsTrigger value="configuration">
                  <Settings className="w-4 h-4 mr-2" />
                  Configuration
                  {hasUnsavedChanges && (
                    <Badge variant="destructive" className="ml-2 text-xs">•</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="statistics">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Statistiques
                </TabsTrigger>
                <TabsTrigger value="links">
                  <Link className="w-4 h-4 mr-2" />
                  Liens & Overlay
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="configuration">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="mr-2 h-5 w-5" />
                      Configuration du temps
                    </CardTitle>
                    <CardDescription>
                      Définissez les paramètres de temps pour le Pauvrathon
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Temps initial */}
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Timer className="h-5 w-5 mr-2 text-muted-foreground" />
                        <h3 className="text-lg font-medium">Temps initial</h3>
                      </div>
                      
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
                      
                      <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                        Durée totale: <span className="font-medium">{initialHours}h {initialMinutes}m</span> ({(initialHours * 3600) + (initialMinutes * 60)} secondes)
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Configuration du temps ajouté */}
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Clock4 className="h-5 w-5 mr-2 text-muted-foreground" />
                        <h3 className="text-lg font-medium">Temps ajouté par victoire</h3>
                      </div>
                      
                      <RadioGroup
                        value={timeMode}
                        onValueChange={setTimeMode}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div className="flex items-center space-x-2 p-4 rounded-lg border">
                          <RadioGroupItem value="fixed" id="fixed" />
                          <Label htmlFor="fixed" className="flex-1 cursor-pointer">
                            <div className="flex items-center">
                              <Clock className="mr-2 h-4 w-4" />
                              Temps fixe
                            </div>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-4 rounded-lg border">
                          <RadioGroupItem value="random" id="random" />
                          <Label htmlFor="random" className="flex-1 cursor-pointer">
                            <div className="flex items-center">
                              <Dice1 className="mr-2 h-4 w-4" />
                              Temps aléatoire
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>

                      {timeMode === 'fixed' ? (
                        <div>
                          <Label htmlFor="fixed_time">Temps ajouté fixe (secondes)</Label>
                          <div className="grid grid-cols-[1fr_80px] gap-4 items-center">
                            <Slider
                              value={[fixedTime]}
                              min={1}
                              max={300}
                              step={1}
                              onValueChange={(value) => setFixedTime(value[0])}
                            />
                            <Input
                              id="fixed_time"
                              type="number"
                              min="1"
                              max="300"
                              value={fixedTime}
                              onChange={(e) => setFixedTime(parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            À chaque victoire, {fixedTime} secondes seront ajoutées au timer
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <Label>Plage de temps aléatoire (secondes)</Label>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div>
                                <Label htmlFor="min_random_time" className="text-sm">Minimum</Label>
                                <Input
                                  id="min_random_time"
                                  type="number"
                                  min="1"
                                  max={maxRandomTime}
                                  value={minRandomTime}
                                  onChange={(e) => setMinRandomTime(parseInt(e.target.value) || 1)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="max_random_time" className="text-sm">Maximum</Label>
                                <Input
                                  id="max_random_time"
                                  type="number"
                                  min={minRandomTime}
                                  max="300"
                                  value={maxRandomTime}
                                  onChange={(e) => setMaxRandomTime(parseInt(e.target.value) || minRandomTime)}
                                />
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            À chaque victoire, entre {minRandomTime} et {maxRandomTime} secondes seront ajoutées aléatoirement
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    {/* Configuration des clics et du cooldown */}
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <ClipboardCheck className="h-5 w-5 mr-2 text-muted-foreground" />
                        <h3 className="text-lg font-medium">Paramètres de jeu</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="clicks_required">Clics requis pour déclencher un jeu</Label>
                          <div className="grid grid-cols-[1fr_80px] gap-4 items-center mt-2">
                            <Slider
                              value={[clicksRequired]}
                              min={10}
                              max={500}
                              step={10}
                              onValueChange={(value) => setClicksRequired(value[0])}
                            />
                            <Input
                              id="clicks_required"
                              type="number"
                              min="10"
                              max="500"
                              value={clicksRequired}
                              onChange={(e) => setClicksRequired(parseInt(e.target.value) || 10)}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Nombre de clics nécessaires pour déclencher un mini-jeu
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="cooldown_time">Temps de cooldown (secondes)</Label>
                          <div className="grid grid-cols-[1fr_80px] gap-4 items-center mt-2">
                            <Slider
                              value={[cooldownTime]}
                              min={0}
                              max={300}
                              step={5}
                              onValueChange={(value) => setCooldownTime(value[0])}
                            />
                            <Input
                              id="cooldown_time"
                              type="number"
                              min="0"
                              max="300"
                              value={cooldownTime}
                              onChange={(e) => setCooldownTime(parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Délai entre la fin d'un jeu et la possibilité d'en déclencher un nouveau
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Gamepad2 className="mr-2 h-5 w-5" />
                      Sélection des mini-jeux
                    </CardTitle>
                    <CardDescription>
                      Choisissez les mini-jeux qui seront disponibles pendant le Pauvrathon
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {availableMinigames.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Gamepad2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>Aucun mini-jeu disponible</p>
                        <p className="text-sm mt-2">Ajoutez des mini-jeux via la section de gestion des mini-jeux</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availableMinigames.map((minigame) => (
                          <div 
                            key={minigame.id} 
                          >
                            <Checkbox
                              id={`minigame-${minigame.id}`}
                              checked={selectedGames.includes(minigame.id)}
                              onCheckedChange={(checked) => 
                                handleMinigameToggle(minigame.id, checked)
                              }
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <Label 
                                htmlFor={`minigame-${minigame.id}`} 
                                className="cursor-pointer font-medium block mb-1"
                              >
                                {minigame.name}
                                {!minigame.is_active && (
                                  <Badge variant="outline" className="ml-2 text-xs">Inactif</Badge>
                                )}
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
                  </CardContent>
                  <CardFooter className="flex justify-between border-t pt-6">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{selectedGames.length}</span> mini-jeux sélectionnés sur {availableMinigames.length} disponibles
                    </div>
                    <Button 
                      onClick={handleSaveSettings} 
                      disabled={saving || !hasUnsavedChanges}
                      variant={hasUnsavedChanges ? "default" : "outline"}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'Sauvegarde...' : hasUnsavedChanges ? 'Sauvegarder les changements' : 'Paramètres sauvegardés'}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* NOUVEAU : Onglet Liens & Overlay */}
              <TabsContent value="links">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Page Pauvrathon */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Eye className="mr-2 h-5 w-5" />
                        Page Pauvrathon
                      </CardTitle>
                      <CardDescription>
                        Lien vers la page publique de votre Pauvrathon
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Input 
                          value={pauvrathonUrl} 
                          readOnly 
                          className="text-sm"
                        />
                        <Button size="icon" onClick={copyPauvrathonLink}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.open(pauvrathonUrl, '_blank')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Voir la page
                      </Button>

                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        <strong>Usage :</strong> Partagez ce lien avec vos viewers pour qu'ils puissent participer au Pauvrathon.
                      </div>
                    </CardContent>
                  </Card>

                  {/* Overlay OBS */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Monitor className="mr-2 h-5 w-5" />
                        Overlay OBS
                      </CardTitle>
                      <CardDescription>
                        Lien de l'overlay pour votre logiciel de streaming
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Input 
                          value={overlayUrl} 
                          readOnly 
                          className="text-sm"
                        />
                        <Button size="icon" onClick={copyOverlayLink}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.open(overlayUrl, '_blank')}
                      >
                        <Monitor className="mr-2 h-4 w-4" />
                        Tester l'overlay
                      </Button>

                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-2">
                        <p><strong>Configuration OBS :</strong></p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          <li>Ajoutez une source "Navigateur"</li>
                          <li>Collez l'URL de l'overlay</li>
                          <li>Définissez la taille : 400x200px</li>
                          <li>Positionnez où vous voulez</li>
                        </ol>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Instructions détaillées */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <HelpCircle className="mr-2 h-5 w-5" />
                      Guide d'utilisation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3 flex items-center">
                          <Eye className="mr-2 h-4 w-4" />
                          Page Pauvrathon
                        </h4>
                        <ul className="text-sm space-y-2 text-muted-foreground">
                          <li>• Partagez ce lien avec vos viewers</li>
                          <li>• Ils peuvent cliquer et jouer aux mini-jeux</li>
                          <li>• Le timer se met à jour en temps réel</li>
                          <li>• Compatible mobile et desktop</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-3 flex items-center">
                          <Monitor className="mr-2 h-4 w-4" />
                          Overlay OBS
                        </h4>
                        <ul className="text-sm space-y-2 text-muted-foreground">
                          <li>• Affiche le timer en temps réel</li>
                          <li>• Progression des clics</li>
                          <li>• Statut du Pauvrathon</li>
                          <li>• Design transparent pour stream</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="statistics">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="mr-2 h-5 w-5" />
                      Statistiques du Pauvrathon
                    </CardTitle>
                    <CardDescription>
                      Analyse détaillée de l'activité et des performances
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-primary/10 p-4 rounded-lg text-center">
                        <Users className="mx-auto h-6 w-6 mb-2 text-primary" />
                        <div className="text-2xl font-bold">{stats.length}</div>
                        <p className="text-sm text-muted-foreground">Participants</p>
                      </div>
                      
                      <div className="bg-primary/10 p-4 rounded-lg text-center">
                        <Trophy className="mx-auto h-6 w-6 mb-2 text-primary" />
                        <div className="text-2xl font-bold">
                          {stats.reduce((sum, stat) => sum + (stat.games_won || 0), 0)}
                        </div>
                        <p className="text-sm text-muted-foreground">Victoires</p>
                      </div>
                      
                      <div className="bg-primary/10 p-4 rounded-lg text-center">
                        <Check className="mx-auto h-6 w-6 mb-2 text-primary" />
                        <div className="text-2xl font-bold">
                          {stats.reduce((sum, stat) => sum + (stat.clicks_contributed || 0), 0)}
                        </div>
                        <p className="text-sm text-muted-foreground">Clics totaux</p>
                      </div>
                      
                      <div className="bg-primary/10 p-4 rounded-lg text-center">
                        <Clock className="mx-auto h-6 w-6 mb-2 text-primary" />
                        <div className="text-2xl font-bold">
                          {stats.reduce((sum, stat) => sum + (stat.time_contributed || 0), 0)}s
                        </div>
                        <p className="text-sm text-muted-foreground">Temps ajouté</p>
                      </div>
                    </div>

                    {/* Top contributors */}
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-4">Meilleurs contributeurs</h3>
                      
                      {stats.length === 0 ? (
                        <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
                          <Star className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">Aucune participation pour le moment</p>
                        </div>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="grid grid-cols-5 bg-muted p-3 text-sm font-medium">
                            <div className="col-span-2">Utilisateur</div>
                            <div className="text-center">Clics</div>
                            <div className="text-center">Victoires</div>
                            <div className="text-center">Temps ajouté</div>
                          </div>
                          
                          <div className="divide-y">
                            {stats.slice(0, 10).map((stat, index) => (
                              <div key={index} className="grid grid-cols-5 p-3 items-center hover:bg-muted/30 transition-colors">
                                <div className="col-span-2 flex items-center gap-2">
                                  {index < 3 && (
                                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                      index === 0 ? 'bg-yellow-500' :
                                      index === 1 ? 'bg-gray-400' : 'bg-amber-700'
                                    }`}>
                                      {index + 1}
                                    </div>
                                  )}
                                  <span className="font-medium">{stat.player_twitch_username || 'Anonyme'}</span>
                                </div>
                                <div className="text-center">{stat.clicks_contributed || 0}</div>
                                <div className="text-center">{stat.games_won || 0}/{stat.games_played || 0}</div>
                                <div className="text-center">{stat.time_contributed || 0}s</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* PARTIE DROITE - Contrôles et Statistiques en direct */}
          <div className="space-y-6">
            {/* État du Pauvrathon et timer */}
            <Card>
              <CardHeader>
                <CardTitle>État du Pauvrathon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PauvrathonTimer 
                  status={streamer?.status}
                  startTime={streamer?.stream_started_at} 
                  initialDuration={streamer?.initial_duration || 7200}
                  addedTime={streamer?.total_time_added || 0}
                />
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button 
                    variant={streamer?.status === 'live' ? "default" : "outline"}
                    onClick={() => handleStatusChange(streamer?.status === 'live' ? 'paused' : 'live')}
                    disabled={streamer?.status === 'ended'}
                    className={streamer?.status === 'live' ? "bg-red-500 hover:bg-red-600" : ""}
                  >
                    {streamer?.status === 'live' ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Démarrer
                      </>
                    )}
                  </Button>

                  <Button 
                    variant="destructive"
                    onClick={() => handleStatusChange('ended')}
                    disabled={streamer?.status === 'ended'}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Terminer
                  </Button>
                </div>

                {streamer?.status === 'ended' && (
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => handleStatusChange('offline')}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Nouveau Pauvrathon
                  </Button>
                )}
              </CardContent>
            </Card>
            
            {/* Statistiques en direct */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Statistiques en direct
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Statut:</span>
                    <Badge variant={
                      streamer?.status === 'live' ? 'default' : 
                      streamer?.status === 'paused' ? 'secondary' : 
                      streamer?.status === 'ended' ? 'destructive' : 'outline'
                    }>
                      {streamer?.status === 'live' ? 'En direct' : 
                       streamer?.status === 'paused' ? 'En pause' :
                       streamer?.status === 'ended' ? 'Terminé' : 'Hors ligne'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clics actuels:</span>
                    <span className="font-bold">{streamer?.current_clicks || 0}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clics requis:</span>
                    <span className="font-bold">{streamer?.clicks_required || 0}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temps ajouté:</span>
                    <span className="font-bold">{streamer?.total_time_added || 0}s</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temps initial:</span>
                    <span className="font-bold">
                      {Math.floor((streamer?.initial_duration || 7200) / 3600)}h
                      {Math.floor(((streamer?.initial_duration || 7200) % 3600) / 60)}m
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Participants:</span>
                    <span className="font-bold">{stats?.length || 0}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    onClick={handleResetClicks}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Réinitialiser les clics
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Aide rapide */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Aide rapide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Démarrer</span> : Lance le Pauvrathon avec les paramètres configurés.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Pause</span> : Met en pause le timer mais garde les données.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Terminer</span> : Arrête définitivement le Pauvrathon actuel.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Overlay</span> : Ajoutez l'URL dans OBS comme source navigateur.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}