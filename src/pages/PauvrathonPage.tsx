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
  const [countdownSeconds, setCountdownSeconds] = useState(0); // Pour afficher le countdown
  const [lastStreamerConfig, setLastStreamerConfig] = useState<string>(''); // Pour détecter les changements
  const [userClicks, setUserClicks] = useState(0); // Clics individuels de l'utilisateur
  const [isGameCooldownActive, setIsGameCooldownActive] = useState(false); // Nouveau : cooldown du mini-jeu

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
      
      // Initialiser la configuration de référence
      const initialConfig = JSON.stringify({
        time_mode: data.time_mode,
        time_increment: data.time_increment,
        min_random_time: data.min_random_time,
        max_random_time: data.max_random_time,
        clicks_required: data.clicks_required,
        active_minigames: data.active_minigames
      });
      setLastStreamerConfig(initialConfig);
      
      // Gérer le délai initial pour les nouveaux streams
      if (data.stream_started_at) {
        const streamStartTime = new Date(data.stream_started_at).getTime();
        const now = Date.now();
        const timeSinceStart = now - streamStartTime;
        const initialDelayMs = 120000; // 2 minutes de délai (au lieu de 10 secondes)
        
        if (timeSinceStart < initialDelayMs) {
          setStreamStartDelay(true);
          
          // Utilisez un `setTimeout` pour déclencher le rafraîchissement à la fin du délai
          const remainingTime = initialDelayMs - timeSinceStart;
          const reloadTimeout = setTimeout(() => {
            setStreamStartDelay(false);
            setCountdownSeconds(0);
            toast({
              title: "Stream prêt !",
              description: "Vous pouvez maintenant participer aux clics.",
            });
            window.location.reload(); // Ajout du rechargement ici
          }, remainingTime);
          
          // Mise à jour du compte à rebours toutes les secondes pour l'affichage
          const countdownInterval = setInterval(() => {
            const currentTime = Date.now();
            const remaining = Math.ceil((initialDelayMs - (currentTime - streamStartTime)) / 1000);
            if (remaining >= 0) {
              setCountdownSeconds(remaining);
            } else {
              clearInterval(countdownInterval);
            }
          }, 1000);
          
          return () => {
            clearTimeout(reloadTimeout);
            clearInterval(countdownInterval);
          };
          
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
      // Générer un temps aléatoire entre min et max avec gestion des erreurs
      const minTime = Math.max(1, streamer.min_random_time || streamer.time_increment || 10);
      const maxTime = Math.max(minTime, streamer.max_random_time || 60);
      
      console.log(`🎲 Mode aléatoire: min=${minTime}s, max=${maxTime}s`);
      
      const randomTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
      console.log(`🎲 Temps généré: ${randomTime}s`);
      
      return randomTime;
    } else {
      // Temps fixe
      const fixedTime = streamer.time_increment || 30;
      console.log(`⚡ Mode fixe: ${fixedTime}s`);
      return fixedTime;
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
    if (!streamer || !user || isClicking || isGameActive || clickCooldown || streamStartDelay || isGameCooldownActive) return;
    
    // Protection contre le dépassement INDIVIDUEL
    if (userClicks >= streamer.clicks_required) {
      toast({
        title: "Votre limite atteinte !",
        description: "Vous avez atteint votre quota de clics pour déclencher un mini-jeu.",
        variant: "destructive",
      });
      return;
    }
    
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
      // CLICS INDIVIDUELS : on incrémente seulement les clics de ce viewer
      const newUserClicks = userClicks + 1;
      setUserClicks(newUserClicks);
      
      // Aussi incrémenter le compteur global pour les statistiques générales
      const { error: globalError } = await supabase
        .from('streamers')
        .update({
          total_clicks: (streamer.total_clicks || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', streamer.id);
        
      if (globalError) {
        console.warn('Erreur mise à jour stats globales:', globalError);
      }
      
      // Vérifier si ce viewer peut déclencher un mini-jeu
      if (newUserClicks >= streamer.clicks_required) {
        console.log(`🎮 Seuil atteint pour ce viewer : ${newUserClicks}/${streamer.clicks_required}`);
        setTimeout(() => {
          if (!isGameActive && !showValidateTimeButton && !streamStartDelay && !isGameCooldownActive) {
            launchRandomMinigame();
          }
        }, 200);
      }
      
      toast({
        title: "Clic enregistré !",
        description: `Vos clics : ${newUserClicks}/${streamer.clicks_required}`,
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
      // Cooldown de 1 seconde pour éviter le spam
      setTimeout(() => {
        setClickCooldown(false);
        
        // Message de rafraîchissement si le cooldown se termine et qu'on ne peut plus cliquer
        if (!isGameActive && !showValidateTimeButton && !streamStartDelay && !isGameCooldownActive) {
          toast({
            title: "Clics disponibles",
            description: "Vous pouvez maintenant cliquer à nouveau.",
          });
        }
      }, 1000);
    }
  };

  const handleGameEnd = async (victory: boolean) => {
    setIsGameActive(false);
    setMinigameState({ component: null, props: {}, name: '' });

    const cooldownInSeconds = streamer?.cooldown_seconds || 300;

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
      // Réinitialiser les clics de l'utilisateur après une victoire
      setUserClicks(0);
      
    } else {
      setMinigameAttempts(prev => prev + 1);
      
      if (minigameAttempts + 1 < 12) {
        toast({
          title: "Défaite !",
          description: `Il vous reste ${12 - (minigameAttempts + 1)} essais sur cette chance. Relance du jeu dans ${cooldownInSeconds} secondes.`,
          variant: "destructive",
        });
        setIsGameCooldownActive(true);
        setTimeout(() => {
          setIsGameCooldownActive(false);
          launchRandomMinigame();
        }, cooldownInSeconds * 1000);
      } else {
        setMinigameChances(prev => {
          const newChances = prev - 1;
          console.log(`❌ Chance perdue ! Nouvelles chances restantes: ${newChances}`);
          return newChances;
        });
        
        if (minigameChances - 1 > 0) {
          setMinigameAttempts(0);
          toast({
            title: "Chance perdue !",
            description: `Vous avez épuisé vos 12 essais. Il vous reste ${minigameChances - 1} chance(s). Nouvelle chance dans ${cooldownInSeconds} secondes.`,
            variant: "destructive",
          });
          setIsGameCooldownActive(true);
          setTimeout(() => {
            setIsGameCooldownActive(false);
            launchRandomMinigame();
          }, cooldownInSeconds * 1000);
        } else {
          toast({
            title: "Toutes les chances épuisées !",
            description: "Vos clics ont été remis à zéro. Recommencez à cliquer pour déclencher un nouveau mini-jeu.",
            variant: "destructive",
          });
          // Réinitialisation complète
          setMinigameAttempts(0);
          setMinigameChances(3);
          setUserClicks(0); // Remise à zéro des clics utilisateur
          
          // Enregistrer la tentative dans les stats même en cas d'échec complet
          if (user) {
            const { data: existingStats } = await supabase
              .from('subathon_stats')
              .select('*')
              .eq('streamer_id', streamer.id)
              .eq('player_twitch_username', user.user_metadata?.twitch_username || user.email)
              .single();

            if (existingStats) {
              await supabase
                .from('subathon_stats')
                .update({
                  games_played: (existingStats.games_played || 0) + 1,
                  clicks_contributed: (existingStats.clicks_contributed || 0) + userClicks,
                  last_activity: new Date().toISOString()
                })
                .eq('id', existingStats.id);
            } else {
              await supabase
                .from('subathon_stats')
                .insert({
                  streamer_id: streamer.id,
                  player_twitch_username: user.user_metadata?.twitch_username || user.email || 'Viewer anonyme',
                  time_contributed: 0,
                  games_won: 0,
                  games_played: 1,
                  clicks_contributed: userClicks,
                  last_activity: new Date().toISOString()
                });
            }
          }
        }
      }
    }
  };

  const launchRandomMinigame = async () => {
    if (!streamer || isGameActive || isGameCooldownActive) return;
    
    setIsGameActive(true);
    
    // Plus besoin de remettre à zéro current_clicks car les clics sont individuels
    console.log(`🎮 Lancement du mini-jeu pour ce viewer après ${userClicks} clics`);
    
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
      
      // Enregistrer ou mettre à jour les statistiques utilisateur dans subathon_stats
      if (user) {
        const { data: existingStats, error: fetchError } = await supabase
          .from('subathon_stats')
          .select('*')
          .eq('streamer_id', streamer.id)
          .eq('player_twitch_username', user.user_metadata?.twitch_username || user.email)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error fetching existing stats:', fetchError);
        }

        if (existingStats) {
          // Mettre à jour les stats existantes
          const { error: updateError } = await supabase
            .from('subathon_stats')
            .update({
              time_contributed: (existingStats.time_contributed || 0) + timeToAdd,
              games_won: (existingStats.games_won || 0) + 1,
              games_played: (existingStats.games_played || 0) + 1,
              clicks_contributed: (existingStats.clicks_contributed || 0) + userClicks,
              last_activity: new Date().toISOString()
            })
            .eq('id', existingStats.id);

          if (updateError) {
            console.error('Error updating stats:', updateError);
          }
        } else {
          // Créer de nouvelles stats
          const { error: insertError } = await supabase
            .from('subathon_stats')
            .insert({
              streamer_id: streamer.id,
              player_twitch_username: user.user_metadata?.twitch_username || user.email || 'Viewer anonyme',
              time_contributed: timeToAdd,
              games_won: 1,
              games_played: 1,
              clicks_contributed: userClicks,
              last_activity: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error inserting stats:', insertError);
          }
        }
      }
      
      toast({
        title: "Temps ajouté !",
        description: `${formatTime(timeToAdd)} ont été ajoutés au compteur du Pauvrathon.`,
      });
      
      setShowValidateTimeButton(false);
      setTimeToAdd(0);
      
      // Active le cooldown APRÈS la validation du temps
      const cooldownInSeconds = streamer?.cooldown_seconds || 300;
      setIsGameCooldownActive(true);
      setTimeout(() => {
        setIsGameCooldownActive(false);
      }, cooldownInSeconds * 1000);
      
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
      const cleanup = fetchStreamer(id);
      
      const channel = supabase
        .channel(`public:streamers:id=eq.${id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'streamers', filter: `id=eq.${id}` },
          (payload) => {
            const updatedStreamer = payload.new as Streamer;
            
            // Détecter les changements de configuration
            const newConfig = JSON.stringify({
              time_mode: updatedStreamer.time_mode,
              time_increment: updatedStreamer.time_increment,
              min_random_time: updatedStreamer.min_random_time,
              max_random_time: updatedStreamer.max_random_time,
              clicks_required: updatedStreamer.clicks_required,
              active_minigames: updatedStreamer.active_minigames
            });
            
            if (lastStreamerConfig && lastStreamerConfig !== newConfig) {
              toast({
                title: "Configuration mise à jour",
                description: "Les paramètres du stream ont été modifiés. Rafraîchissez la page pour les appliquer.",
                variant: "default",
              });
            }
            
            setLastStreamerConfig(newConfig);
            
            // Mise à jour CONSERVATIVE du streamer - préserver les données existantes
            setStreamer(prev => {
              if (!prev) return updatedStreamer;
              
              // Conserver les informations importantes si elles ne sont pas dans l'update
              const mergedStreamer = {
                ...prev,
                ...updatedStreamer,
                // S'assurer que les profils ne disparaissent pas
                profile: updatedStreamer.profile || prev.profile,
                profiles: updatedStreamer.profiles || prev.profiles,
              };
              
              return mergedStreamer;
            });

            // Déclencher le mini-jeu IMMÉDIATEMENT si les conditions sont remplies pour CE VIEWER
            // Plus besoin de surveiller current_clicks car c'est individuel maintenant
            // Le déclenchement se fait dans handleViewerClick quand userClicks atteint la limite
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        if (cleanup) cleanup();
      };
    }
  }, [id, navigate, user, isGameActive, showValidateTimeButton, streamStartDelay]);

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
                      <span>{streamer.total_clicks || 0} clics communauté</span>
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
                    <p className="text-sm text-muted-foreground">Vos clics actuels</p>
                    <span className="text-sm font-semibold">{userClicks}</span>
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
                        Vos clics : {userClicks} / {streamer.clicks_required}
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {Math.round((userClicks / Math.max(1, streamer.clicks_required)) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={(userClicks / Math.max(1, streamer.clicks_required)) * 100} 
                      id="progression" 
                      className="h-4" 
                    />
                    
                    {streamer.status === 'live' && user && (
                      <>
                        {streamStartDelay ? (
                          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
                            <Clock className="mx-auto h-8 w-8 text-yellow-600 mb-2" />
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                              Stream en initialisation...
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {countdownSeconds > 0 
                                ? `Clics disponibles dans ${countdownSeconds} secondes`
                                : "Temps écoulé ! Rafraîchissez la page si les clics ne fonctionnent pas."
                              }
                            </p>
                            <div className="mt-2 w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-2">
                              <div 
                                className="bg-yellow-600 h-2 rounded-full transition-all duration-1000"
                                style={{ width: `${((120 - countdownSeconds) / 120) * 100}%` }}
                              />
                            </div>
                          </div>
                        ) : isGameCooldownActive ? (
                          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                            <Clock className="mx-auto h-8 w-8 text-red-600 mb-2" />
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                              Mini-jeu en cooldown
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Relance du jeu possible dans {streamer.cooldown_seconds} secondes.
                            </p>
                          </div>
                        ) : (
                          <Button 
                            className="w-full mt-4 touch-manipulation" 
                            onClick={handleViewerClick}
                            disabled={isClicking || clickCooldown || streamStartDelay || isGameCooldownActive}
                            size="lg"
                          >
                            <Zap className="mr-2 h-4 w-4" />
                            {isClicking ? 'Clic en cours...' : 
                             clickCooldown ? 'Cooldown... (1s)' : 
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

            {/* Statistiques globales de la communauté */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Statistiques Communauté
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Clics totaux communauté :
                    </p>
                    <span className="text-sm font-semibold">{streamer.total_clicks || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Temps total ajouté :
                    </p>
                    <span className="text-sm font-semibold">
                      {Math.floor((streamer.total_time_added || 0) / 60)}m {(streamer.total_time_added || 0) % 60}s
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Viewers actifs :
                    </p>
                    <span className="text-sm font-semibold">{streamer.viewer_count || 0}</span>
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
                <p>• Chaque viewer a ses propres clics individuels</p>
                <p>• Atteignez le quota requis pour déclencher votre mini-jeu</p>
                <p>• Réussir le jeu ajoute du temps au timer global (pour tous)</p>
                <p>• Vous avez 12 essais par chance et 3 chances maximum</p>
                <p>• Vos clics se remettent à zéro après chaque jeu (victoire ou échec)</p>
                <p>• Tous les viewers contribuent au temps total du Pauvrathon</p>
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
                <p className="text-sm text-muted-foreground">
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