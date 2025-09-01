import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { minigameComponents } from '@/components/minigames';
import { TwitchPlayer } from '@/components/TwitchPlayer';
import { Navigation } from '@/components/Navigation';
import { UniversalTimer } from '@/components/UniversalTimer';
import { toast } from '@/hooks/use-toast';
import { Streamer } from '@/types';
import {
  Trophy, AlertTriangle, Clock, Settings, Gamepad2, Plus, Loader2, Zap, Hourglass, CheckCircle,
} from 'lucide-react';

const SubathonPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStreamerOwner, setIsStreamerOwner] = useState(false);
  
  // États pour le jeu
  const [isGameActive, setIsGameActive] = useState(false);
  const [minigameState, setMinigameState] = useState<{
    component: React.ComponentType<any> | null;
    props: any;
    name: string;
  }>({ component: null, props: {}, name: '' });
  const [minigameAttempts, setMinigameAttempts] = useState(0);
  const [minigameChances, setMinigameChances] = useState(3);
  const [showValidateTimeButton, setShowValidateTimeButton] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  const fetchStreamer = async (streamerId: string) => {
    try {
      const { data, error } = await supabase
        .from('streamers')
        .select(`
          *,
          profiles (
            twitch_username,
            twitch_display_name,
            avatar_url
          )
        `)
        .eq('id', streamerId)
        .single();

      if (error) throw error;

      if (!data || data.status !== 'live') {
        toast({
          title: "Pauvrathon non disponible",
          description: "Ce streamer n'est pas en direct en ce moment.",
          variant: "destructive",
        });
        navigate('/discovery', { replace: true });
        return;
      }
      
      setStreamer(data as Streamer);
      setIsStreamerOwner(user?.id === data.user_id);
    } catch (error) {
      console.error('Error fetching streamer:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du Pauvrathon.",
        variant: "destructive",
      });
      navigate('/discovery', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleViewerClick = async () => {
    if (!streamer || !user || isClicking || isGameActive) return;
    
    setIsClicking(true);
    
    try {
      const { error } = await supabase
        .from('streamers')
        .update({
          current_clicks: (streamer.current_clicks || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', streamer.id);

      if (error) throw error;

      toast({
        title: "Clic enregistré !",
        description: `Votre clic a été enregistré.`,
      });

    } catch (error) {
      console.error('Error handling click:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre clic.",
        variant: "destructive",
      });
    } finally {
      setIsClicking(false);
    }
  };

  const handleGameEnd = async (victory: boolean) => {
    setIsGameActive(false);
    setMinigameState({ component: null, props: {}, name: '' });

    if (victory) {
      toast({
        title: "Victoire !",
        description: "Vous avez gagné ! Validez le temps pour l'ajouter au Pauvrathon.",
      });
      setShowValidateTimeButton(true);
      
      // Réinitialiser les essais et chances pour la prochaine fois
      setMinigameAttempts(0);
      setMinigameChances(3);
      
    } else {
      setMinigameAttempts(prev => prev + 1);
      
      if (minigameAttempts + 1 < 12) {
        toast({
          title: "Défaite !",
          description: `Il vous reste ${12 - (minigameAttempts + 1)} essais sur cette chance. Relance du jeu dans 5 secondes.`,
          variant: "destructive",
        });
        setTimeout(launchRandomMinigame, 5000);
      } else {
        setMinigameChances(prev => prev - 1);
        if (minigameChances - 1 > 0) {
          setMinigameAttempts(0);
          toast({
            title: "Chance perdue !",
            description: `Vous avez épuisé vos 12 essais. Il vous reste ${minigameChances - 1} chance(s). Nouvelle chance dans 5 secondes.`,
            variant: "destructive",
          });
          setTimeout(launchRandomMinigame, 5000);
        } else {
          toast({
            title: "Toutes les chances épuisées !",
            description: "Retour à la page des clics. Vous devez recommencer à faire avancer la barre.",
            variant: "destructive",
          });
          // Réinitialisation complète
          setMinigameAttempts(0);
          setMinigameChances(3);
        }
      }
    }
  };

  const launchRandomMinigame = async () => {
    if (!streamer || isGameActive) return;
    
    setIsGameActive(true);
    
    // Réinitialisation des clics au moment du lancement du jeu
    const { error: resetError } = await supabase
      .from('streamers')
      .update({ 
        current_clicks: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', streamer.id);
      
    if (resetError) {
      console.error('Erreur lors de la réinitialisation des clics:', resetError);
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser le compteur de clics.",
        variant: "destructive",
      });
    }
    
    const activeGames = streamer.active_minigames;
    if (!activeGames || activeGames.length === 0) {
      toast({
        title: "Pas de mini-jeu",
        description: "Aucun mini-jeu actif n'est configuré pour ce streamer.",
        variant: "destructive",
      });
      setIsGameActive(false);
      return;
    }
  
    const randomGameCode = activeGames[Math.floor(Math.random() * activeGames.length)];
    const gameComponent = minigameComponents[randomGameCode];
    
    if (gameComponent) {
      setMinigameState({
        component: gameComponent,
        name: randomGameCode,
        props: {
          streamerId: streamer.id,
          onGameEnd: handleGameEnd,
        },
      });
    } else {
      toast({
        title: "Erreur",
        description: `Le composant du mini-jeu '${randomGameCode}' est introuvable.`,
        variant: "destructive",
      });
      setIsGameActive(false);
    }
  };

  const handleValidateTime = async () => {
    if (!streamer) return;
    
    try {
      const { error } = await supabase
        .from('streamers')
        .update({
          total_time_added: (streamer.total_time_added || 0) + 600, // Ajout de 10 minutes (600 secondes)
          updated_at: new Date().toISOString()
        })
        .eq('id', streamer.id);

      if (error) throw error;
      
      toast({
        title: "Temps ajouté !",
        description: "Le temps a été ajouté au compteur du Pauvrathon.",
      });
      
      setShowValidateTimeButton(false);
      
    } catch (error) {
      console.error('Error validating time:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le temps au Pauvrathon.",
        variant: "destructive",
      });
    }
  };
  
  useEffect(() => {
    if (id) {
      fetchStreamer(id);
      
      const channel = supabase
        .channel(`public:streamers:id=eq.${id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'streamers', filter: `id=eq.${id}` },
          (payload) => {
            const updatedStreamer = payload.new as Streamer;
            setStreamer(updatedStreamer);

            if (updatedStreamer.current_clicks >= updatedStreamer.clicks_required && !isGameActive && updatedStreamer.status === 'live' && !showValidateTimeButton) {
              launchRandomMinigame();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id, navigate, user, isGameActive, showValidateTimeButton]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!streamer) {
    return null;
  }

  const progress = streamer.clicks_required > 0
    ? Math.min(100, (streamer.current_clicks / streamer.clicks_required) * 100)
    : 0;
    
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navigation />
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Section principale : Infos stream & Player */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Avatar>
                    <AvatarImage src={streamer.profile?.avatar_url} />
                    <AvatarFallback>{streamer.profile?.twitch_display_name?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{streamer.profile?.twitch_display_name}</h2>
                    <p className="text-sm text-muted-foreground">{streamer.stream_title || 'Titre du stream non défini'}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <TwitchPlayer twitchUsername={streamer.profile?.twitch_username} />
              </CardContent>
            </Card>
          </div>
          
          {/* Section latérale : Stats & Actions */}
          <div className="lg:col-span-1 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Temps restant
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <UniversalTimer
                  status={streamer.status}
                  streamStartedAt={streamer.stream_started_at}
                  pauseStartedAt={streamer.pause_started_at}
                  initialDuration={streamer.initial_duration || 7200}
                  totalTimeAdded={streamer.total_time_added || 0}
                  totalElapsedTime={streamer.total_elapsed_time || 0}
                />
                
                {isStreamerOwner && (
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate('/streamer/panel')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Panneau d'administration
                  </Button>
                )}
              </CardContent>
            </Card>
            
            {/* Zone de progression et de jeu - Visible sur tous les écrans */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gamepad2 className="mr-2 h-5 w-5" />
                  {isGameActive ? 'Mini-jeu en cours' : (showValidateTimeButton ? 'Victoire !' : 'Progression')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isGameActive && minigameState.component ? (
                  <div className="minigame-container">
                    <p className="text-sm text-muted-foreground mb-4">
                      Tentative {minigameAttempts + 1} sur 12. Chance {3 - minigameChances + 1} sur 3.
                    </p>
                    <minigameState.component {...minigameState.props} />
                  </div>
                ) : showValidateTimeButton ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center bg-green-500/10 border-2 border-green-500 rounded-lg">
                    <Trophy className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Bravo !</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Vous avez réussi le mini-jeu. Cliquez sur le bouton ci-dessous pour ajouter du temps au compteur du Pauvrathon.
                    </p>
                    <Button onClick={handleValidateTime}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Valider le temps
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="progression" className="font-semibold">
                        Progression vers le prochain mini-jeu
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {streamer.current_clicks} / {streamer.clicks_required} clics
                      </span>
                    </div>
                    <Progress value={progress} id="progression" className="h-4" />
                    {streamer.status === 'live' && user && (
                      <Button 
                        className="w-full mt-4" 
                        onClick={handleViewerClick}
                        disabled={isClicking || isGameActive}
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        {isClicking ? 'Clic en cours...' : 'Cliquer pour le streamer'}
                      </Button>
                    )}
                    {!user && (
                      <div className="mt-4 p-3 bg-muted rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                          Connectez-vous pour participer au Pauvrathon !
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Hourglass className="mr-2 h-5 w-5" />
                  Mini-jeux & Chances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Mini-jeux actifs :
                    </p>
                    <span className="text-sm font-semibold">{streamer.active_minigames?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Clics requis :
                    </p>
                    <span className="text-sm font-semibold">{streamer.clicks_required}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Chances restantes :
                    </p>
                    <span className="text-sm font-semibold">{minigameChances} sur 3</span>
                  </div>
                  {isStreamerOwner && (
                    <Button onClick={launchRandomMinigame} className="mt-4" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Lancer un jeu aléatoire (admin)
                    </Button>
                  )}
                </div>
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
        </div>
      </div>

      {/* Modal pour le jeu */}
      <Dialog open={isGameActive} onOpenChange={setIsGameActive}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Gamepad2 className="mr-2 h-5 w-5" />
              {minigameState.name}
            </DialogTitle>
          </DialogHeader>
          {minigameState.component && (
            <div className="p-4">
              <minigameState.component {...minigameState.props} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubathonPage;