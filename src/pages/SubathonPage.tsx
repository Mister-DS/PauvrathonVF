import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Navigation } from '@/components/Navigation';
import { FollowButton } from '@/components/FollowButton';
import { GuessNumber } from '@/components/minigames/GuessNumber';
import { Hangman } from '@/components/minigames/Hangman';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Streamer, GameSession } from '@/types';
import { 
  Clock, 
  Users, 
  Trophy, 
  Gamepad2, 
  MousePointer,
  Star,
  Power
} from 'lucide-react';

export default function SubathonPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [loading, setLoading] = useState(true);
  const [clicking, setClicking] = useState(false);
  const [currentGame, setCurrentGame] = useState<GameSession | null>(null);
  const [gameAttempts, setGameAttempts] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [pendingTimeToAdd, setPendingTimeToAdd] = useState(0);

  useEffect(() => {
    if (id) {
      fetchStreamer();
    }
  }, [id]);

  const fetchStreamer = async () => {
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
      
      const streamerWithProfile = {
        ...data,
        profile: data.profiles?.[0] || null
      };
      
      setStreamer(streamerWithProfile as unknown as Streamer);
    } catch (error) {
      console.error('Error fetching streamer:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du streamer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async () => {
    if (!streamer || !user || clicking || !streamer.is_live) return;
    
    setClicking(true);
    
    try {
      const newClicks = streamer.current_clicks + 1;
      
      // Update clicks in database
      const { error } = await supabase
        .from('streamers')
        .update({ current_clicks: newClicks })
        .eq('id', streamer.id);

      if (error) throw error;

      // Update local state
      setStreamer(prev => prev ? { ...prev, current_clicks: newClicks } : null);

      // Check if mini-game should be triggered
      if (newClicks >= streamer.clicks_required) {
        await triggerMinigame();
      }

      // Update user stats
      await updateUserStats(1, 0, 0, 0);
      
    } catch (error) {
      console.error('Error handling click:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le clic.",
        variant: "destructive",
      });
    } finally {
      setClicking(false);
    }
  };

  const triggerMinigame = async () => {
    if (!streamer || !user) return;

    // Reset clicks
    await supabase
      .from('streamers')
      .update({ current_clicks: 0 })
      .eq('id', streamer.id);

    setStreamer(prev => prev ? { ...prev, current_clicks: 0 } : null);

    // Select random minigame
    const activeGames = streamer.active_minigames;
    const randomGame = activeGames[Math.floor(Math.random() * activeGames.length)];

    // Create game session
    const { data: gameSession, error } = await supabase
      .from('game_sessions')
      .insert({
        streamer_id: streamer.id,
        player_twitch_username: profile?.twitch_username,
        minigame_name: randomGame,
        status: 'active',
        attempts: 0,
        max_attempts: randomGame === 'guess_number' ? 10 : 3,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating game session:', error);
      return;
    }

    setCurrentGame(gameSession);
    setGameAttempts(0);
  };

  const handleGameWin = async () => {
    if (!currentGame || !streamer) return;

    try {
      // Update game session
      await supabase
        .from('game_sessions')
        .update({ 
          status: 'won',
          completed_at: new Date().toISOString()
        })
        .eq('id', currentGame.id);

      // Calculate time to add based on streamer's configuration
      let timeToAdd: number;
      if (streamer.time_mode === 'random') {
        timeToAdd = Math.floor(Math.random() * streamer.max_random_time) + 1;
      } else {
        timeToAdd = streamer.time_increment;
      }

      // Show validation button
      setGameWon(true);
      setPendingTimeToAdd(timeToAdd);

      toast({
        title: "🎉 Victoire !",
        description: `Cliquez sur "Valider" pour ajouter ${timeToAdd} seconde${timeToAdd > 1 ? 's' : ''} au subathon !`,
      });
      
    } catch (error) {
      console.error('Error handling game win:', error);
      setCurrentGame(null);
      setGameAttempts(0);
    }
  };

  const handleGameLose = async () => {
    if (!currentGame) return;

    const newAttempts = gameAttempts + 1;
    setGameAttempts(newAttempts);
    const maxAttempts = currentGame.minigame_name === 'guess_number' ? 10 : 3;

    if (newAttempts >= maxAttempts) {
      // Game over - need to click again to restart
      await supabase
        .from('game_sessions')
        .update({ 
          status: 'lost',
          completed_at: new Date().toISOString()
        })
        .eq('id', currentGame.id);

      await updateUserStats(0, 0, 1, 0);

      toast({
        title: "Défaite",
        description: "Vous avez épuisé vos tentatives. Cliquez à nouveau pour recommencer !",
        variant: "destructive",
      });

      setCurrentGame(null);
      setGameAttempts(0);
    } else if (newAttempts === 1) {
      // First failure - restart the game
      toast({
        title: "Essayez encore !",
        description: "Le jeu recommence automatiquement.",
      });
      
      // Reset the game but keep the session
      setGameAttempts(0);
    }
  };

  const updateUserStats = async (clicks: number, wins: number, games: number, time: number) => {
    if (!profile?.twitch_username || !streamer) return;

    try {
      const { data: existingStats } = await supabase
        .from('subathon_stats')
        .select('*')
        .eq('streamer_id', streamer.id)
        .eq('player_twitch_username', profile.twitch_username)
        .single();

      if (existingStats) {
        await supabase
          .from('subathon_stats')
          .update({
            clicks_contributed: existingStats.clicks_contributed + clicks,
            games_won: existingStats.games_won + wins,
            games_played: existingStats.games_played + games,
            time_contributed: existingStats.time_contributed + time,
            last_activity: new Date().toISOString(),
          })
          .eq('id', existingStats.id);
      } else {
        await supabase
          .from('subathon_stats')
          .insert({
            streamer_id: streamer.id,
            player_twitch_username: profile.twitch_username,
            clicks_contributed: clicks,
            games_won: wins,
            games_played: games,
            time_contributed: time,
          });
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  };

  const confirmTimeAdd = async () => {
    if (!pendingTimeToAdd) return;

    try {
      // Add time to subathon
      await addTimeToSubathon(pendingTimeToAdd);

      // Update user stats
      await updateUserStats(0, 1, 1, pendingTimeToAdd);

      toast({
        title: "✅ Temps ajouté !",
        description: `${pendingTimeToAdd} seconde${pendingTimeToAdd > 1 ? 's' : ''} ajoutée${pendingTimeToAdd > 1 ? 's' : ''} au subathon !`,
      });

      // Reset game state
      setCurrentGame(null);
      setGameAttempts(0);
      setGameWon(false);
      setPendingTimeToAdd(0);
      
    } catch (error) {
      console.error('Error confirming time add:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le temps au subathon.",
        variant: "destructive",
      });
    }
  };

  const addTimeToSubathon = async (timeToAdd: number) => {
    if (!streamer) return;

    try {
      const newTotalTime = streamer.total_time_added + timeToAdd;
      await supabase
        .from('streamers')
        .update({ total_time_added: newTotalTime })
        .eq('id', streamer.id);

      setStreamer(prev => prev ? { 
        ...prev, 
        total_time_added: newTotalTime 
      } : null);

      // Cleanup
      setCurrentGame(null);
      setGameAttempts(0);

    } catch (error) {
      console.error('Error adding time to subathon:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le temps au subathon.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!streamer) {
    return <Navigate to="/decouverte" replace />;
  }

  const progressPercentage = (streamer.current_clicks / streamer.clicks_required) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Streamer Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage 
                    src={streamer.profile?.avatar_url} 
                    alt={streamer.profile?.twitch_display_name} 
                  />
                  <AvatarFallback className="text-xl">
                    {streamer.profile?.twitch_display_name?.charAt(0) || 'S'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-2xl">
                    {streamer.profile?.twitch_display_name || 'Streamer'}
                  </CardTitle>
                  <p className="text-muted-foreground">
                    @{streamer.profile?.twitch_username}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-4">
                      <Badge variant={streamer.is_live ? 'default' : 'secondary'}>
                        {streamer.is_live ? 'En direct' : 'Hors ligne'}
                      </Badge>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>+{streamer.time_increment}s par victoire</span>
                      </div>
                    </div>
                    <FollowButton streamerId={streamer.id} showCount />
                  </div>
                </div>
                {/* Twitch Stream Embed */}
                {streamer.is_live && streamer.profile?.twitch_username && (
                  <div className="ml-4">
                    <div className="w-48 h-32 bg-gray-900 rounded-lg overflow-hidden">
                      <iframe
                        src={`https://player.twitch.tv/?channel=${streamer.profile.twitch_username}&parent=${window.location.hostname}&muted=true`}
                        height="100%"
                        width="100%"
                        allowFullScreen
                        className="border-0"
                      />
                    </div>
                    <div className="text-center mt-2">
                      <a 
                        href={`https://twitch.tv/${streamer.profile.twitch_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Voir sur Twitch
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Game Area */}
          {currentGame ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Gamepad2 className="mr-2 h-5 w-5" />
                    Mini-jeu en cours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {gameWon ? (
                    <div className="text-center space-y-4">
                      <div className="p-6 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                        <Trophy className="mx-auto h-12 w-12 text-green-600 mb-4" />
                        <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                          🎉 Victoire !
                        </h3>
                        <p className="text-green-700 dark:text-green-300 mb-4">
                          Vous pouvez ajouter {pendingTimeToAdd} seconde{pendingTimeToAdd > 1 ? 's' : ''} au subathon !
                        </p>
                        <Button 
                          onClick={confirmTimeAdd}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Valider et ajouter le temps
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {currentGame.minigame_name === 'guess_number' && (
                        <GuessNumber
                          onWin={handleGameWin}
                          onLose={handleGameLose}
                          attempts={gameAttempts}
                          maxAttempts={10}
                        />
                      )}
                      {currentGame.minigame_name === 'hangman' && (
                        <Hangman
                          onWin={handleGameWin}
                          onLose={handleGameLose}
                          attempts={gameAttempts}
                          maxAttempts={3}
                        />
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : !streamer.is_live ? (
            /* Streamer Offline */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-center text-muted-foreground">
                  <Power className="mr-2 h-5 w-5" />
                  Streamer Hors Ligne
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Power className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Stream terminé</h3>
                  <p className="text-muted-foreground">
                    {streamer.profile?.twitch_display_name} n'est plus en direct. 
                    Revenez quand le stream reprendra !
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Click Area */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <MousePointer className="mr-2 h-5 w-5" />
                    Zone de Clics
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">
                    {streamer.current_clicks} / {streamer.clicks_required}
                  </div>
                  <Progress value={progressPercentage} className="h-4 mb-4" />
                  <p className="text-muted-foreground mb-6">
                    Cliquez pour contribuer au subathon !
                  </p>
                  
                  <Button
                    size="lg"
                    onClick={handleClick}
                    disabled={!user || clicking || !streamer.is_live}
                    className="text-lg px-8 py-6 h-auto"
                  >
                    {!streamer.is_live ? 'Streamer hors ligne' :
                     clicking ? 'Contribution...' : 
                     !user ? 'Connectez-vous pour participer' :
                     'CLIQUER'}
                  </Button>
                </div>

                {progressPercentage >= 90 && (
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <Star className="mx-auto h-6 w-6 text-yellow-600 mb-2" />
                    <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                      Plus que {streamer.clicks_required - streamer.current_clicks} clics pour déclencher un mini-jeu !
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{streamer.total_time_added}</p>
                    <p className="text-xs text-muted-foreground">Secondes ajoutées</p>
                  </div>
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{streamer.active_minigames.length}</p>
                    <p className="text-xs text-muted-foreground">Mini-jeux actifs</p>
                  </div>
                  <Gamepad2 className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {Math.floor(streamer.total_time_added / 60)}:{(streamer.total_time_added % 60).toString().padStart(2, '0')}
                    </p>
                    <p className="text-xs text-muted-foreground">Temps total</p>
                  </div>
                  <Trophy className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}