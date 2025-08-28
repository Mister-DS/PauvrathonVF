// src/pages/SubathonPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { GuessNumber } from '@/components/minigames/GuessNumber';
import { Hangman } from '@/components/minigames/Hangman';
import { TwitchPlayer } from '@/components/TwitchPlayer';
import { Navigation } from '@/components/Navigation';
import { toast } from '@/hooks/use-toast';
import { Streamer } from '@/types';
import { Maximize, Minimize, Trophy, RotateCcw } from 'lucide-react';

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
  const [pauvrathonEndTime, setPauvrathonEndTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    fetchStreamerData();
    // Vérifier le statut du stream régulièrement
    const interval = setInterval(checkStreamStatus, 30000); // Toutes les 30 secondes
    return () => clearInterval(interval);
  }, [id]);

  // Horloge en temps réel et calcul du temps restant
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Calculer le temps restant du pauvrathon
      if (pauvrathonEndTime) {
        const remaining = pauvrathonEndTime.getTime() - now.getTime();
        if (remaining > 0) {
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeRemaining("Terminé");
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [pauvrathonEndTime]);

  // Countdown timer for game restart
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0 && !showMinigame && failedAttempts > 0 && failedAttempts < 3) {
      // Relancer automatiquement le jeu après le countdown
      setShowMinigame(true);
    }
    return () => clearTimeout(timer);
  }, [countdown, showMinigame, failedAttempts]);

  const fetchStreamerData = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('streamers')
        .select(`
          *,
          profiles(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setStreamer(data as unknown as Streamer);
        setCurrentClicks(data.current_clicks || 0);
        setClicksRequired(data.clicks_required || 10);
        
        // Calculer la fin du pauvrathon (exemple: 2 heures depuis maintenant + temps ajouté)
        const now = new Date();
        const baseDuration = 2 * 60 * 60; // 2 heures en secondes
        const totalDuration = (baseDuration + (data.total_time_added || 0)) * 1000;
        setPauvrathonEndTime(new Date(now.getTime() + totalDuration));
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

  const checkStreamStatus = async () => {
    if (!streamer?.profile?.twitch_username) return;

    try {
      // Appel à l'API Twitch pour vérifier si le stream est en ligne
      const response = await fetch(`/api/twitch/stream-status/${streamer.profile.twitch_username}`);
      if (response.ok) {
        const data = await response.json();
        setStreamOnline(data.isLive);
        setStreamData(data.streamData);
      }
    } catch (error) {
      console.error('Error checking stream status:', error);
      // En cas d'erreur, essayer de détecter via le player Twitch
      setStreamOnline(true); // Par défaut en ligne si erreur API
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

    if (!streamOnline) {
      toast({
        title: "Stream hors ligne",
        description: "Vous ne pouvez cliquer que quand le streamer est en direct !",
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
      title: "🎉 Félicitations !",
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

      toast({
        title: "⏰ Temps ajouté !",
        description: `${timeToAdd} secondes ajoutées au subathon de ${streamer.profile?.twitch_display_name} !`,
      });

      // Redirection vers la page du streamer
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
        title: "💥 Échec total",
        description: "3 échecs ! Vous devez recommencer à cliquer.",
        variant: "destructive",
      });
      setFailedAttempts(0);
    } else {
      toast({
        title: `❌ Échec ${newFailedAttempts}/3`,
        description: "Nouvelle tentative dans 5 secondes...",
        variant: "destructive",
      });
      setCountdown(5);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handlePlayerReady = () => {
    console.log('Twitch player is ready');
    setStreamOnline(true);
    checkStreamStatus(); // Vérifier immédiatement le statut
  };

  const handleStreamOnline = () => {
    setStreamOnline(true);
  };

  const handleStreamOffline = () => {
    setStreamOnline(false);
  };

  const resetClickingPhase = () => {
    setFailedAttempts(0);
    setShowMinigame(false);
    setShowVictoryButton(false);
    setGameWon(false);
    setCountdown(0);
    toast({
      title: "🔄 Remise à zéro",
      description: "Vous pouvez recommencer à cliquer !",
    });
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
            <Button onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Extraire le nom d'utilisateur Twitch du streamer de manière plus robuste
  const twitchUsername = streamer?.profile?.twitch_username || 
                         streamer?.profile?.twitch_display_name?.replace(/\s+/g, '').toLowerCase() ||
                         null;

  // Déterminer le nom d'affichage
  const displayName = streamer?.profile?.twitch_display_name || 
                     streamer?.profile?.twitch_username ||
                     'Streamer';

  // URL de l'avatar
  const avatarUrl = streamer?.profile?.avatar_url || null;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <Navigation />
      
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header avec photo et nom du STREAMER */}
        <div className="flex items-center gap-6 mb-6 p-6 bg-card rounded-lg border">
          <Avatar className="h-24 w-24 border-4 border-primary">
            <AvatarImage 
              src={avatarUrl} 
              alt={displayName}
            />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-bold">
                {displayName}
              </h1>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${streamOnline ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                <span className={`text-lg font-bold ${streamOnline ? 'text-red-500' : 'text-gray-500'}`}>
                  {streamOnline ? 'EN DIRECT' : 'HORS LIGNE'}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground text-xl mb-2">Pauvrathon en cours</p>
            {streamOnline && (
              <div className="flex items-center gap-4 text-lg font-bold">
                <span className="text-orange-500">⏰ Temps restant: {timeRemaining || 'Calcul en cours...'}</span>
                {streamData?.viewer_count && (
                  <span className="text-purple-500">👥 {streamData.viewer_count} spectateurs</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`grid gap-6 ${isFullscreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {/* Côté gauche: Stream et interactions */}
          <div className="space-y-6">
            {/* Lecteur de stream du STREAMER */}
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
                        <p className="text-lg mb-2">⚠️ Configuration manquante</p>
                        <p className="text-sm text-gray-400">
                          Le nom d'utilisateur Twitch n'est pas configuré
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Nom trouvé: {displayName}
                        </p>
                        <p className="text-xs text-red-400">
                          Username manquant: {twitchUsername || 'null'}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded opacity-0 hover:opacity-100 transition-opacity">
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bouton de participation */}
            {!isFullscreen && (
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <Progress value={(currentClicks / clicksRequired) * 100} className="w-full h-3" />
                  <p className="text-center text-sm text-muted-foreground">
                    {currentClicks} / {clicksRequired} clics pour déclencher un mini-jeu
                  </p>
                  
                  {/* Bouton de victoire */}
                  {showVictoryButton && gameWon && (
                    <Button 
                      onClick={handleVictoryClick}
                      className="w-full py-6 text-xl font-bold bg-green-600 hover:bg-green-700 animate-pulse"
                      size="lg"
                    >
                      <Trophy className="w-6 h-6 mr-2" />
                      🎉 VICTOIRE ! Ajouter du temps 🎉
                    </Button>
                  )}

                  {/* Bouton principal de clic */}
                  {!showVictoryButton && (
                    <Button 
                      onClick={handleClick} 
                      className={`w-full py-6 text-xl font-bold ${
                        !streamOnline ? 'bg-gray-600 hover:bg-gray-600' : ''
                      }`}
                      disabled={showMinigame || !streamOnline || countdown > 0}
                      size="lg"
                    >
                      {countdown > 0 ? `⏱️ Nouveau jeu dans ${countdown}s` :
                       !streamOnline ? '🔴 Stream hors ligne' : 
                       !user ? '🔒 Connectez-vous pour jouer' :
                       '🎮 Cliquer pour jouer !'}
                    </Button>
                  )}

                  {/* Bouton de remise à zéro après 3 échecs */}
                  {failedAttempts >= 3 && !showMinigame && !showVictoryButton && (
                    <Button 
                      onClick={resetClickingPhase}
                      className="w-full py-6 text-xl font-bold bg-orange-600 hover:bg-orange-700"
                      size="lg"
                    >
                      <RotateCcw className="w-6 h-6 mr-2" />
                      🔄 Recommencer à cliquer
                    </Button>
                  )}

                  {!user && (
                    <p className="text-center text-sm text-muted-foreground">
                      Vous devez vous connecter pour participer au subathon
                    </p>
                  )}
                  {user && !streamOnline && (
                    <p className="text-center text-sm text-red-500 font-medium">
                      ⚠️ Le streamer doit être en ligne pour pouvoir participer
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Côté droit: Mini-jeux et statistiques */}
          {!isFullscreen && (
            <div className="space-y-6">
              {/* Mini-jeu */}
              {showMinigame && (
                <Card className="border-2 border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      🎯 {currentGame === 'guessNumber' ? 'Devine le chiffre' : 'Jeu du pendu'}
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

              {/* Statistiques du subathon */}
              <Card>
                <CardHeader>
                  <CardTitle>📊 Statistiques du Pauvrathon</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>👤 Streamer:</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback className="text-xs">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-purple-600">
                        {displayName}
                      </span>
                    </div>
                  </div>
                  
                   {streamOnline && (
                     <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border-l-4 border-orange-500">
                       <span className="font-bold">⏰ Temps restant:</span>
                       <span className="font-bold text-xl text-orange-600">
                         {timeRemaining || 'Calcul en cours...'}
                       </span>
                     </div>
                   )}
                  
                  {streamOnline && streamData?.started_at && (
                    <div className="flex justify-between items-center">
                      <span>📺 Stream depuis:</span>
                      <span className="font-bold text-green-600">
                        {new Date(streamData.started_at).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                  )}
                  
                  {streamData?.viewer_count && (
                    <div className="flex justify-between items-center">
                      <span>👥 Spectateurs:</span>
                      <span className="font-bold text-orange-600">{streamData.viewer_count}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span>⏰ Temps ajouté total:</span>
                    <span className="font-bold text-lg text-green-600">
                      {Math.floor((streamer.total_time_added || 0) / 3600)}h {Math.floor(((streamer.total_time_added || 0) % 3600) / 60)}m {(streamer.total_time_added || 0) % 60}s
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>🎯 Temps par victoire:</span>
                    <span className="font-bold text-blue-600">{streamer.time_increment || 30}s</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>🎮 Clics requis:</span>
                    <span className="font-bold text-orange-600">{clicksRequired} clics</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span>📺 Statut du stream:</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${streamOnline ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                      <span className={`font-bold ${streamOnline ? 'text-red-500' : 'text-gray-500'}`}>
                        {streamOnline ? '🔴 EN DIRECT' : '⚫ HORS LIGNE'}
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