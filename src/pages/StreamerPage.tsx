import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation } from "@/components/Navigation";
import { ResponsiveLayout, ResponsiveGrid } from "@/components/ResponsiveLayout";
import { UniversalTimer } from "@/components/UniversalTimer";
import { TwitchPlayer } from "@/components/TwitchPlayer";
import { FollowButton } from "@/components/FollowButton";
import { BadgeRenderer } from "@/components/BadgeRenderer";
import { DynamicGame } from "@/components/DynamicGame";
import { useAuth } from "@/contexts/AuthContext";
import { useStreamers } from "@/hooks/useStreamers";
import { useStreamerStatus } from "@/hooks/useStreamerStatus";
import { useCurrentTimer } from "@/hooks/useCurrentTimer";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Gamepad, 
  Timer, 
  Play,
  Pause,
  Eye,
  Clock,
  Trophy,
  Star,
  TrendingUp,
  Zap,
  ExternalLink,
  Share2,
  Heart,
  Calendar,
  MapPin
} from "lucide-react";
import { toast } from "sonner";

export default function StreamerPage() {
  const { streamerId } = useParams();
  const { user } = useAuth();
  const { streamers, loading } = useStreamers();
  const [streamer, setStreamer] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [gameStats, setGameStats] = useState({ wins: 0, attempts: 0 });
  
  const streamerStatus = useStreamerStatus(streamer?.user_id);
  const currentTimer = useCurrentTimer(streamer?.id);

  useEffect(() => {
    if (streamers && streamerId) {
      const foundStreamer = streamers.find(s => s.id === streamerId || s.profile?.twitch_username === streamerId || s.profiles?.twitch_username === streamerId);
      setStreamer(foundStreamer);
    }
  }, [streamers, streamerId]);

  const handleGameComplete = async (gameType: string, won: boolean, timeAdded: number = 0) => {
    if (!streamer || !user) return;

    try {
      // Enregistrer le résultat du jeu
      const { error } = await supabase
        .from('game_sessions')
        .insert({
          streamer_id: streamer.id,
          minigame_name: gameType,
          player_twitch_username: user.user_metadata?.user_name || user.email,
          status: won ? 'completed' : 'failed'
        });

      if (error) throw error;

      // Mettre à jour les stats locales
      setGameStats(prev => ({
        wins: won ? prev.wins + 1 : prev.wins,
        attempts: prev.attempts + 1
      }));

      if (won && timeAdded > 0) {
        toast.success(`Bravo ! +${timeAdded} secondes ajoutées au timer !`);
      } else if (won) {
        toast.success("Félicitations !");
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du résultat:', error);
      toast.error("Erreur lors de l'enregistrement du résultat");
    }
  };

  const shareStream = () => {
    if (navigator.share) {
      navigator.share({
        title: `${streamer?.display_name} sur Pauvrathon`,
        text: `Rejoins le Pauvrathon de ${streamer?.display_name} et aide à prolonger le stream !`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copié dans le presse-papier !");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white">Chargement du streamer...</p>
        </div>
      </div>
    );
  }

  if (!streamer) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Streamer introuvable</h1>
            <p className="text-gray-400 mb-6">Ce streamer n'existe pas ou n'est pas encore inscrit sur Pauvrathon.</p>
            <Link to="/decouverte">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Découvrir les streamers
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isLive = streamerStatus?.isLive || false;
  const viewerCount = 0; // Pas de viewer count dans cette structure

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <Navigation />
      
      <main className="flex-1">
        {/* Header du Streamer */}
        <section className="relative py-8 border-b border-gray-800">
          <ResponsiveLayout>
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Avatar et infos principales */}
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 lg:w-24 lg:h-24 border-4 border-purple-500/50">
                  <AvatarImage src={streamer.profile?.avatar_url || streamer.profiles?.avatar_url} alt={streamer.profile?.twitch_display_name || streamer.profiles?.twitch_display_name} />
                  <AvatarFallback className="bg-purple-600 text-white text-2xl">
                    {(streamer.profile?.twitch_display_name || streamer.profiles?.twitch_display_name || 'S').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl lg:text-4xl font-bold">{streamer.profile?.twitch_display_name || streamer.profiles?.twitch_display_name || 'Streamer'}</h1>
                    {/* Badge placeholder - à implémenter selon la structure réelle */}
                    {isLive && (
                      <Badge className="bg-red-500 animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                        EN DIRECT
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-gray-300 text-lg mb-3">@{streamer.profile?.twitch_username || streamer.profiles?.twitch_username || 'streamer'}</p>
                  
                  {streamer.stream_title && (
                    <p className="text-gray-400 max-w-2xl">{streamer.stream_title}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 lg:ml-auto">
                {user && (
                  <FollowButton 
                    streamerId={streamer.id}
                  />
                )}
                
                <Button 
                  variant="outline" 
                  onClick={shareStream}
                  className="border-gray-600 hover:bg-gray-800"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager
                </Button>

                {streamer.profile?.twitch_username || streamer.profiles?.twitch_username ? (
                  <Button 
                    variant="outline"
                    onClick={() => window.open(`https://twitch.tv/${streamer.profile?.twitch_username || streamer.profiles?.twitch_username}`, '_blank')}
                    className="border-purple-500 hover:bg-purple-900"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Voir sur Twitch
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Stats du stream */}
            {isLive && (
              <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-gray-800">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-400" />
                  <span className="text-lg font-semibold">{viewerCount}</span>
                  <span className="text-gray-400">spectateurs</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-lg font-semibold">{gameStats.attempts}</span>
                  <span className="text-gray-400">participations</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-lg font-semibold">{gameStats.wins}</span>
                  <span className="text-gray-400">victoires</span>
                </div>
              </div>
            )}
          </ResponsiveLayout>
        </section>

        {/* Contenu principal */}
        <section className="py-8">
          <ResponsiveLayout>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Colonne principale - Stream et Timer */}
              <div className="lg:col-span-2 space-y-6">
                {/* Player Twitch */}
                {isLive && (streamer.profile?.twitch_username || streamer.profiles?.twitch_username) && (
                  <Card className="bg-gray-900/50 border-gray-800">
                    <CardContent className="p-0">
                      <TwitchPlayer 
                        channel={streamer.profile?.twitch_username || streamer.profiles?.twitch_username || ''}
                        height="400"
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Timer principal */}
                <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border-purple-500/30 backdrop-blur-xl">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                      <Timer className="w-6 h-6" />
                      Timer Pauvrathon
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Chaque mini-jeu réussi ajoute du temps au compteur !
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <UniversalTimer 
                      status={streamer.status || 'offline'}
                      streamStartedAt={streamer.stream_started_at}
                      pauseStartedAt={streamer.pause_started_at}
                      initialDuration={streamer.initial_duration}
                      totalTimeAdded={streamer.total_time_added}
                      totalElapsedTime={streamer.total_elapsed_time}
                    />
                  </CardContent>
                </Card>

                {/* Mini-jeux */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gamepad className="w-5 h-5" />
                      Mini-jeux disponibles
                    </CardTitle>
                    <CardDescription>
                      Participez aux défis pour aider à prolonger le stream
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {user ? (
                      <Tabs value={activeGame || "select"} onValueChange={setActiveGame}>
                        <TabsList className="grid grid-cols-4 lg:grid-cols-8 mb-6">
                          <TabsTrigger value="select" className="text-xs">Choisir</TabsTrigger>
                          <TabsTrigger value="guess-number" className="text-xs">Nombre</TabsTrigger>
                          <TabsTrigger value="hangman" className="text-xs">Pendu</TabsTrigger>
                          <TabsTrigger value="memory" className="text-xs">Mémoire</TabsTrigger>
                          <TabsTrigger value="reaction" className="text-xs">Réflexes</TabsTrigger>
                          <TabsTrigger value="simon" className="text-xs">Simon</TabsTrigger>
                          <TabsTrigger value="snake" className="text-xs">Snake</TabsTrigger>
                          <TabsTrigger value="tictactoe" className="text-xs">TicTacToe</TabsTrigger>
                        </TabsList>

                        <TabsContent value="select" className="text-center py-8">
                          <Gamepad className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold mb-2">Choisissez un mini-jeu</h3>
                          <p className="text-gray-400">Sélectionnez un onglet ci-dessus pour commencer à jouer</p>
                        </TabsContent>

                        <TabsContent value="guess-number">
                          <div className="text-center py-8 text-gray-400">
                            Mini-jeu temporairement indisponible
                          </div>
                        </TabsContent>

                        <TabsContent value="hangman">
                          <div className="text-center py-8 text-gray-400">
                            Mini-jeu temporairement indisponible
                          </div>
                        </TabsContent>

                        <TabsContent value="memory">
                          <div className="text-center py-8 text-gray-400">
                            Mini-jeu temporairement indisponible
                          </div>
                        </TabsContent>

                        <TabsContent value="reaction">
                          <div className="text-center py-8 text-gray-400">
                            Mini-jeu temporairement indisponible
                          </div>
                        </TabsContent>

                        <TabsContent value="simon">
                          <div className="text-center py-8 text-gray-400">
                            Mini-jeu temporairement indisponible
                          </div>
                        </TabsContent>

                        <TabsContent value="snake">
                          <div className="text-center py-8 text-gray-400">
                            Mini-jeu temporairement indisponible
                          </div>
                        </TabsContent>

                        <TabsContent value="tictactoe">
                          <div className="text-center py-8 text-gray-400">
                            Mini-jeu temporairement indisponible
                          </div>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <div className="text-center py-8">
                        <Zap className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Connexion requise</h3>
                        <p className="text-gray-400 mb-4">Connectez-vous avec Twitch pour participer aux mini-jeux</p>
                        <Link to="/auth">
                          <Button className="bg-purple-600 hover:bg-purple-700">
                            Se connecter
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - Infos et chat */}
              <div className="space-y-6">
                {/* Statut du stream */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-lg">Statut</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">État</span>
                      <Badge className={isLive ? "bg-green-500" : "bg-gray-500"}>
                        {isLive ? "En direct" : "Hors ligne"}
                      </Badge>
                    </div>
                    
                    {isLive && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Spectateurs</span>
                        <span className="font-semibold">{viewerCount}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Dernière activité</span>
                      <span className="text-sm">{streamer.updated_at ? new Date(streamer.updated_at).toLocaleDateString() : "Inconnue"}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Informations du streamer */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-lg">À propos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(streamer.profile?.avatar_url || streamer.profiles?.avatar_url) && (
                      <p className="text-gray-300 text-sm leading-relaxed">
                        Streamer Pauvrathon
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">Membre depuis</span>
                        <span>{new Date(streamer.created_at).toLocaleDateString()}</span>
                      </div>
                      
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400">Streamer</span>
                          <span>Pauvrathon</span>
                        </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Liens rapides */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-lg">Liens</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(streamer.profile?.twitch_username || streamer.profiles?.twitch_username) && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => window.open(`https://twitch.tv/${streamer.profile?.twitch_username || streamer.profiles?.twitch_username}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Chaîne Twitch
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={shareStream}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Partager cette page
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </ResponsiveLayout>
        </section>
      </main>
    </div>
  );
}