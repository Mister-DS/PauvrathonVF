import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { UniversalTimer } from '@/components/UniversalTimer';
import { 
  Clock, 
  Trophy, 
  Users, 
  Timer, 
  Zap,
  Target,
  TrendingUp,
  Settings,
  Eye,
  EyeOff,
  Plus,
  Minus
} from 'lucide-react';

interface OverlayConfig {
  showTimer: boolean;
  showProgress: boolean;
  showStats: boolean;
  showTimeAdded: boolean;
  showTopPlayer: boolean;
  timerSize: number;
  timerPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  progressPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  statsPosition: 'left' | 'right';
}

const defaultConfig: OverlayConfig = {
  showTimer: true,
  showProgress: true,
  showStats: true,
  showTimeAdded: true,
  showTopPlayer: true,
  timerSize: 6,
  timerPosition: 'top-right',
  progressPosition: 'top-left',
  statsPosition: 'left'
};

export default function StreamOverlay() {
  const { id } = useParams<{ id: string }>();
  const [streamer, setStreamer] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<OverlayConfig>(defaultConfig);
  const [isStreamerOwner, setIsStreamerOwner] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    fetchStreamerData();
    loadOverlayConfig();
    
    // Mise à jour toutes les 2 secondes pour un affichage fluide
    const interval = setInterval(() => {
      fetchStreamerData();
      setLastUpdate(new Date());
    }, 2000);
    
    return () => clearInterval(interval);
  }, [id]);

  // Vérifier si l'utilisateur est le propriétaire du stream
  useEffect(() => {
    checkOwnership();
  }, [streamer]);

  const checkOwnership = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && streamer && user.id === streamer.user_id) {
        setIsStreamerOwner(true);
      }
    } catch (error) {
      console.error('Error checking ownership:', error);
    }
  };

  const fetchStreamerData = async () => {
    if (!id) return;

    try {
      const { data: streamerData, error: streamerError } = await supabase
        .from('streamers')
        .select('*, total_elapsed_time')
        .eq('id', id)
        .single();

      if (streamerError) throw streamerError;
      
      if (streamerData) {
        setStreamer(streamerData);
        
        // Récupérer les stats
        const { data: statsData } = await supabase
          .from('subathon_stats')
          .select('*')
          .eq('streamer_id', id)
          .order('time_contributed', { ascending: false })
          .limit(5);
        
        setStats(statsData || []);
      }
    } catch (error) {
      console.error('Error fetching overlay data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOverlayConfig = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('overlay_configs')
        .select('*')
        .eq('streamer_id', id)
        .single();

      if (data && !error) {
        setConfig({ ...defaultConfig, ...data.config });
      }
    } catch (error) {
      console.log('No overlay config found, using defaults');
    }
  };

  const saveOverlayConfig = async (newConfig: OverlayConfig) => {
    if (!id || !isStreamerOwner) return;

    try {
      // For now, just update local state until overlay_configs table is set up
      setConfig(newConfig);
      const { toast } = await import('@/hooks/use-toast');
      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres de l'overlay ont été mis à jour.",
      });
    } catch (error) {
      console.error('Error saving overlay config:', error);
    }
  };

  const updateConfig = (key: keyof OverlayConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    saveOverlayConfig(newConfig);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-xl">Chargement de l'overlay...</div>
      </div>
    );
  }

  if (!streamer) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-xl">Streamer non trouvé</div>
      </div>
    );
  }

  const totalParticipants = stats.length;
  const totalClicks = stats.reduce((sum, stat) => sum + stat.clicks_contributed, 0);
  const totalWins = stats.reduce((sum, stat) => sum + stat.games_won, 0);
  const progressPercent = (streamer.current_clicks / (streamer.clicks_required || 1)) * 100;

  // Classes de position
  const getPositionClasses = (position: string) => {
    switch (position) {
      case 'top-left': return 'top-4 left-4';
      case 'top-right': return 'top-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'bottom-right': return 'bottom-4 right-4';
      case 'left': return 'top-4 left-4';
      case 'right': return 'top-4 right-4';
      default: return 'top-4 right-4';
    }
  };

  const getTimerSizeClass = (size: number) => {
    const sizeMap = {
      4: 'text-4xl',
      5: 'text-5xl',
      6: 'text-6xl',
      7: 'text-7xl',
      8: 'text-8xl'
    };
    return sizeMap[size] || 'text-6xl';
  };

  return (
    <div className="min-h-screen bg-transparent p-4 font-sans">
      {/* Configuration Panel - Visible uniquement pour le streamer */}
      {isStreamerOwner && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <Button
            onClick={() => setShowConfig(!showConfig)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            {showConfig ? 'Masquer Config' : 'Config Overlay'}
          </Button>
          
          {showConfig && (
            <Card className="mt-2 w-96 bg-black/90 border-purple-500/50 text-white">
              <CardHeader>
                <CardTitle className="text-sm">Configuration Overlay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {/* Affichage des éléments */}
                <div className="space-y-2">
                  <Label className="text-white font-medium">Éléments à afficher :</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={config.showTimer}
                        onCheckedChange={(checked) => updateConfig('showTimer', checked)}
                      />
                      <Label>Timer Principal</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={config.showProgress}
                        onCheckedChange={(checked) => updateConfig('showProgress', checked)}
                      />
                      <Label>Progression</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={config.showStats}
                        onCheckedChange={(checked) => updateConfig('showStats', checked)}
                      />
                      <Label>Statistiques</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={config.showTimeAdded}
                        onCheckedChange={(checked) => updateConfig('showTimeAdded', checked)}
                      />
                      <Label>Temps Gagné</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={config.showTopPlayer}
                        onCheckedChange={(checked) => updateConfig('showTopPlayer', checked)}
                      />
                      <Label>Top Joueur</Label>
                    </div>
                  </div>
                </div>

                {/* Taille du timer */}
                {config.showTimer && (
                  <div className="space-y-2">
                    <Label>Taille du Timer: {config.timerSize}</Label>
                    <Slider
                      value={[config.timerSize]}
                      min={4}
                      max={8}
                      step={1}
                      onValueChange={(value) => updateConfig('timerSize', value[0])}
                    />
                  </div>
                )}

                {/* Positions */}
                <div className="space-y-2">
                  <Label>Positions :</Label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <Label>Timer :</Label>
                      <select
                        value={config.timerPosition}
                        onChange={(e) => updateConfig('timerPosition', e.target.value)}
                        className="w-full bg-gray-800 text-white p-1 rounded"
                      >
                        <option value="top-right">Haut Droite</option>
                        <option value="top-left">Haut Gauche</option>
                        <option value="bottom-right">Bas Droite</option>
                        <option value="bottom-left">Bas Gauche</option>
                      </select>
                    </div>
                    <div>
                      <Label>Progression :</Label>
                      <select
                        value={config.progressPosition}
                        onChange={(e) => updateConfig('progressPosition', e.target.value)}
                        className="w-full bg-gray-800 text-white p-1 rounded"
                      >
                        <option value="top-left">Haut Gauche</option>
                        <option value="top-right">Haut Droite</option>
                        <option value="bottom-left">Bas Gauche</option>
                        <option value="bottom-right">Bas Droite</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Timer principal */}
      {config.showTimer && (
        <div className={`fixed ${getPositionClasses(config.timerPosition)} bg-black/90 backdrop-blur-sm border-2 border-purple-500/50 rounded-xl p-6 text-white shadow-2xl`}>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Timer className="w-6 h-6 mr-2 text-purple-400" />
              <span className="text-lg font-bold text-purple-400">PAUVRATHON</span>
            </div>
            
            <div className={`${getTimerSizeClass(config.timerSize)} font-mono font-black mb-2 text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text`}>
              <UniversalTimer
                status={streamer.status}
                streamStartedAt={streamer.stream_started_at}
                pauseStartedAt={streamer.pause_started_at}
                initialDuration={streamer.initial_duration || 7200}
                totalTimeAdded={streamer.total_time_added || 0}
                totalElapsedTime={streamer.total_elapsed_time || 0}
                formatStyle="colon"
                showStatus={false}
              />
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                streamer.status === 'live' ? 'bg-green-500' : 
                streamer.status === 'paused' ? 'bg-yellow-500' : 'bg-gray-500'
              }`}></div>
              <span className="text-sm font-medium uppercase tracking-wider">
                {streamer.status === 'live' ? 'EN DIRECT' : 
                 streamer.status === 'paused' ? 'EN PAUSE' : 'HORS LIGNE'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Statistiques compactes */}
      <div className={`fixed ${getPositionClasses(config.statsPosition === 'left' ? 'top-left' : 'top-right')} space-y-3`}>
        {/* Progression des clics */}
        {config.showProgress && (
          <div className="bg-black/90 backdrop-blur-sm border border-orange-500/50 rounded-lg p-4 text-white min-w-[280px]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Target className="w-4 h-4 mr-2 text-orange-400" />
                <span className="text-sm font-medium">Progression</span>
              </div>
              <span className="text-sm font-mono">
                {streamer.current_clicks}/{streamer.clicks_required}
              </span>
            </div>
            <Progress 
              value={progressPercent} 
              className="h-2 bg-gray-700"
            />
            <div className="text-xs text-gray-400 mt-1 text-center">
              {Math.round(progressPercent)}% - {(streamer.clicks_required || 0) - (streamer.current_clicks || 0)} clics restants
            </div>
          </div>
        )}

        {/* Stats rapides */}
        {config.showStats && (
          <div className="bg-black/90 backdrop-blur-sm border border-cyan-500/50 rounded-lg p-4 text-white">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center mb-1">
                  <Users className="w-4 h-4 mr-1 text-cyan-400" />
                </div>
                <div className="text-xl font-bold">{totalParticipants}</div>
                <div className="text-xs text-gray-400">Participants</div>
              </div>
              <div>
                <div className="flex items-center justify-center mb-1">
                  <Trophy className="w-4 h-4 mr-1 text-yellow-400" />
                </div>
                <div className="text-xl font-bold">{totalWins}</div>
                <div className="text-xs text-gray-400">Victoires</div>
              </div>
            </div>
          </div>
        )}

        {/* Temps ajouté total */}
        {config.showTimeAdded && (
          <div className="bg-black/90 backdrop-blur-sm border border-green-500/50 rounded-lg p-4 text-white text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
              <span className="text-sm font-medium">Temps Gagné</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              +{Math.floor((streamer.total_time_added || 0) / 3600)}h {Math.floor(((streamer.total_time_added || 0) % 3600) / 60)}m
            </div>
            <div className="text-xs text-gray-400">
              {streamer.total_time_added || 0} secondes
            </div>
          </div>
        )}

        {/* Top contributeur actuel */}
        {config.showTopPlayer && stats.length > 0 && (
          <div className="bg-black/90 backdrop-blur-sm border border-pink-500/50 rounded-lg p-4 text-white">
            <div className="flex items-center justify-center mb-2">
              <Zap className="w-4 h-4 mr-2 text-pink-400" />
              <span className="text-sm font-medium">Top Joueur</span>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-pink-400">
                {stats[0]?.player_twitch_username || 'Anonyme'}
              </div>
              <div className="text-xs text-gray-400">
                {stats[0]?.games_won || 0} victoires • {stats[0]?.time_contributed || 0}s ajoutés
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Widget temps minimal - Coin bas droite (optionnel) */}
      {config.showTimer && config.timerPosition !== 'bottom-right' && (
        <div className="fixed bottom-4 right-4 bg-black/95 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 text-white">
          <div className="text-center">
            <div className="text-xs text-purple-400 mb-1">TEMPS RESTANT</div>
            <div className="text-2xl font-mono font-bold text-white">
              <UniversalTimer
                status={streamer.status}
                streamStartedAt={streamer.stream_started_at}
                pauseStartedAt={streamer.pause_started_at}
                initialDuration={streamer.initial_duration || 7200}
                totalTimeAdded={streamer.total_time_added || 0}
                totalElapsedTime={streamer.total_elapsed_time || 0}
                formatStyle="colon"
                showStatus={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Indicateur de mise à jour */}
      <div className="fixed bottom-4 left-4 text-xs text-gray-500">
        Dernière MAJ: {lastUpdate.toLocaleTimeString()}
      </div>

      {/* CSS pour les animations */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(147, 51, 234, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(147, 51, 234, 0.8);
          }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        @keyframes number-change {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); color: #10f510; }
          100% { transform: scale(1); }
        }
        
        .number-animate {
          animation: number-change 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}