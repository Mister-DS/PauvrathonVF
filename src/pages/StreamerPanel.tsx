import { useState, useEffect, useCallback } from 'react';
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
  Broadcast,
  Play,
  Pause,
  RotateCcw,
  Square,
  Eye,
  BarChart3,
  Link,
  ExternalLink,
  ClipboardCheck,
  Copy,
  Loader2,
  Star,
  Monitor,
  AlertCircle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Interface pour les paramètres du streamer
interface StreamerSettings {
  id: string;
  user_id: string;
  stream_title: string;
  twitch_id: string;
  time_mode: 'fixed' | 'random';
  time_increment: number;
  min_random_time: number;
  max_random_time: number;
  clicks_required: number;
  cooldown_seconds: number;
  initial_duration: number;
  active_minigames: string[];
  status: 'offline' | 'live' | 'paused' | 'ended';
  is_live: boolean;
  total_time_added: number;
  current_clicks: number;
  stream_started_at: string | null;
  pause_started_at: string | null;
}

// Fonction utilitaire pour le timer du pauvrathon (pas de changements)
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

// **MODIFICATION : Lecteur vidéo Twitch**
const TwitchPlayer = ({ twitchUsername }: { twitchUsername: string | undefined }) => {
  useEffect(() => {
    if (!twitchUsername) return;

    // S'assure que le script de l'API Twitch est chargé
    if (!(window as any).Twitch) {
      const script = document.createElement('script');
      script.src = 'https://embed.twitch.tv/embed/v1.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        // Initialise le lecteur une fois le script chargé
        new (window as any).Twitch.Embed("twitch-embed", {
          width: '100%',
          height: '400',
          channel: twitchUsername,
          layout: 'video',
          autoplay: true,
          muted: false,
          theme: 'dark'
        });
      };
    } else {
        // Si le script est déjà là, initialise le lecteur directement
        new (window as any).Twitch.Embed("twitch-embed", {
          width: '100%',
          height: '400',
          channel: twitchUsername,
          layout: 'video',
          autoplay: true,
          muted: false,
          theme: 'dark'
        });
    }

    return () => {
      // Nettoyage si nécessaire
      document.body.removeChild(document.querySelector('script[src="https://embed.twitch.tv/embed/v1.js"]') as Node);
    };
  }, [twitchUsername]);

  if (!twitchUsername) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-8">
        <AlertCircle className="mr-2 h-5 w-5" />
        Nom d'utilisateur Twitch non trouvé. Assurez-vous d'avoir lié votre compte Twitch.
      </div>
    );
  }

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg neon-border p-2">
      <div id="twitch-embed" className="w-full h-full"></div>
    </div>
  );
};

