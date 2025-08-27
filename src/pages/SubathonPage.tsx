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
import { Maximize, Minimize } from 'lucide-react';

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

  useEffect(() => {
    fetchStreamerData();
  }, [id]);

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
  };

  const handleGameWin = async () => {
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
        title: "🎉 Félicitations !",
        description: `Vous avez ajouté ${timeToAdd} secondes au subathon de ${streamer.profile?.twitch_display_name} !`,
      });

      setShowMinigame(false);

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

    if (newFailedAttempts >= 3) {
      toast({
        title: "💥 Échec",
        description: "3 échecs ! Vous devez recommencer à cliquer.",
        variant: "destructive",
      });
      setShowMinigame(false);
    } else {
      toast({
        title: `❌ Échec ${newFailedAttempts}/3`,
        description: "Nouvelle tentative dans 5 secondes...",
        variant: "destructive",
      });
      setTimeout(() => {
        setShowMinigame(false);
        setTimeout(() => {
          setShowMinigame(true);
        }, 100);
      }, 5000);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handlePlayerReady = () => {
    console.log('Twitch player is ready');
    setStreamOnline(true);
  };

  const handleStreamOnline = () => {
    setStreamOnline(true);
  };

  const handleStreamOffline = () => {
    setStreamOnline(false);
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

  // Extraire le nom d'utilisateur Twitch du streamer
  const twitchUsername = streamer.profile?.twitch_username || 
                         streamer.profile?.twitch_display_name?.replace(/\s/g, '').toLowerCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <Navigation />
      
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header avec photo et nom du STREAMER */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={streamer.profile?.avatar_url} />
            <AvatarFallback className="text-xl">
              {streamer.profile?.twitch_display_name?.charAt(0) || 'S'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">
              {streamer.profile?.twitch_display_name || 'Streamer'}
            </h1>
            <p className="text-muted-foreground text-lg">Subathon en cours</p>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-3 h-3 rounded-full ${streamOnline ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span className={`text-sm font-medium ${streamOnline ? 'text-red-500' : 'text-gray-500'}`}>
                {streamOnline ? 'EN DIRECT' : 'HORS LIGNE'}
              </span>
            </div>
          </div>
        </div>

        <div className={`grid gap-6 ${isFullscreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {/* Côté gauche: Stream et interactions */}
          <div className="space-y-6">
            {/* Lecteur de stream du STREAMER */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>🔴 Diffusion en direct</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="flex items-center gap-2"
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize className="w-4 h-4" />
                        Réduire
                      </>
                    ) : (
                      <>
                        <Maximize className="w-4 h-4" />
                        Plein écran
                      </>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                          Le nom d'utilisateur Twitch du streamer n'est pas configuré
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bouton de participation */}
            {!isFullscreen && (
              <Card>
                <CardHeader>
                  <CardTitle>🎮 Participer au subathon</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={(currentClicks / clicksRequired) * 100} className="w-full h-3" />
                  <p className="text-center text-sm text-muted-foreground">
                    {currentClicks} / {clicksRequired} clics pour déclencher un mini-jeu
                  </p>
                  <Button 
                    onClick={handleClick} 
                    className={`w-full py-6 text-xl font-bold ${
                      !streamOnline ? 'bg-gray-600 hover:bg-gray-600' : ''
                    }`}
                    disabled={showMinigame || !streamOnline}
                    size="lg"
                  >
                    {!streamOnline ? '🔴 Stream hors ligne' : 
                     !user ? '🔒 Connectez-vous pour jouer' :
                     '🎮 Cliquer pour jouer !'}
                  </Button>
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
                <CardContent className="space-y-3">
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
                  <div className="flex justify-between items-center">
                    <span>📺 Statut du stream:</span>
                    <span className={`font-bold ${streamOnline ? 'text-red-500' : 'text-gray-500'}`}>
                      {streamOnline ? '🔴 EN DIRECT' : '⚫ HORS LIGNE'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>👥 Streamer:</span>
                    <span className="font-bold text-purple-600">
                      {streamer.profile?.twitch_display_name || 'Non configuré'}
                    </span>
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