// src/pages/SubathonPage.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/Auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { minigameComponents } from '@/components/minigames';
import { TwitchPlayer } from '@/components/TwitchPlayer';
import { Navigation } from '@/components/Navigation';
import { UniversalTimer } from '@/components/UniversalTimer';
import { toast } from '@/hooks/use-toast';
import { Streamer, Minigame } from '@/types';
import {
  Maximize, Minimize, Trophy, RotateCcw, AlertTriangle,
  Wifi, Play, Pause, Square, Clock, Settings, Gamepad2, Plus, Loader2, Zap
} from 'lucide-react';

const SubathonPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStreamerOwner, setIsStreamerOwner] = useState(false);
  const [isMinigameModalOpen, setIsMinigameModalOpen] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  const [minigameState, setMinigameState] = useState<{
    component: React.ComponentType<any> | null;
    props: any;
    name: string;
  }>({ component: null, props: {}, name: '' });

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

  // Fonction pour gérer les clics des viewers
  const handleViewerClick = async () => {
    if (!streamer || !user || isClicking) return;
    
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
      
      // La mise à jour de l'état se fera via l'écoute en temps réel (useEffect)
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

  const launchRandomMinigame = async () => {
    console.log('=== DEBUG MINIGAME ===');
    console.log('Streamer:', streamer);
    console.log('Active minigames:', streamer?.active_minigames);
    console.log('Minigame components available:', Object.keys(minigameComponents));
    
    if (!streamer || !streamer.active_minigames || streamer.active_minigames.length === 0) {
      console.log('❌ Pas de mini-jeux actifs configurés');
      toast({
        title: "Pas de mini-jeu",
        description: "Aucun mini-jeu actif n'est configuré pour ce streamer.",
        variant: "destructive",
      });
      return;
    }
  
    // Sélectionner un mini-jeu aléatoire parmi ceux disponibles
    const randomGameCode = streamer.active_minigames[Math.floor(Math.random() * streamer.active_minigames.length)];
    console.log('🎲 Jeu sélectionné:', randomGameCode);
    
    // Récupérer les détails du mini-jeu depuis la base de données
    const { data: minigameData, error: minigameError } = await supabase
      .from('minigames')
      .select('*')
      .eq('component_code', randomGameCode)
      .single();
      
    console.log('🎮 Données du jeu depuis la DB:', minigameData);
    console.log('❌ Erreur DB:', minigameError);
      
    if (minigameError || !minigameData) {
      console.error('❌ Erreur mini-jeu:', minigameError);
      toast({
        title: "Erreur",
        description: `Impossible de charger le mini-jeu '${randomGameCode}'. Vérifiez que ce jeu existe dans la base de données.`,
        variant: "destructive",
      });
      return;
    }

    const { component_code, description } = minigameData;

    // Charger le composant du mini-jeu
    const gameComponent = minigameComponents[component_code];
    console.log('🎯 Composant trouvé:', !!gameComponent);
    
    if (gameComponent) {
      console.log('✅ Lancement du mini-jeu:', component_code);
      setMinigameState({
        component: gameComponent,
        name: component_code, // Utiliser component_code comme nom d'affichage
        props: {
          streamerId: streamer.id,
          onGameEnd: async (victory: boolean) => {
            setIsMinigameModalOpen(false);
            setMinigameState({ component: null, props: {}, name: '' });
            
            if (victory) {
              toast({
                title: "Victoire !",
                description: "Du temps a été ajouté au compteur !",
              });
            } else {
              toast({
                title: "Défaite !",
                description: "Continuez à cliquer pour déclencher un nouveau jeu !",
                variant: "destructive",
              });
            }
            
            // Remettre les clics à zéro après avoir déclenché le jeu
            // On le fait ici pour éviter le risque de double-déclenchement
            await supabase
              .from('streamers')
              .update({ 
                current_clicks: 0,
                updated_at: new Date().toISOString()
              })
              .eq('id', streamer.id);
          },
        },
      });
      setIsMinigameModalOpen(true);
    } else {
      console.error('❌ Composant introuvable:', component_code);
      console.log('📋 Composants disponibles:', Object.keys(minigameComponents));
      toast({
        title: "Erreur",
        description: `Le composant du mini-jeu '${component_code}' est introuvable.`,
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
            if (updatedStreamer.status !== 'live' && updatedStreamer.status !== 'paused') {
              toast({
                title: "Pauvrathon terminé",
                description: "Ce streamer n'est plus en direct.",
                variant: "destructive",
              });
              navigate('/discovery', { replace: true });
              return;
            }
            setStreamer(updatedStreamer);
            
            // Auto-déclencher un mini-jeu si les clics requis sont atteints
            if (updatedStreamer.current_clicks >= updatedStreamer.clicks_required && 
                updatedStreamer.status === 'live' && 
                !minigameState.component) {
              launchRandomMinigame();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id, navigate, user, minigameState.component]);

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
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardContent className="p-4">
                <TwitchPlayer twitchUsername={streamer.profile?.twitch_username} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="mr-2 h-5 w-5" />
                  Mini-jeu actuel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {minigameState.component ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      {minigameState.name} en cours !
                    </h3>
                    <div className="minigame-container">
                      <minigameState.component {...minigameState.props} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Aucun mini-jeu en cours pour le moment.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Cliquez sur le bouton "Cliquer pour le streamer" pour contribuer !
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
                  <Clock className="mr-2 h-5 w-5" />
                  Informations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={streamer.profile?.avatar_url} alt={`${streamer.profile?.twitch_display_name}'s avatar`} />
                    <AvatarFallback>{streamer.profile?.twitch_display_name?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{streamer.profile?.twitch_display_name}</h2>
                    <p className="text-muted-foreground">
                      {streamer.stream_title || 'Titre du stream non défini'}
                    </p>
                  </div>
                </div>

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
                </div>
              </CardContent>
            </Card>
          </div>

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
                
                {streamer.status === 'live' && user && (
                  <Button 
                    className="w-full mt-4" 
                    onClick={handleViewerClick}
                    disabled={isClicking}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    {isClicking ? 'Clic en cours...' : 'Cliquer pour le streamer'}
                  </Button>
                )}
                
                {!user && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Connectez-vous pour participer au Pauvrathon !
                    </p>
                  </div>
                )}
                
                {isStreamerOwner && (
                  <Button className="w-full mt-4" variant="outline" onClick={() => navigate('/streamer/panel')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Panneau d'administration
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gamepad2 className="mr-2 h-5 w-5" />
                  Mini-jeux
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Un mini-jeu se lancera automatiquement dès que les clics requis seront atteints.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <p>Mini-jeux actifs : {streamer.active_minigames?.length || 0}</p>
                    <p>Clics requis : {streamer.clicks_required}</p>
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

      {/* Modal pour les mini-jeux */}
      <Dialog open={isMinigameModalOpen} onOpenChange={setIsMinigameModalOpen}>
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