export default function StreamerPanel() {
  const { user, profile } = useAuth();
  const [streamer, setStreamer] = useState<StreamerSettings | null>(null);
  const [originalStreamerData, setOriginalStreamerData] = useState<StreamerSettings | null>(null);
  const [availableMinigames, setAvailableMinigames] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // États pour la configuration
  const [timeMode, setTimeMode] = useState('fixed');
  const [initialHours, setInitialHours] = useState(2);
  const [initialMinutes, setInitialMinutes] = useState(0);
  const [fixedTime, setFixedTime] = useState(30);
  const [minRandomTime, setMinRandomTime] = useState(10);
  const [maxRandomTime, setMaxRandomTime] = useState(60);
  const [clicksRequired, setClicksRequired] = useState(100);
  const [cooldownTime, setCooldownTime] = useState(30);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  
  // URLs
  const [pauvrathonUrl, setPauvrathonUrl] = useState('');
  const [overlayUrl, setOverlayUrl] = useState('');
  
  if (!user || profile?.role !== 'streamer') {
    return <Navigate to="/" replace />;
  }

  const fetchStreamerData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('streamers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setStreamer(data as StreamerSettings);
        setOriginalStreamerData(data as StreamerSettings);
        
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
    } catch (error: any) {
      console.error('Error fetching streamer data:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les données du streamer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchAvailableMinigames = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('minigames')
        .select('*')
        .order('name');

      if (error) throw error;
      
      setAvailableMinigames(data || []);
    } catch (error: any) {
      console.error('Error fetching minigames:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    if (!streamer || !streamer.id) {
      console.error("ID de streamer invalide pour les statistiques.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subathon_stats')
        .select('*')
        .eq('streamer_id', streamer.id)
        .order('time_contributed', { ascending: false });

      if (error) throw error;
      
      setStats(data || []);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  }, [streamer]);

  useEffect(() => {
    fetchStreamerData();
    fetchAvailableMinigames();
  }, [fetchStreamerData, fetchAvailableMinigames]);

  useEffect(() => {
    if (streamer) {
      fetchStats();
      const streamerChannel = supabase
        .channel(`public:streamers:id=eq.${streamer.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'streamers', filter: `id=eq.${streamer.id}` },
          (payload) => {
            console.log('Mise à jour en temps réel reçue:', payload);
            setStreamer(payload.new as StreamerSettings);
          }
        )
        .subscribe();
      
      const statsChannel = supabase
        .channel(`public:subathon_stats:streamer_id=eq.${streamer.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'subathon_stats', filter: `streamer_id=eq.${streamer.id}` },
          () => {
            fetchStats();
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(streamerChannel);
        supabase.removeChannel(statsChannel);
      };
    }
  }, [streamer, fetchStats]);

  useEffect(() => {
    if (streamer && streamer.id) {
      setPauvrathonUrl(`${window.location.origin}/streamer/${streamer.id}`);
      setOverlayUrl(`${window.location.origin}/overlay/${streamer.id}`);
    }
  }, [streamer]);

  useEffect(() => {
    if (!originalStreamerData) return;
    
    const currentConfig = {
      stream_title: streamer?.stream_title,
      time_mode: timeMode,
      time_increment: fixedTime,
      min_random_time: minRandomTime,
      max_random_time: maxRandomTime,
      clicks_required: clicksRequired,
      cooldown_seconds: cooldownTime,
      initial_duration: (initialHours * 3600) + (initialMinutes * 60),
      active_minigames: selectedGames.sort(),
    };
    
    const originalConfig = {
      stream_title: originalStreamerData.stream_title,
      time_mode: originalStreamerData.time_mode || 'fixed',
      time_increment: originalStreamerData.time_increment || 30,
      min_random_time: originalStreamerData.min_random_time || 10,
      max_random_time: originalStreamerData.max_random_time || 60,
      clicks_required: originalStreamerData.clicks_required || 100,
      cooldown_seconds: originalStreamerData.cooldown_seconds || 30,
      initial_duration: originalStreamerData.initial_duration || 7200,
      active_minigames: (originalStreamerData.active_minigames || []).sort(),
    };
    
    const hasChanges = JSON.stringify(currentConfig) !== JSON.stringify(originalConfig);
    setHasUnsavedChanges(hasChanges);
  }, [timeMode, fixedTime, minRandomTime, maxRandomTime, clicksRequired, cooldownTime, initialHours, initialMinutes, selectedGames, streamer, originalStreamerData]);

  const handleSaveSettings = async () => {
    if (!streamer || !streamer.id) {
      console.error("Sauvegarde impossible: Streamer ID invalide.");
      toast({
        title: "Erreur de sauvegarde",
        description: "ID de streamer invalide.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const calculatedDuration = (initialHours * 3600) + (initialMinutes * 60);
      
      const updatedSettings = {
        stream_title: streamer.stream_title,
        time_mode: timeMode,
        time_increment: fixedTime,
        min_random_time: minRandomTime,
        max_random_time: maxRandomTime,
        clicks_required: clicksRequired,
        cooldown_seconds: cooldownTime,
        initial_duration: calculatedDuration,
        active_minigames: selectedGames,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('streamers')
        .update(updatedSettings)
        .eq('id', streamer.id)
        .select()
        .single();

      if (error) {
        console.error('Erreur de sauvegarde Supabase:', error);
        throw error;
      }

      setStreamer(data as StreamerSettings);
      setOriginalStreamerData(data as StreamerSettings);
      setHasUnsavedChanges(false);
      
      toast({
        title: "Paramètres sauvegardés",
        description: "Les paramètres du Pauvrathon ont été mis à jour avec succès.",
      });
    } catch (error: any) {
      console.error('Erreur de sauvegarde:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: `Impossible de sauvegarder les paramètres: ${error.message || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: 'live' | 'paused' | 'ended' | 'offline') => {
    if (!streamer || !streamer.id) {
      console.error("Mise à jour du statut impossible: Streamer ID invalide.");
      return;
    }

    try {
      let updateData: any = { 
        status: newStatus,
        is_live: newStatus === 'live',
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'live' && streamer.status !== 'live') {
        updateData.stream_started_at = new Date().toISOString();
        if (!selectedGames.length) {
          toast({
            title: "Attention",
            description: "Aucun mini-jeu n'a été sélectionné. Les viewers ne pourront pas jouer.",
            variant: "destructive",
          });
        }
      }

      if (newStatus === 'paused') {
        updateData.pause_started_at = new Date().toISOString();
      }

      if (newStatus === 'ended' || newStatus === 'offline') {
        updateData.current_clicks = 0;
        updateData.total_time_added = 0;
        updateData.stream_started_at = null;
        updateData.pause_started_at = null;
      }

      const { data, error } = await supabase
        .from('streamers')
        .update(updateData)
        .eq('id', streamer.id)
        .select()
        .single();

      if (error) throw error;
      setStreamer(data as StreamerSettings);
      
      const statusMessages = {
        live: "Pauvrathon démarré",
        paused: "Pauvrathon en pause", 
        ended: "Pauvrathon terminé",
        offline: "Pauvrathon arrêté"
      };

      toast({
        title: statusMessages[newStatus],
        description: `Le Pauvrathon est maintenant ${newStatus === 'live' ? 'en direct' : newStatus === 'paused' ? 'en pause' : 'terminé'}.`,
      });
      
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour le statut: ${error.message || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    }
  };
  
  const handleMinigameToggle = (minigameId: string, checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedGames(prev => [...new Set([...prev, minigameId])]);
    } else {
      setSelectedGames(prev => prev.filter(id => id !== minigameId));
    }
  };
  
  const handleResetClicks = async () => {
    if (!streamer || !streamer.id) {
      console.error("Réinitialisation impossible: Streamer ID invalide.");
      return;
    }

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

      setStreamer(data as StreamerSettings);
      
      toast({
        title: "Clics remis à zéro",
        description: "Le compteur de clics a été réinitialisé.",
      });
    } catch (error: any) {
      console.error('Error resetting clicks:', error);
      toast({
        title: "Erreur",
        description: `Impossible de remettre à zéro les clics: ${error.message || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (url: string, type: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Lien copié",
      description: `Le lien ${type} a été copié dans le presse-papier.`,
    });
  };

  const copyOverlayLink = () => {
    copyToClipboard(overlayUrl, "de l'overlay");
  };

  const copyPauvrathonLink = () => {
    copyToClipboard(pauvrathonUrl, "de la page Pauvrathon");
  };
  
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-16">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );

  if (loading || !streamer) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
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
            Panneau de Streamer Pauvrathon
          </h1>
          <p className="text-muted-foreground">
            Configurez et gérez votre Pauvrathon en temps réel
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
                        <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
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
                              <Gamepad2 className="mr-2 h-4 w-4" />
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
                  <CardFooter className="flex justify-end pt-6">
                    <Button 
                      onClick={handleSaveSettings} 
                      disabled={saving || !hasUnsavedChanges}
                      variant={hasUnsavedChanges ? "default" : "outline"}
                    >
                      Sauvegarder les paramètres
                    </Button>
                  </CardFooter>
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
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availableMinigames.map((minigame) => (
                          <div 
                            key={minigame.id} 
                            className="flex items-start space-x-2"
                          >
                            <Checkbox
                              id={`minigame-${minigame.id}`}
                              checked={selectedGames.includes(minigame.name)}
                              onCheckedChange={(checked) => 
                                handleMinigameToggle(minigame.name, checked)
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
                  <CardFooter className="flex justify-end border-t pt-6">
                    <Button 
                      onClick={handleSaveSettings} 
                      disabled={saving || !hasUnsavedChanges}
                      variant={hasUnsavedChanges ? "default" : "outline"}
                    >
                      Sauvegarder les jeux
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Contenu de l'onglet Liens & Overlay */}
              <TabsContent value="links">
                <div className="grid gap-6 md:grid-cols-2">
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
                        <Button asChild size="icon" variant="outline">
                          <a href={pauvrathonUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Monitor className="mr-2 h-5 w-5" />
                        Overlay Twitch
                      </CardTitle>
                      <CardDescription>
                        Lien à utiliser comme "Source de navigation" dans OBS/Streamlabs
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
                        <Button asChild size="icon" variant="outline">
                          <a href={overlayUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Contenu de l'onglet Statistiques */}
              <TabsContent value="statistics">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="mr-2 h-5 w-5" />
                      Statistiques du Pauvrathon
                    </CardTitle>
                    <CardDescription>
                      Classement des top contributeurs de temps pour ce Pauvrathon
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Star className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>Aucune statistique disponible</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {stats.slice(0, 10).map((stat, index) => (
                          <div key={stat.id} className="flex items-center space-x-4 border-b pb-2 last:border-b-0 last:pb-0">
                            <div className="text-xl font-bold w-6 text-center text-primary">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{stat.profile_twitch_display_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {Math.floor(stat.time_contributed / 60)}m {stat.time_contributed % 60}s
                              </p>
                            </div>
                            <Badge variant="secondary">
                              <Star className="w-3 h-3 mr-1" />
                              {stat.clicks_contributed} clics
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* PARTIE DROITE - Timer et Contrôles */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Monitor className="mr-2 h-5 w-5" />
                        Lecteur Vidéo
                    </CardTitle>
                    <CardDescription>
                        Aperçu de votre stream Twitch en direct.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TwitchPlayer twitchUsername={profile?.twitch_username} />
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Timer & Contrôles
                </CardTitle>
                <CardDescription>
                  Contrôlez le statut de votre Pauvrathon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PauvrathonTimer
                  status={streamer?.status}
                  startTime={streamer?.stream_started_at}
                  initialDuration={streamer?.initial_duration}
                  addedTime={streamer?.total_time_added}
                />
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 pt-0">
                <div className="flex gap-2 w-full">
                  <Button 
                    className="flex-1"
                    onClick={() => handleStatusChange('live')}
                    disabled={streamer?.status === 'live'}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Démarrer
                  </Button>
                  <Button 
                    className="flex-1"
                    variant="outline"
                    onClick={() => handleStatusChange('paused')}
                    disabled={streamer?.status === 'paused' || streamer?.status === 'ended'}
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                </div>
                <div className="flex gap-2 w-full">
                  <Button 
                    className="flex-1"
                    variant="destructive"
                    onClick={() => handleStatusChange('ended')}
                    disabled={streamer?.status === 'ended' || streamer?.status === 'offline'}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Terminer
                  </Button>
                  <Button 
                    className="flex-1"
                    variant="secondary"
                    onClick={handleResetClicks}
                    disabled={saving}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Clics
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
