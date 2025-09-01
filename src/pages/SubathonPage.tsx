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
import { UniversalTimer } from '@/components/UniversalTimer';
import { toast } from '@/hooks/use-toast';
import { Streamer, Minigame } from '@/types';
import {
  Maximize, Minimize, Trophy, RotateCcw, AlertTriangle,
  Wifi, Play, Pause, Square, Clock, Settings, Gamepad2, Plus, Loader2
} from 'lucide-react';

const SubathonPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStreamerOwner, setIsStreamerOwner] = useState(false);
  const [isMinigameModalOpen, setIsMinigameModalOpen] = useState(false);

  const [minigameState, setMinigameState] = useState<{
    component: React.ComponentType<any> | null;
    props: any;
    name: string;
  }>({ component: null, props: {}, name: '' });

  // Récupération des données du streamer
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
      
      // Nouvelle logique : redirection si le streamer n'existe pas ou n'est pas en direct
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

  // Logique pour lancer un mini-jeu
  const launchRandomMinigame = async () => {
    if (!streamer || !streamer.active_minigames || streamer.active_minigames.length === 0) {
      toast({
        title: "Pas de mini-jeu",
        description: "Aucun mini-jeu actif n'est configuré pour ce streamer.",
        variant: "destructive",
      });
      return;
    }
  
    // Logique de sélection du jeu, etc.
    const randomGameId = streamer.active_minigames[Math.floor(Math.random() * streamer.active_minigames.length)];
    
    // Récupérer le nom et le code du jeu depuis la BDD (supposé ici)
    const { data: minigameData, error: minigameError } = await supabase
        .from('minigames')
        .select('*')
        .eq('id', randomGameId)
        .single();
    if (minigameError || !minigameData) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du mini-jeu.",
        variant: "destructive",
      });
      return;
    }

    const { name, component_code } = minigameData;

    const gameComponent = minigameComponents[component_code];
    if (gameComponent) {
      setMinigameState({
        component: gameComponent,
        name: name,
        props: {
          streamerId: streamer.id,
          // Autres props nécessaires...
        },
      });
      setIsMinigameModalOpen(true);
    } else {
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
      
      // Souscription en temps réel aux changements du streamer
      const channel = supabase
        .channel(`public:streamers:id=eq.${id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'streamers', filter: `id=eq.${id}` },
          (payload) => {
            const updatedStreamer = payload.new as Streamer;
            // Si le statut passe hors ligne, rediriger
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
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id, navigate, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Affiche un message de chargement si les données sont en cours de fetch,
  // ou si la page n'est pas encore prête à s'afficher.
  if (!streamer) {
    // Si nous arrivons ici, c'est que la redirection a échoué pour une raison inconnue.
    // Il vaut mieux ne rien afficher de visible et laisser la redirection se faire.
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
          {/* Colonne de gauche: Lecteur Twitch et statistiques */}
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

          {/* Colonne de droite: Timer, Clics et Règles */}
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
                
                {streamer.status === 'live' && (
                  <Button className="w-full mt-4">
                    <Zap className="mr-2 h-4 w-4" />
                    Cliquer pour le streamer
                  </Button>
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
                  {isStreamerOwner && (
                    <Button onClick={launchRandomMinigame} className="mt-4">
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
    </div>
  );
};

export default SubathonPage;