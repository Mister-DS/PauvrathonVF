import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // Garder si utilisé ailleurs, sinon supprimer
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Garder si utilisé ailleurs, sinon supprimer
import { Checkbox } from '@/components/ui/checkbox'; // Garder si utilisé ailleurs, sinon supprimer
import { Label } from '@/components/ui/label'; // Garder si utilisé ailleurs, sinon supprimer
import { Slider } from '@/components/ui/slider'; // Garder si utilisé ailleurs, sinon supprimer
import { UniversalTimer } from '@/components/UniversalTimer';
import { 
  Clock, 
  Trophy, 
  Users, 
  Timer, 
  Zap,
  Target,
  TrendingUp,
  Settings, // Supprimer si non utilisé
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
  const [config, setConfig] = useState<OverlayConfig>(defaultConfig);
  // isStreamerOwner n'est plus nécessaire ici car la configuration est gérée dans le StreamerPanel
  // const [isStreamerOwner, setIsStreamerOwner] = useState(false); 

  useEffect(() => {
    if (!id) return;
    
    fetchStreamerData();
    loadOverlayConfig();
    
    const interval = setInterval(() => {
      fetchStreamerData();
      setLastUpdate(new Date());
    }, 2000);
    
    // Écouter les changements de configuration de l'overlay en temps réel
    const overlayConfigChannel = supabase
      .channel(`public:overlay_configs:streamer_id=eq.${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'overlay_configs', filter: `streamer_id=eq.${id}` },
        (payload) => {
          setConfig({ ...defaultConfig, ...(payload.new as any).config });
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(overlayConfigChannel);
    };
  }, [id]);

  // checkOwnership n'est plus nécessaire ici
  // useEffect(() => {
  //   checkOwnership();
  // }, [streamer]);

  // const checkOwnership = async () => {
  //   try {
  //     const { data: { user } } = await supabase.auth.getUser();
  //     if (user && streamer && user.id === streamer.user_id) {
  //       setIsStreamerOwner(true);
  //     }
  //   } catch (error) {
  //     console.error('Error checking ownership:', error);
  //   }
  // };

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

  // saveOverlayConfig et updateConfig ne sont plus nécessaires ici
  // const saveOverlayConfig = async (newConfig: OverlayConfig) => {
  //   if (!id || !isStreamerOwner) return;
  //   try {
  //     setConfig(newConfig);
  //     const { toast } = await import('@/hooks/use-toast');
  //     toast({
  //       title: "Configuration sauvegardée",
  //       description: "Les paramètres de l'overlay ont été mis à jour.",
  //     });
  //   } catch (error) {
  //     console.error('Error saving overlay config:', error);
  //   }
  // };

  // const updateConfig = (key: keyof OverlayConfig, value: any) => {
  //   const newConfig = { ...config, [key]: value };
  //   setConfig(newConfig);
  //   saveOverlayConfig(newConfig);
  // };

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
      case 'left': return 'top-4 left-4'; // Pour les stats compactes
      case 'right': return 'top-4 right-4'; // Pour les stats compactes
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
      {/* Le panneau de configuration est supprimé d'ici */}
      {/* {isStreamerOwner && ( ... )} */}

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