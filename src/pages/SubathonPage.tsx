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
import { toast } from '@/hooks/use-toast';
import { Streamer } from '@/types';

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
    if (!streamer || !user) return;

    try {
      // Mettre à jour le compteur de clics immédiatement
      const newClicks = currentClicks + 1;
      setCurrentClicks(newClicks);

      // Mettre à jour la base de données
      const { error } = await supabase
        .from('streamers')
        .update({ current_clicks: newClicks })
        .eq('id', streamer.id);

      if (error) throw error;

      // Vérifier si on a atteint le nombre de clics requis
      if (newClicks >= clicksRequired) {
        launchRandomMinigame();
        // Réinitialiser le compteur
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
      // Ajouter du temps au subathon
      const timeToAdd = streamer.time_increment || 30;
      const newTotalTime = (streamer.total_time_added || 0) + timeToAdd;

      const { error } = await supabase
        .from('streamers')
        .update({ total_time_added: newTotalTime })
        .eq('id', streamer.id);

      if (error) throw error;

      toast({
        title: "Félicitations !",
        description: `Vous avez ajouté ${timeToAdd} secondes au subathon !`,
      });

      setShowMinigame(false);
      
      // Rediriger vers la page du streamer après un court délai
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

    if (newFailedAttempts >= 3) {
      // Après 3 échecs, cacher le mini-jeu
      toast({
        title: "Échec",
        description: "3 échecs ! Vous devez recommencer à cliquer.",
        variant: "destructive",
      });
      setShowMinigame(false);
    } else {
      // Relancer le même jeu après 5 secondes
      setTimeout(() => {
        setShowMinigame(false);
        setTimeout(() => {
          setShowMinigame(true);
        }, 100);
      }, 5000);
    }
  };

  console.log('Nouvelle page')

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  if (!streamer) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Streamer non trouvé</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header avec photo du streamer */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16">
          <AvatarImage src={streamer.profile?.avatar_url} />
          <AvatarFallback>
            {streamer.profile?.twitch_display_name?.charAt(0) || 'S'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">
            {streamer.profile?.twitch_display_name || 'Streamer'}
          </h1>
          <p className="text-muted-foreground">Subathon en cours</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Côté gauche: Stream et interactions */}
        <div className="space-y-4">
          {/* Lecteur de stream */}
          <Card className="relative">
            <CardHeader>
              <CardTitle>Diffusion en direct</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className={`relative bg-black aspect-video rounded-lg overflow-hidden cursor-pointer ${
                  isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : ''
                }`}
                onClick={toggleFullscreen}
              >
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <div className="text-center text-white">
                    <p className="text-lg mb-2">Live de {streamer.profile?.twitch_display_name}</p>
                    <p className="text-sm text-gray-400">Cliquez pour plein écran</p>
                  </div>
                </div>
                {isFullscreen && (
                  <Button 
                    variant="secondary" 
                    className="absolute top-4 right-4 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFullscreen(false);
                    }}
                  >
                    Réduire
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bouton de clic */}
          <Card>
            <CardHeader>
              <CardTitle>Contribuer au subathon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={(currentClicks / clicksRequired) * 100} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                {currentClicks} / {clicksRequired} clics
              </p>
              <Button 
                onClick={handleClick} 
                className="w-full py-6 text-lg"
                disabled={showMinigame}
              >
                🎮 Cliquer pour jouer !
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Côté droit: Mini-jeux */}
        <div className="space-y-4">
          {showMinigame && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {currentGame === 'guessNumber' ? 'Devine le chiffre' : 'Jeu du pendu'}
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
              <CardTitle>Statistiques du subathon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Temps ajouté total:</span>
                <span className="font-bold">
                  {Math.floor((streamer.total_time_added || 0) / 60)}min {(streamer.total_time_added || 0) % 60}s
                </span>
              </div>
              <div className="flex justify-between">
                <span>Incrément de temps:</span>
                <span className="font-bold">{streamer.time_increment || 30}s</span>
              </div>
              <div className="flex justify-between">
                <span>Mode de temps:</span>
                <span className="font-bold capitalize">{streamer.time_mode || 'fixe'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SubathonPage;