import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Navigation } from '@/components/Navigation';
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
  Timer,
  Star
} from 'lucide-react';

export default function SubathonPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [loading, setLoading] = useState(true);
  const [clicking, setClicking] = useState(false);
  const [currentGame, setCurrentGame] = useState<GameSession | null>(null);
  const [gameAttempts, setGameAttempts] = useState(0);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);

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
    if (!streamer || !user || clicking || cooldownActive) return;
    
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
        max_attempts: 3,
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

      // Add time increment
      const newTotalTime = streamer.total_time_added + streamer.time_increment;
      await supabase
        .from('streamers')
        .update({ total_time_added: newTotalTime })
        .eq('id', streamer.id);

      setStreamer(prev => prev ? { 
        ...prev, 
        total_time_added: newTotalTime 
      } : null);

      // Update user stats
      await updateUserStats(0, 1, 1, streamer.time_increment);

      toast({
        title: "🎉 Victoire !",
        description: `Vous avez ajouté ${streamer.time_increment} secondes au subathon !`,
      });

      // Start cooldown
      startCooldown();
      
    } catch (error) {
      console.error('Error handling game win:', error);
    } finally {
      setCurrentGame(null);
      setGameAttempts(0);
    }
  };

  const handleGameLose = async () => {
    if (!currentGame) return;

    const newAttempts = gameAttempts + 1;
    setGameAttempts(newAttempts);

    if (newAttempts >= 3) {
      // Game over
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
        description: "Vous avez épuisé vos tentatives. Les clics ont été remis à zéro.",
        variant: "destructive",
      });

      startCooldown();
      setCurrentGame(null);
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

  const startCooldown = () => {
    if (!streamer) return;
    
    setCooldownActive(true);
    setCooldownTime(streamer.cooldown_seconds);
    
    const interval = setInterval(() => {
      setCooldownTime(prev => {
        if (prev <= 1) {
          setCooldownActive(false);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge variant={streamer.is_live ? 'default' : 'secondary'}>
                      {streamer.is_live ? 'En direct' : 'Hors ligne'}
                    </Badge>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>+{streamer.time_increment}s par victoire</span>
                    </div>
                  </div>
                </div>
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
                  {currentGame.minigame_name === 'guess_number' && (
                    <GuessNumber
                      onWin={handleGameWin}
                      onLose={handleGameLose}
                      attempts={gameAttempts}
                      maxAttempts={3}
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
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Click Area */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <MousePointer className="mr-2 h-5 w-5" />
                    Zone de Clics
                  </span>
                  {cooldownActive && (
                    <Badge variant="secondary" className="flex items-center">
                      <Timer className="mr-1 h-3 w-3" />
                      Cooldown: {cooldownTime}s
                    </Badge>
                  )}
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
                    disabled={!user || clicking || cooldownActive}
                    className="text-lg px-8 py-6 h-auto"
                  >
                    {clicking ? 'Clic en cours...' : 
                     cooldownActive ? `Cooldown (${cooldownTime}s)` :
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