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
import { GuessNumber } from '@/components/minigames/GuessNumber';
import { Hangman } from '@/components/minigames/Hangman';
import { TwitchPlayer } from '@/components/TwitchPlayer';
import { Navigation } from '@/components/Navigation';
import { toast } from '@/hooks/use-toast';
import { Streamer } from '@/types';
import { 
  Maximize, Minimize, Trophy, RotateCcw, AlertTriangle, 
  Wifi, Play, Pause, Square, Clock, Settings 
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
  const [currentGame, setCurrentGame] = useState<string>('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamOnline, setStreamOnline] = useState(false);
  const [showVictoryButton, setShowVictoryButton] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [streamData, setStreamData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pauvrathonStartTime, setPauvrathonStartTime] = useState<Date | null>(null);
  const [pausedTimeRemaining, setPausedTimeRemaining] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [forceStreamOnline, setForceStreamOnline] = useState(false);
  
  // Configuration du timer
  const [showTimerConfig, setShowTimerConfig] = useState(false);
  const [initialHours, setInitialHours] = useState(2);
  const [initialMinutes, setInitialMinutes] = useState(0);
  const [isStreamerOwner, setIsStreamerOwner] = useState(false);

  useEffect(() => {
    fetchStreamerData();
    const interval = setInterval(checkStreamStatus, 30000);
    return () => clearInterval(interval);
  }, [id]);

  // Timer avec gestion de la pause
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      if (streamer?.status === 'live' && pauvrathonStartTime) {
        const baseDuration = (streamer.initial_duration || 7200); // En secondes
        const totalDuration = baseDuration + (streamer.total_time_added || 0);
        const elapsed = Math.floor((now.getTime() - pauvrathonStartTime.getTime()) / 1000);
        const remaining = Math.max(0, totalDuration - elapsed);
        
        if (remaining > 0) {
          const hours = Math.floor(remaining / 3600);
          const minutes = Math.floor((remaining % 3600) / 60);
          const seconds = remaining % 60;
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeRemaining("Terminé");
        }
      } else if (streamer?.status === 'paused' && pausedTimeRemaining !== null) {
        const hours = Math.floor(pausedTimeRemaining / 3600);
        const minutes = Math.floor((pausedTimeRemaining % 3600) / 60);
        const seconds = pausedTimeRemaining % 60;
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (streamer?.status === 'ended') {
        setTimeRemaining("Terminé");
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [streamer?.status, streamer?.total_time_added, streamer?.initial_duration, pauvrathonStartTime, pausedTimeRemaining]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0 && !showMinigame && failedAttempts > 0 && failedAttempts < 3) {
      setShowMinigame(true);
    }
    return () => clearTimeout(timer);
  }, [countdown, showMinigame, failedAttempts]);

  const fetchStreamerData = async () => {
    if (!id) return;

    try {
      let { data, error } = await supabase
        .from('streamers')
        .select(`
          *,
          profiles!inner(
            id,
            user_id,
            twitch_id,
            twitch_username,
            twitch_display_name,
            avatar_url,
            role
          )
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        const response = await supabase
          .from('streamers')
          .select(`
            *,
            profiles(
              id,
              user_id,
              twitch_id,
              twitch_username,
              twitch_display_name,
              avatar_url,
              role
            )
          `)
          .eq('id', id)
          .single();
        
        data = response.data;
        error = response.error;
      }

      if (error || !data) {
        const streamerResponse = await supabase
          .from('streamers')
          .select('*')
          .eq('id', id)
          .single();

        if (streamerResponse.error) throw streamerResponse.error;

        if (streamerResponse.data) {
          const profileResponse = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', streamerResponse.data.user_id)
            .single();

          data = {
            ...streamerResponse.data,
            profiles: profileResponse.data || null,
            profile: profileResponse.data || null
          };
        }
      }

      if (!data) throw new Error('Aucune donnée trouvée pour ce streamer');

      setStreamer(data as unknown as Streamer);
      setCurrentClicks(data.current_clicks || 0);
      setClicksRequired(data.clicks_required || 10);
      
      // Vérifier si l'utilisateur est le propriétaire du stream
      setIsStreamerOwner(user?.id === data.user_id);
      
      // Initialiser les valeurs de temps
      if (data.initial_duration) {
        setInitialHours(Math.floor(data.initial_duration / 3600));
        setInitialMinutes(Math.floor((data.initial_duration % 3600) / 60));
      }

      const isLive = data.status === 'live';
      const isPaused = data.status === 'paused';
      
      if (playerLoaded && !forceStreamOnline) {
        console.log('Using Twitch player detection for stream status');
      } else {
        setStreamOnline(isLive);
      }
      
      // Gestion des temps avec persistance
      if (isLive) {
        const startTime = data.stream_started_at 
          ? new Date(data.stream_started_at) 
          : new Date();
        setPauvrathonStartTime(startTime);
        setPausedTimeRemaining(null);
      } else if (isPaused) {
        const baseDuration = data.initial_duration || 7200;
        const totalDuration = baseDuration + (data.total_time_added || 0);
        
        if (data.pause_started_at && data.stream_started_at) {
          const pauseTime = new Date(data.pause_started_at);
          const startTime = new Date(data.stream_started_at);
          const elapsedWhenPaused = Math.floor((pauseTime.getTime() - startTime.getTime()) / 1000);
          const remainingWhenPaused = Math.max(0, totalDuration - elapsedWhenPaused);
          setPausedTimeRemaining(remainingWhenPaused);
        } else {
          setPausedTimeRemaining(totalDuration);
        }
        setPauvrathonStartTime(null);
      } else {
        setPauvrathonStartTime(null);
        setPausedTimeRemaining(null);
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
    if (!streamer?.profiles?.twitch_username && !streamer?.profile?.twitch_username) return;
    const twitchUsername = streamer?.profiles?.twitch_username || streamer?.profile?.twitch_username;

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

    // Logique plus permissive : si le statut DB est 'live', on peut cliquer
    const canClick = streamer.status === 'live';
    
    if (!canClick) {
      toast({
        title: "Pauvrathon non actif",
        description: `Le pauvrathon n'est pas démarré (statut: ${streamer.status}).`,
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
    const games = ['guessNumber', 'hangman'];
    const randomGame = games[Math.floor(Math.random() * games.length)];
    setCurrentGame(randomGame);
    setShowMinigame(true);
    setFailedAttempts(0);
    setShowVictoryButton(false);
    setGameWon(false);
  };

  const handleGameWin = async () => {
    if (!streamer) return;
    setGameWon(true);
    setShowVictoryButton(true);
    setShowMinigame(false);
    toast({
      title: "Félicitations !",
      description: `Vous avez réussi le mini-jeu ! Cliquez sur le bouton de victoire pour ajouter du temps.`,
    });
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

      setTimeout(() => {
        navigate(`/streamer/${streamer.id}`);
      }, 2000);

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
        description: "3 échecs ! Vous devez recommencer à cliquer.",
        variant: "destructive",
      });
      setFailedAttempts(0);
    } else {
      toast({
        title: `Échec ${newFailedAttempts}/3`,
        description: "Nouvelle tentative dans 5 secondes...",
        variant: "destructive",
      });
      setCountdown(5);
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
    return streamer?.profiles?.twitch_username || 
           streamer?.profile?.twitch_username || 
           streamer?.profiles?.twitch_display_name?.replace(/\s+/g, '').toLowerCase() ||
           streamer?.profile?.twitch_display_name?.replace(/\s+/g, '').toLowerCase() ||
           null;
  };

  const getDisplayName = () => {
    if (!streamer) return 'Streamer inconnu';
    return streamer?.profiles?.twitch_display_name || 
           streamer?.profile?.twitch_display_name ||
           streamer?.profiles?.twitch_username ||
           streamer?.profile?.twitch_username ||
           'Streamer inconnu';
  };

  const getAvatarUrl = () => {
    if (!streamer) return null;
    return streamer?.profiles?.avatar_url || 
           streamer?.profile?.avatar_url || 
           null;
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
  
  // État effectif pour l'interaction - priorité au statut DB
  const canInteract = user && streamer.status === 'live';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header avec contrôles streamer */}
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
                <span className="text-orange-500">Temps restant: {timeRemaining}</span>
                {streamData?.viewer_count && (
                  <span className="text-purple-500">{streamData.viewer_count} spectateurs</span>
                )}
              </div>
            )}
          </div>
          
          {/* Contrôles pour le streamer propriétaire */}
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
                      <Clock className="w-4 h-4 mr-2" />
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
              
              <Button variant="outline" size="sm" onClick={forceStreamOnlineToggle}
                className={forceStreamOnline ? "bg-green-100 border-green-500" : ""}>
                <Wifi className="w-4 h-4 mr-2" />
                {forceStreamOnline ? "Forcé ON" : "Auto"}
              </Button>
            </div>
          )}
        </div>

        <div className={`grid gap-6 ${isFullscreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {/* Côté gauche: Stream et interactions */}
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
                        !canInteract ? 'bg-gray-600 hover:bg-gray-600' : ''
                      }`}
                      disabled={showMinigame || !canInteract || countdown > 0}
                      size="lg"
                    >
                      {countdown > 0 ? `Nouveau jeu dans ${countdown}s` :
                       !user ? 'Connectez-vous pour jouer' :
                       !canInteract ? 'Pauvrathon non actif' : 
                       'Cliquer pour jouer !'}
                    </Button>
                  )}

                  {failedAttempts >= 3 && !showMinigame && !showVictoryButton && (
                    <Button 
                      onClick={resetClickingPhase}
                      className="w-full py-6 text-xl font-bold bg-orange-600 hover:bg-orange-700"
                      size="lg"
                    >
                      <RotateCcw className="w-6 h-6 mr-2" />
                      Recommencer à cliquer
                    </Button>
                  )}

                  {!user && (
                    <p className="text-center text-sm text-muted-foreground">
                      Vous devez vous connecter pour participer au subathon
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {!isFullscreen && (
            <div className="space-y-6">
              {showMinigame && (
                <Card className="border-2 border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {currentGame === 'guessNumber' ? 'Devine le chiffre' : 'Jeu du pendu'}
                      <span className="text-sm font-normal text-muted-foreground">
                        Échecs: {failedAttempts}/3
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentGame === 'guessNumber' && (
                      <GuessNumber
                        onWin={handleGameWin}
                        onLose={handleGameLose}
                        attempts={failedAttempts}
                        maxAttempts={3}
                      />
                    )}
                    {currentGame === 'hangman' && (
                      <Hangman
                        onWin={handleGameWin}
                        onLose={handleGameLose}
                        attempts={failedAttempts}
                        maxAttempts={3}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Statistiques du Pauvrathon</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Streamer:</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={avatarUrl || ''} />
                        <AvatarFallback className="text-xs">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-purple-600">
                        {displayName}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Durée initiale:</span>
                    <span className="font-bold text-blue-600">
                      {Math.floor((streamer.initial_duration || 7200) / 3600)}h {Math.floor(((streamer.initial_duration || 7200) % 3600) / 60)}m
                    </span>
                  </div>
                  
                   {(streamer.status === 'live' || streamer.status === 'paused') && (
                     <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border-l-4 border-orange-500">
                       <span className="font-bold">Temps restant:</span>
                       <span className="font-bold text-xl text-orange-600">
                         {timeRemaining || 'Calcul en cours...'}
                       </span>
                     </div>
                   )}
                  
                  {streamOnline && streamData?.started_at && (
                    <div className="flex justify-between items-center">
                      <span>Stream depuis:</span>
                      <span className="font-bold text-green-600">
                        {new Date(streamData.started_at).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                  )}
                  
                  {streamData?.viewer_count && (
                    <div className="flex justify-between items-center">
                      <span>Spectateurs:</span>
                      <span className="font-bold text-orange-600">{streamData.viewer_count}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span>Temps ajouté total:</span>
                    <span className="font-bold text-lg text-green-600">
                      {Math.floor((streamer.total_time_added || 0) / 3600)}h {Math.floor(((streamer.total_time_added || 0) % 3600) / 60)}m {(streamer.total_time_added || 0) % 60}s
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Temps par victoire:</span>
                    <span className="font-bold text-blue-600">{streamer.time_increment || 30}s</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Clics requis:</span>
                    <span className="font-bold text-orange-600">{clicksRequired} clics</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>Statut du stream:</span>
                     <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${
                         streamer?.status === 'live' ? 'bg-red-500 animate-pulse' : 
                         streamer?.status === 'paused' ? 'bg-yellow-500' :
                         streamer?.status === 'ended' ? 'bg-gray-400' : 'bg-gray-500'
                       }`}></div>
                       <span className={`font-bold ${
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