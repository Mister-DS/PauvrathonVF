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
  Trophy, AlertTriangle, Clock, Settings, Gamepad2, Loader2, Zap, Hourglass, CheckCircle, Users, Eye
} from 'lucide-react';

const PauvrathonPage = () => {
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
  const [timeToAdd, setTimeToAdd] = useState(0); // Nouveau state pour le temps calculé
  const [isClicking, setIsClicking] = useState(false);
  const [clickCooldown, setClickCooldown] = useState(false);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [streamStartDelay, setStreamStartDelay] = useState(true); // Nouveau: délai initial

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
      
      // Gérer le délai initial pour les nouveaux streams
      if (data.stream_started_at) {
        const streamStartTime = new Date(data.stream_started_at).getTime();
        const now = Date.now();
        const timeSinceStart = now - streamStartTime;
        const initialDelayMs = 10000; // 10 secondes de délai
        
        if (timeSinceStart < initialDelayMs) {
          setStreamStartDelay(true);
          setTimeout(() => {
            setStreamStartDelay(false);
            toast({
              title: "Stream prêt !",
              description: "Vous pouvez maintenant participer aux clics.",
            });
          }, initialDelayMs - timeSinceStart);
        } else {
          setStreamStartDelay(false);
        }
      }
      
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

  const calculateTimeToAdd = (streamer: Streamer): number => {
    if (streamer.time_mode === 'random') {
      // Générer un temps aléatoire entre min et max
      const minTime = streamer.min_random_time || streamer.time_increment || 10;
      const maxTime = streamer.max_random_time || 60;
      return Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    } else {
      // Temps fixe
      return streamer.time_increment || 30;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const handleViewerClick = async () => {
    if (!streamer || !user || isClicking || isGameActive || clickCooldown) return;
    
    // Vérifier le cooldown local (évite le spam de clics)
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;
    const minClickInterval = 1000; // 1 seconde minimum entre les clics
    
    if (timeSinceLastClick < minClickInterval) {
      toast({
        title: "Trop rapide !",
        description: `Attendez ${Math.ceil((minClickInterval - timeSinceLastClick) / 1000)}s avant de recliquer.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsClicking(true);
    setClickCooldown(true);
    setLastClickTime(now);
    
    try {
      // Utilisation d'une transaction optimiste
      const newClickCount = (streamer.current_clicks || 0) + 1;
      
      const { data, error } = await supabase
        .from('streamers')
        .update({
          current_clicks: newClickCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', streamer.id)
        .eq('current_clicks', streamer.current_clicks) // Condition pour éviter les conflits
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Conflit détecté, rafraîchir les données
          fetchStreamer(streamer.id);
          toast({
            title: "Données mises à jour",
            description: "Les clics ont été synchronisés.",
          });
        } else {
          throw error;
        }
      } else {
        // Mise à jour locale optimiste
        setStreamer(prev => prev ? { ...prev, current_clicks: newClickCount } : null);
        
        toast({
          title: "Clic enregistré !",
          description: `Clic ${newClickCount}/${streamer.clicks_required} enregistré.`,
        });
      }

    } catch (error) {
      console.error('Error handling click:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre clic.",
        variant: "destructive",
      });
    } finally {
      setIsClicking(false);
      // Cooldown de 1 seconde pour éviter le spam
      setTimeout(() => setClickCooldown(false), 1000);
    }
  };

  const handleGameEnd = async (victory: boolean) => {
    setIsGameActive(false);
    setMinigameState({ component: null, props: {}, name: '' });

    if (victory) {
      // Calculer le temps à ajouter selon les paramètres du streamer
      const calculatedTime = calculateTimeToAdd(streamer!);
      setTimeToAdd(calculatedTime);
      
      toast({
        title: "Victoire !",
        description: `Vous avez gagné ! Validez pour ajouter ${formatTime(calculatedTime)} au Pauvrathon.`,
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
          onWin: () => handleGameEnd(true),
          onLose: () => handleGameEnd(false),
          attempts: minigameAttempts,
          maxAttempts: 12,
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
          total_time_added: (streamer.total_time_added || 0) + timeToAdd,
          updated_at: new Date().toISOString()
        })
        .eq('id', streamer.id);

      if (error) throw error;
      
      // Enregistrer la contribution dans les stats
      if (user) {
        const { error: statsError } = await supabase
          .from('subathon_stats')
          .upsert({
            streamer_id: streamer.id,
            user_id: user.id,
            profile_twitch_display_name: user.user_metadata?.twitch_display_name || 'Viewer anonyme',
            time_contributed: timeToAdd,
            clicks_contributed: 1, // Un jeu gagné = 1 "contribution de clic"
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'streamer_id,user_id',
            ignoreDuplicates: false
          });

        if (statsError) {
          console.error('Error updating stats:', statsError);
        }
      }
      
      toast({
        title: "Temps ajouté !",
        description: `${formatTime(timeToAdd)} ont été ajoutés au compteur du Pauvrathon.`,
      });
      
      setShowValidateTimeButton(false);
      setTimeToAdd(0);
      
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
            setStreamer(prev => {
              // Éviter les mises à jour inutiles si les données sont identiques
              if (prev && JSON.stringify(prev) === JSON.stringify(updatedStreamer)) {
                return prev;
              }
              return updatedStreamer;
            });

            // Déclencher le mini-jeu seulement si les conditions sont remplies
            if (updatedStreamer.current_clicks >= updatedStreamer.clicks_required && 
                !isGameActive && 
                updatedStreamer.status === 'live' && 
                !showValidateTimeButton) {
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
              <div className="flex-1 container mx-auto px-2 lg:px-4 py-4 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Section principale : Infos stream & Player */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-8 order-2 lg:order-1">
            {/* Zone avec les infos du stream */}
            <Card>
              <CardHeader className="flex flex-row items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={streamer.profile?.avatar_url || streamer.profiles?.avatar_url} />
                  <AvatarFallback>{(streamer.profile?.twitch_display_name || streamer.profiles?.twitch_display_name)?.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{streamer.profile?.twitch_display_name || streamer.profiles?.twitch_display_name}</CardTitle>
                  <p className="text-muted-foreground">{streamer.stream_title || 'Titre du stream non défini'}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center text-sm">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{streamer.viewer_count || 0} viewers</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Eye className="h-4 w-4 mr-1" />
                      <span>{streamer.total_clicks || 0} clics totaux</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Zone avec aperçu du stream en direct */}
            <Card>
              <CardHeader>
                <CardTitle>Stream en direct</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TwitchPlayer channel={streamer.profile?.twitch_username || streamer.profiles?.twitch_username} />
              </CardContent>
            </Card>
          </div>
          
          {/* Section latérale : Stats & Actions */}
          <div className="lg:col-span-1 space-y-4 lg:space-y-8 order-1 lg:order-2">
            {/* Zone avec les stats en direct */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Statistiques en direct
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Temps restant</p>
                    <UniversalTimer
                      status={streamer.status}
                      streamStartedAt={streamer.stream_started_at}
                      pauseStartedAt={streamer.pause_started_at}
                      initialDuration={streamer.initial_duration || 7200}
                      totalTimeAdded={streamer.total_time_added || 0}
                      totalElapsedTime={streamer.total_elapsed_time || 0}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Temps ajouté</p>
                    <span className="text-sm font-semibold">
                      {Math.floor((streamer.total_time_added || 0) / 60)} minutes
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Clics actuels</p>
                    <span className="text-sm font-semibold">{streamer.current_clicks || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Clics requis</p>
                    <span className="text-sm font-semibold">{streamer.clicks_required || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Temps par victoire</p>
                    <span className="text-sm font-semibold">
                      {streamer.time_mode === 'random' 
                        ? `${streamer.min_random_time || streamer.time_increment || 10}-${streamer.max_random_time || 60}s`
                        : `${streamer.time_increment || 30}s`
                      }
                    </span>
                  </div>
                </div>
                
                {isStreamerOwner && (
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate('/streamer/panel')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Panneau d'administration
                  </Button>
                )}
              </CardContent>
            </Card>
            
            {/* Zone clicable avec barre de progression */}
            {!isGameActive && !showValidateTimeButton && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="mr-2 h-5 w-5" />
                    Progression vers le mini-jeu
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="progression" className="font-semibold">
                        {streamer.current_clicks} / {streamer.clicks_required} clics
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <Progress value={progress} id="progression" className="h-4" />
                    
                    {streamer.status === 'live' && user && (
                      <>
                        {streamStartDelay ? (
                          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">
                              Stream en initialisation... Patientez quelques secondes.
                            </p>
                          </div>
                        ) : (
                          <Button 
                            className="w-full mt-4 touch-manipulation" 
                            onClick={handleViewerClick}
                            disabled={isClicking || clickCooldown}
                            size="lg"
                          >
                            <Zap className="mr-2 h-4 w-4" />
                            {isClicking ? 'Clic en cours...' : 
                             clickCooldown ? 'Cooldown...' : 
                             'Cliquer pour le streamer'}
                          </Button>
                        )}
                      </>
                    )}
                    
                    {!user && (
                      <div className="mt-4 p-3 bg-muted rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                          Connectez-vous pour participer au Pauvrathon !
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Zone de victoire après le jeu */}
            {showValidateTimeButton && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-green-600">
                    <Trophy className="mr-2 h-5 w-5" />
                    Victoire !
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center justify-center p-4 text-center bg-green-500/10 border-2 border-green-500 rounded-lg">
                    <div className="mb-4">
                      <p className="text-sm mb-2">
                        Vous avez réussi le mini-jeu !
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        +{formatTime(timeToAdd)} à ajouter
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {streamer.time_mode === 'random' ? 'Temps généré aléatoirement' : 'Temps fixe configuré'}
                      </p>
                    </div>
                    <Button onClick={handleValidateTime} className="w-full">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Valider le temps
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informations sur les chances */}
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
                      Chances restantes :
                    </p>
                    <span className="text-sm font-semibold">{minigameChances} sur 3</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Essais actuels :
                    </p>
                    <span className="text-sm font-semibold">{minigameAttempts} sur 12</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
                  Règles du Pauvrathon
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Chaque clic fait avancer la barre de progression</p>
                <p>• À 100%, un mini-jeu se déclenche</p>
                <p>• Réussir le jeu ajoute du temps au compteur (selon config)</p>
                <p>• Vous avez 12 essais par chance et 3 chances maximum</p>
                <p>• Si vous échouez, la barre se réinitialise</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal pour le jeu */}
      <Dialog open={isGameActive} onOpenChange={setIsGameActive}>
        <DialogContent className="max-w-[95vw] lg:max-w-4xl max-h-[85vh] lg:max-h-[80vh] overflow-y-auto p-2 lg:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center text-sm lg:text-base">
              <Gamepad2 className="mr-2 h-4 w-4 lg:h-5 lg:w-5" />
              Mini-jeu: {minigameState.name}
            </DialogTitle>
          </DialogHeader>
          {minigameState.component && (
            <div className="p-2 lg:p-4">
              <div className="mb-4 text-center">
                <p className="text-xs lg:text-sm text-muted-foreground">
                  Tentative {minigameAttempts + 1} sur 12 • Chance {4 - minigameChances} sur 3
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gain potentiel: {streamer.time_mode === 'random' 
                    ? `${streamer.min_random_time || streamer.time_increment || 10}-${streamer.max_random_time || 60}s`
                    : `${streamer.time_increment || 30}s`
                  }
                </p>
              </div>
              <minigameState.component {...minigameState.props} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PauvrathonPage;