// src/pages/SubathonPage.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// Importation du dictionnaire de mini-jeux centralisé
import { minigameComponents } from '@/components/minigames';
import { TwitchPlayer } from '@/components/TwitchPlayer';
import { Navigation } from '@/components/Navigation';
import { toast } from '@/hooks/use-toast';
import { Streamer, Minigame } from '@/types';
import {
  Maximize, Minimize, Trophy, RotateCcw, AlertTriangle,
  Wifi, Play, Pause, Square, Clock, Settings, Gamepad2, Plus
} from 'lucide-react';

const SubathonPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentClicks, setCurrentClicks] = useState(0);
  const [clicksRequired, setClicksRequired] = useState(10);
  const [showMinigame, setShowMinigame] = useState(false);
  const [currentGame, setCurrentGame] = useState<Minigame | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamOnline, setStreamOnline] = useState(false);
  const [showVictoryButton, setShowVictoryButton] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [streamData, setStreamData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [forceStreamOnline, setForceStreamOnline] = useState(false);

  const [showTimerConfig, setShowTimerConfig] = useState(false);
  const [initialHours, setInitialHours] = useState(2);
  const [initialMinutes, setInitialMinutes] = useState(0);
  const [isStreamerOwner, setIsStreamerOwner] = useState(false);

  const [simulationMode, setSimulationMode] = useState(false);
  
  // État pour stocker la liste des jeux actifs
  const [dynamicGames, setDynamicGames] = useState<Minigame[]>([]);

  useEffect(() => {
    fetchStreamerData();
    fetchDynamicGames(); // Récupérer la liste des jeux actifs
    const interval = setInterval(fetchStreamerData, 5000);
    const statusInterval = setInterval(checkStreamStatus, 30000);
    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, [id]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && !showMinigame && failedAttempts > 0 && failedAttempts < 3) {
      setShowMinigame(true);
    }
    return () => clearTimeout(timer);
  }, [countdown, showMinigame, failedAttempts]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      if (!streamer) {
        setTimeRemaining("--:--:--");
        return;
      }
      const baseDuration = streamer.initial_duration || 7200;
      const totalDuration = baseDuration + (streamer.total_time_added || 0);
      if (streamer.status === 'live' && streamer.stream_started_at) {
        const startTime = new Date(streamer.stream_started_at).getTime();
        let elapsed = Math.floor((now.getTime() - startTime) / 1000);
        if (streamer.total_paused_duration) {
          elapsed = Math.max(0, elapsed - streamer.total_paused_duration);
        }
        const remaining = Math.max(0, totalDuration - elapsed);
        if (remaining > 0) {
          const hours = Math.floor(remaining / 3600);
          const minutes = Math.floor((remaining % 3600) / 60);
          const seconds = remaining % 60;
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeRemaining("Terminé");
        }
      } else if (streamer.status === 'paused') {
        if (streamer.pause_started_at && streamer.stream_started_at) {
          const startTime = new Date(streamer.stream_started_at).getTime();
          const pauseTime = new Date(streamer.pause_started_at).getTime();
          let elapsedWhenPaused = Math.floor((pauseTime - startTime) / 1000);
          if (streamer.total_paused_duration) {
            elapsedWhenPaused = Math.max(0, elapsedWhenPaused - streamer.total_paused_duration);
          }
          const remainingWhenPaused = Math.max(0, totalDuration - elapsedWhenPaused);
          const hours = Math.floor(remainingWhenPaused / 3600);
          const minutes = Math.floor((remainingWhenPaused % 3600) / 60);
          const seconds = remainingWhenPaused % 60;
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          const hours = Math.floor(totalDuration / 3600);
          const minutes = Math.floor((totalDuration % 3600) / 60);
          const seconds = totalDuration % 60;
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        }
      } else if (streamer.status === 'ended') {
        setTimeRemaining("Terminé");
      } else {
        const hours = Math.floor(totalDuration / 3600);
        const minutes = Math.floor((totalDuration % 3600) / 60);
        const seconds = totalDuration % 60;
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [streamer?.status, streamer?.total_time_added, streamer?.initial_duration, streamer?.stream_started_at, streamer?.pause_started_at, streamer?.total_paused_duration]);

  const fetchStreamerData = async () => {
    if (!id) return;
    try {
      const { data: streamerData, error: streamerError } = await supabase
        .from('streamers')
        .select('*')
        .eq('id', id)
        .single();
      if (streamerError) throw streamerError;
      if (!streamerData) throw new Error('Streamer non trouvé');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', streamerData.user_id)
        .single();
      if (profileError) console.warn('Profil non trouvé:', profileError);
      const completeStreamerData = {
        ...streamerData,
        profile: profileData || null
      };
      setStreamer(completeStreamerData as unknown as Streamer);
      setCurrentClicks(streamerData.current_clicks || 0);
      setClicksRequired(streamerData.clicks_required || 10);
      setIsStreamerOwner(user?.id === streamerData.user_id);
      if (user && user.id === '5cee82f9-1c72-4a76-abdc-021976598a77') {
        setSimulationMode(true);
        toast({
          title: "Mode Test Activé",
          description: "Vous pouvez maintenant tester les clics et mini-jeux !",
        });
      }
      if (streamerData.initial_duration) {
        setInitialHours(Math.floor(streamerData.initial_duration / 3600));
        setInitialMinutes(Math.floor((streamerData.initial_duration % 3600) / 60));
      }
      const isLive = streamerData.status === 'live';
      if (playerLoaded && !forceStreamOnline) {
      } else {
        setStreamOnline(isLive);
      }
    } catch (error) {
      console.error('Error fetching streamer:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations du streamer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Nouvelle fonction pour récupérer la liste des mini-jeux actifs
  const fetchDynamicGames = async () => {
    try {
      const { data, error } = await supabase
        .from('minigames')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      setDynamicGames(data || []);
    } catch (error) {
      console.error('Error fetching dynamic games:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des jeux actifs.",
        variant: "destructive",
      });
    }
  };

  const updateInitialDuration = async () => {
    if (!streamer || !isStreamerOwner) return;
    const newDuration = (initialHours * 3600) + (initialMinutes * 60);
    try {
      const { error } = await supabase
        .from('streamers')
        .update({ initial_duration: newDuration })
        .eq('id', streamer.id);
      if (error) throw error;
      toast({
        title: "Durée mise à jour",
        description: `Durée initiale définie à ${initialHours}h ${initialMinutes}m`,
      });
      setShowTimerConfig(false);
      await fetchStreamerData();
    } catch (error) {
      console.error('Error updating duration:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la durée.",
        variant: "destructive",
      });
    }
  };

  const startPauvrathon = async () => {
    if (!streamer || !isStreamerOwner) return;
    try {
      const now = new Date();
      const { error } = await supabase
        .from('streamers')
        .update({
          status: 'live',
          is_live: true,
          stream_started_at: now.toISOString(),
          pause_started_at: null
        })
        .eq('id', streamer.id);
      if (error) throw error;
      toast({
        title: "Pauvrathon démarré!",
        description: "Le pauvrathon a commencé. Bonne chance!",
      });
      await fetchStreamerData();
    } catch (error) {
      console.error('Error starting pauvrathon:', error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer le pauvrathon.",
        variant: "destructive",
      });
    }
  };

  const pausePauvrathon = async () => {
    if (!streamer || !isStreamerOwner) return;
    try {
      const now = new Date();
      const { error } = await supabase
        .from('streamers')
        .update({
          status: 'paused',
          is_live: false,
          pause_started_at: now.toISOString()
        })
        .eq('id', streamer.id);
      if (error) throw error;
      toast({
        title: "Pauvrathon en pause",
        description: "Le pauvrathon a été mis en pause.",
      });
      await fetchStreamerData();
    } catch (error) {
      console.error('Error pausing pauvrathon:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre en pause le pauvrathon.",
        variant: "destructive",
      });
    }
  };

  const stopPauvrathon = async () => {
    if (!streamer || !isStreamerOwner) return;
    try {
      const { error } = await supabase
        .from('streamers')
        .update({
          status: 'ended',
          is_live: false,
          pause_started_at: null
        })
        .eq('id', streamer.id);
      if (error) throw error;
      toast({
        title: "Pauvrathon terminé",
        description: "Le pauvrathon a été arrêté.",
      });
      await fetchStreamerData();
    } catch (error) {
      console.error('Error stopping pauvrathon:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'arrêter le pauvrathon.",
        variant: "destructive",
      });
    }
  };

  const checkStreamStatus = async () => {
    if (!streamer?.profile?.twitch_username) return;
    const twitchUsername = streamer?.profile?.twitch_username;
    try {
      const response = await fetch(`/api/twitch/stream-status/${twitchUsername}`);
      if (response.ok) {
        const data = await response.json();
        setStreamData(data.streamData);
        if (data.isLive && !streamOnline) {
          setStreamOnline(true);
        } else if (!data.isLive && streamOnline && !forceStreamOnline) {
          setStreamOnline(false);
        }
      }
    } catch (error) {
      console.error('Error checking stream status:', error);
    }
  };

  const handleClick = async () => {
    if (!streamer || !user) {
      if (!user) {
        toast({
          title: "Connexion requise",
          description: "Connectez-vous pour participer au subathon !",
          variant: "destructive",
        });
      }
      return;
    }

    const canClick = simulationMode || streamer.status === 'live';
    if (!canClick) {
      toast({
        title: "Pauvrathon non actif",
        description: `Le pauvrathon n'est pas démarré (statut: ${streamer.status}). Activez le mode simulation pour tester.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const newClicks = currentClicks + 1;
      setCurrentClicks(newClicks);
      const { error } = await supabase
        .from('streamers')
        .update({ current_clicks: newClicks })
        .eq('id', streamer.id);
      if (error) throw error;
      if (newClicks >= clicksRequired) {
        launchRandomMinigame();
        setCurrentClicks(0);
        await supabase
          .from('streamers')
          .update({ current_clicks: 0 })
          .eq('id', streamer.id);
      }
    } catch (error) {
      console.error('Error handling click:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre clic.",
        variant: "destructive",
      });
    }
  };

  const launchRandomMinigame = () => {
    // Si aucun jeu n'est actif, afficher un message d'erreur
    if (dynamicGames.length === 0) {
      toast({
        title: "Aucun mini-jeu disponible",
        description: "Le streamer n'a pas activé de mini-jeu dans le panneau d'administration.",
        variant: "destructive",
      });
      return;
    }
    
    // Sélectionner un jeu aléatoire parmi les jeux actifs de la base de données
    const randomGame = dynamicGames[Math.floor(Math.random() * dynamicGames.length)];
    
    setCurrentGame(randomGame);
    setShowMinigame(true);
    setFailedAttempts(0);
    setShowVictoryButton(false);
    setGameWon(false);

    toast({
      title: "Mini-jeu lancé !",
      description: `Jeu: ${randomGame.name}`,
    });
  };

  const handleGameWin = async (score: number = 1) => {
    if (!streamer) return;
    setGameWon(true);
    setShowVictoryButton(true);
    setShowMinigame(false);
    let timeToAdd: number;
    if (streamer.time_mode === 'random') {
      const minTime = streamer.min_random_time || 10;
      const maxTime = streamer.max_random_time || 60;
      timeToAdd = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    } else {
      timeToAdd = streamer.time_increment || 30;
    }
    toast({
      title: "Félicitations !",
      description: `Score: ${score}! Temps à ajouter: ${timeToAdd}s`,
    });
    try {
      const newTotalTime = (streamer.total_time_added || 0) + timeToAdd;
      const { error } = await supabase
        .from('streamers')
        .update({ total_time_added: newTotalTime })
        .eq('id', streamer.id);
      if (error) throw error;
      await fetchStreamerData();
      setFailedAttempts(0);
      setShowVictoryButton(false);
      setGameWon(false);
    } catch (error) {
      console.error('Error adding time:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le temps.",
        variant: "destructive",
      });
    }
  };

  const handleVictoryClick = async () => {
    if (!streamer) return;
    try {
      const timeToAdd = streamer.time_increment || 30;
      const newTotalTime = (streamer.total_time_added || 0) + timeToAdd;
      const { error } = await supabase
        .from('streamers')
        .update({ total_time_added: newTotalTime })
        .eq('id', streamer.id);
      if (error) throw error;
      const displayName = getDisplayName();
      toast({
        title: "Temps ajouté !",
        description: `${timeToAdd} secondes ajoutées au subathon de ${displayName} !`,
      });
      await fetchStreamerData();
    } catch (error) {
      console.error('Error adding time:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le temps.",
        variant: "destructive",
      });
    }
  };

  const handleGameLose = () => {
    const newFailedAttempts = failedAttempts + 1;
    setFailedAttempts(newFailedAttempts);
    setShowMinigame(false);
    if (newFailedAttempts >= 3) {
      toast({
        title: "Échec total",
        description: "3 tentatives échouées ! Vous devez recommencer à cliquer.",
        variant: "destructive",
      });
      setFailedAttempts(0);
    } else {
      toast({
        title: `Tentative ${newFailedAttempts}/3 échouée`,
        description: `Nouvelle tentative (12 essais) dans 3 secondes...`,
        variant: "destructive",
      });
      setCountdown(3);
    }
  };

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);
  const handlePlayerReady = () => {
    setPlayerLoaded(true);
    setTimeout(checkStreamStatus, 2000);
  };
  const handleStreamOnline = () => setStreamOnline(true);
  const handleStreamOffline = () => {
    if (streamer?.status !== 'live') setStreamOnline(false);
  };
  const resetClickingPhase = () => {
    setFailedAttempts(0);
    setShowMinigame(false);
    setShowVictoryButton(false);
    setGameWon(false);
    setCountdown(0);
    toast({
      title: "Remise à zéro",
      description: "Vous pouvez recommencer à cliquer !",
    });
  };
  const forceStreamOnlineToggle = () => {
    setForceStreamOnline(!forceStreamOnline);
    setStreamOnline(!forceStreamOnline);
    toast({
      title: forceStreamOnline ? "Mode automatique" : "Mode forcé",
      description: forceStreamOnline ? "Détection automatique réactivée" : "Stream forcé comme en ligne",
    });
  };
  const getTwitchUsername = () => {
    if (!streamer) return null;
    return streamer?.profile?.twitch_username ||
           streamer?.profile?.twitch_display_name?.replace(/\s+/g, '').toLowerCase() ||
           null;
  };
  const getDisplayName = () => {
    if (!streamer) return 'Streamer inconnu';
    return streamer?.profile?.twitch_display_name ||
           streamer?.profile?.twitch_username ||
           'Streamer inconnu';
  };
  const getAvatarUrl = () => {
    if (!streamer) return null;
    return streamer?.profile?.avatar_url || null;
  };

  const renderCurrentGame = () => {
    if (!currentGame) return null;
    const GameComponent = minigameComponents[currentGame.name];
    if (GameComponent) {
      return (
        <GameComponent
          onWin={handleGameWin}
          onLose={handleGameLose}
          attempts={0}
          maxAttempts={12}
        />
      );
    }
    console.error(`Le mini-jeu nommé "${currentGame.name}" n'a pas de composant associé.`);
    toast({
      title: "Erreur",
      description: `Le jeu "${currentGame.name}" n'a pas pu être chargé.`,
      variant: "destructive",
    });
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Chargement du subathon...</p>
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
        <div className="container mx-auto p-4">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">Streamer non trouvé</h1>
            <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
          </div>
        </div>
      </div>
    );
  }

  const twitchUsername = getTwitchUsername();
  const displayName = getDisplayName();
  const avatarUrl = getAvatarUrl();
  const canInteract = user && (simulationMode || streamer.status === 'live');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="flex items-center gap-6 mb-6 p-6 bg-card rounded-lg border">
          <Avatar className="h-24 w-24 border-4 border-primary">
            <AvatarImage src={avatarUrl || ''} alt={displayName} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-bold">{displayName}</h1>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${
                  streamer?.status === 'live' ? 'bg-red-500 animate-pulse' :
                  streamer?.status === 'paused' ? 'bg-yellow-500' :
                  streamer?.status === 'ended' ? 'bg-gray-400' : 'bg-gray-500'
                }`}></div>
                <span className={`text-lg font-bold ${
                  streamer?.status === 'live' ? 'text-red-500' :
                  streamer?.status === 'paused' ? 'text-yellow-500' :
                  streamer?.status === 'ended' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {streamer?.status === 'live' ? 'EN DIRECT' :
                   streamer?.status === 'paused' ? 'EN PAUSE' :
                   streamer?.status === 'ended' ? 'TERMINÉ' : 'HORS LIGNE'}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground text-xl mb-2">Pauvrathon en cours</p>
            {(streamer?.status === 'live' || streamer?.status === 'paused') && timeRemaining && (
              <div className="flex items-center gap-4 text-lg font-bold">
                <span className={`${streamer?.status === 'paused' ? 'text-yellow-500' : 'text-orange-500'}`}>
                  Temps restant: {timeRemaining}
                  {streamer?.status === 'paused' && <span className="ml-2 text-yellow-500">(EN PAUSE)</span>}
                </span>
                {streamData?.viewer_count && (
                  <span className="text-purple-500">{streamData.viewer_count} spectateurs</span>
                )}
              </div>
            )}
          </div>
          {isStreamerOwner && (
            <div className="flex flex-col gap-2">
              <Dialog open={showTimerConfig} onOpenChange={setShowTimerConfig}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Config
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configuration du Pauvrathon</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hours">Heures</Label>
                        <Input
                          id="hours"
                          type="number"
                          min="0"
                          max="23"
                          value={initialHours}
                          onChange={(e) => setInitialHours(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="minutes">Minutes</Label>
                        <Input
                          id="minutes"
                          type="number"
                          min="0"
                          max="59"
                          value={initialMinutes}
                          onChange={(e) => setInitialMinutes(parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Durée totale: {initialHours}h {initialMinutes}m
                    </p>
                    <Button onClick={updateInitialDuration} className="w-full">
                      Mettre à jour la durée
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <div className="flex gap-1">
                {streamer.status === 'offline' && (
                  <Button onClick={startPauvrathon} size="sm" className="bg-green-600 hover:bg-green-700">
                    <Play className="w-4 h-4" />
                  </Button>
                )}
                {streamer.status === 'live' && (
                  <Button onClick={pausePauvrathon} size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                    <Pause className="w-4 h-4" />
                  </Button>
                )}
                {streamer.status === 'paused' && (
                  <Button onClick={startPauvrathon} size="sm" className="bg-green-600 hover:bg-green-700">
                    <Play className="w-4 h-4" />
                  </Button>
                )}
                {(streamer.status === 'live' || streamer.status === 'paused') && (
                  <Button onClick={stopPauvrathon} size="sm" variant="destructive">
                    <Square className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSimulationMode(!simulationMode)}
                className={simulationMode ? "bg-purple-100 border-purple-500" : ""}
              >
                <Trophy className="w-4 h-4 mr-2" />
                {simulationMode ? "Mode Test ON" : "Mode Test"}
              </Button>
              <Button variant="outline" size="sm" onClick={forceStreamOnlineToggle}
                className={forceStreamOnline ? "bg-green-100 border-green-500" : ""}>
                <Wifi className="w-4 h-4 mr-2" />
                {forceStreamOnline ? "Forcé ON" : "Auto"}
              </Button>
            </div>
          )}
        </div>
        <div className={`grid gap-6 ${isFullscreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          <div className="space-y-6">
            <Card className="relative cursor-pointer" onClick={toggleFullscreen}>
              <CardContent className="p-0">
                <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black p-4' : 'aspect-video'}`}>
                  {twitchUsername ? (
                    <TwitchPlayer
                      channel={twitchUsername}
                      width="100%"
                      height={isFullscreen ? "calc(100vh - 2rem)" : "100%"}
                      muted={false}
                      autoplay={true}
                      onReady={handlePlayerReady}
                      onOnline={handleStreamOnline}
                      onOffline={handleStreamOffline}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg aspect-video">
                      <div className="text-center text-white">
                        <p className="text-lg mb-2">Configuration manquante</p>
                        <p className="text-sm text-gray-400">Le nom d'utilisateur Twitch n'est pas configuré</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded opacity-0 hover:opacity-100 transition-opacity">
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </div>
                </div>
              </CardContent>
            </Card>
            {!isFullscreen && (
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <Progress value={(currentClicks / clicksRequired) * 100} className="w-full h-3" />
                  <p className="text-center text-sm text-muted-foreground">
                    {currentClicks} / {clicksRequired} clics pour déclencher un mini-jeu
                  </p>
                  {showVictoryButton && gameWon && (
                    <Button
                      onClick={handleVictoryClick}
                      className="w-full py-6 text-xl font-bold bg-green-600 hover:bg-green-700 animate-pulse"
                      size="lg"
                    >
                      <Trophy className="w-6 h-6 mr-2" />
                      VICTOIRE ! Ajouter du temps
                    </Button>
                  )}
                  {!showVictoryButton && (
                    <Button
                      onClick={handleClick}
                      className={`w-full py-6 text-xl font-bold ${
                        !canInteract ? 'bg-gray-600 hover:bg-gray-600' :
                        streamer?.status === 'paused' ? 'bg-yellow-600 hover:bg-yellow-600' :
                        simulationMode ? 'bg-purple-600 hover:bg-purple-700' : ''
                      }`}
                      disabled={showMinigame || !canInteract || countdown > 0 || streamer?.status === 'paused'}
                      size="lg"
                    >
                      {countdown > 0 ? `Nouveau jeu dans ${countdown}s` :
                       !user ? 'Connectez-vous pour jouer' :
                       streamer?.status === 'paused' ? 'Pauvrathon en pause' :
                       simulationMode ? 'Mode Test' :
                       (streamer?.status === 'live' && !showMinigame) ? 'Cliquez pour faire avancer le temps !' :
                       showMinigame ? `Jeu en cours` : 'Cliquez pour faire avancer le temps !'}
                    </Button>
                  )}
                  {showMinigame && (
                    <div className="space-y-4">
                      {renderCurrentGame()}
                      <Button onClick={resetClickingPhase} variant="outline" className="w-full">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Annuler le jeu
                      </Button>
                    </div>
                  )}
                  {(!showMinigame && (failedAttempts > 0 || gameWon)) && (
                    <div className="text-center text-sm text-muted-foreground">
                      <Button onClick={resetClickingPhase} variant="outline">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Retourner aux clics
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          {!isFullscreen && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Gamepad2 className="mr-2 h-5 w-5" />
                    Mini-jeux
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showMinigame ? (
                    <div className="space-y-4">
                      {renderCurrentGame()}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <Gamepad2 className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Un mini-jeu se lancera automatiquement dès que les clics requis seront atteints.
                      </p>
                      {isStreamerOwner && (
                        <Button onClick={launchRandomMinigame} className="mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          Lancer un jeu aléatoire (admin)
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
                    Règles du Pauvrathon
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>1. Le stream s'arrête si le compteur arrive à zéro.</p>
                  <p>2. Chaque clic fait avancer une barre de progression.</p>
                  <p>3. Une fois la barre pleine, un mini-jeu se déclenche.</p>
                  <p>4. Réussir le mini-jeu ajoute du temps au compteur.</p>
                  <p>5. Échouer au mini-jeu réinitialise la barre de clics.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubathonPage;