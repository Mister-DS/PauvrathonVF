import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { UniversalTimer } from '@/components/UniversalTimer';
import { 
  Clock, 
  Trophy, 
  Users, 
  Timer, 
  Zap,
  Target,
  TrendingUp,
  Star,
  Crown,
  Activity
} from 'lucide-react';

interface StreamerData {
  id: string;
  status: 'offline' | 'live' | 'paused' | 'ended';
  stream_started_at: string | null;
  pause_started_at: string | null;
  initial_duration: number;
  total_time_added: number;
  total_elapsed_time: number;
  current_clicks: number;
  clicks_required: number;
  total_clicks: number;
  active_minigames: string[];
}

interface PlayerStat {
  id: string;
  profile_twitch_display_name: string;
  time_contributed: number;
  clicks_contributed: number;
  games_won: number;
  games_played: number;
}

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
  const [streamer, setStreamer] = useState<StreamerData | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [config, setConfig] = useState<OverlayConfig>(defaultConfig);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Fonction pour récupérer les données du streamer
  const fetchStreamerData = async () => {
    if (!id) return;

    try {
      const { data: streamerData, error: streamerError } = await supabase
        .from('streamers')
        .select('*')
        .eq('id', id)
        .single();

      if (streamerError) {
        console.error('Erreur streamer:', streamerError);
        setConnectionStatus('disconnected');
        return;
      }
      
      if (streamerData) {
        setStreamer(streamerData);
        setConnectionStatus('connected');
        await fetchPlayerStats();
      }
    } catch (error) {
      console.error('Error fetching overlay data:', error);
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour récupérer les statistiques des joueurs avec les noms
  const fetchPlayerStats = async () => {
    if (!id) return;

    try {
      // Récupération des stats
      const { data: statsData, error: statsError } = await supabase
        .from('subathon_stats')
        .select('*')
        .eq('streamer_id', id)
        .order('time_contributed', { ascending: false })
        .limit(10);

      if (statsError) {
        console.error('Erreur stats:', statsError);
        return;
      }

      if (!statsData || statsData.length === 0) {
        setStats([]);
        return;
      }

      // Récupération des profils correspondants
      const profileIds = [...new Set(statsData.map(stat => stat.profile_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, twitch_display_name')
        .in('id', profileIds);

      if (profilesError) {
        console.warn('Erreur profils:', profilesError);
      }

      // Mapping des noms
      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = profile.twitch_display_name;
        return acc;
      }, {} as Record<string, string>);

      // Construction des stats finales
      const mappedStats = statsData.map(stat => ({
        ...stat,
        profile_twitch_display_name: profilesMap[stat.profile_id] || `Joueur ${stat.profile_id.slice(0, 8)}`
      })) as PlayerStat[];
      
      setStats(mappedStats);
    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error);
    }
  };

  // Fonction pour charger la configuration
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
      } else {
        setConfig(defaultConfig);
      }
    } catch (error) {
      console.log('Configuration par défaut utilisée');
      setConfig(defaultConfig);
    }
  };

  // Setup initial et abonnements temps réel
  useEffect(() => {
    if (!id) return;
    
    // Chargement initial
    loadOverlayConfig();
    fetchStreamerData();
    
    // Mise à jour périodique
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      fetchStreamerData();
    }, 2000);
    
    // Écoute des changements temps réel
    const streamerChannel = supabase
      .channel(`public:streamers:id=eq.${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'streamers', filter: `id=eq.${id}` },
        (payload) => {
          console.log('Mise à jour streamer:', payload.new);
          setStreamer(payload.new as StreamerData);
          setConnectionStatus('connected');
        }
      )
      .subscribe();

    const statsChannel = supabase
      .channel(`public:subathon_stats:streamer_id=eq.${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subathon_stats', filter: `streamer_id=eq.${id}` },
        () => {
          console.log('Mise à jour stats');
          fetchPlayerStats();
        }
      )
      .subscribe();
    
    const overlayConfigChannel = supabase
      .channel(`public:overlay_configs:streamer_id=eq.${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'overlay_configs', filter: `streamer_id=eq.${id}` },
        (payload) => {
          console.log('Mise à jour config overlay:', payload.new);
          setConfig({ ...defaultConfig, ...(payload.new as any).config });
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(streamerChannel);
      supabase.removeChannel(statsChannel);
      supabase.removeChannel(overlayConfigChannel);
    };
  }, [id]);

  // Classes utilitaires
  const getPositionClasses = (position: string) => {
    const positions = {
      'top-left': 'top-6 left-6',
      'top-right': 'top-6 right-6',
      'bottom-left': 'bottom-6 left-6',
      'bottom-right': 'bottom-6 right-6',
      'left': 'top-6 left-6',
      'right': 'top-6 right-6'
    };
    return positions[position as keyof typeof positions] || positions['top-right'];
  };

  const getTimerSizeClass = (size: number) => {
    const sizeMap: Record<number, string> = {
      4: 'text-4xl',
      5: 'text-5xl', 
      6: 'text-6xl',
      7: 'text-7xl',
      8: 'text-8xl'
    };
    return sizeMap[size] || 'text-6xl';
  };

  // États de chargement et d'erreur
  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="bg-black/95 backdrop-blur-md rounded-2xl p-8 text-white border border-purple-500/30">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
            <span className="text-lg font-medium">Chargement de l'overlay...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!streamer) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="bg-black/95 backdrop-blur-md rounded-2xl p-8 text-white border border-red-500/30">
          <div className="text-center">
            <div className="text-red-400 text-xl mb-2">⚠️ Erreur</div>
            <div className="text-lg">Pauvrathon non trouvé</div>
            <div className="text-sm text-gray-400 mt-2">ID: {id}</div>
          </div>
        </div>
      </div>
    );
  }

  // Calculs pour l'affichage
  const totalParticipants = stats.length;
  const totalWins = stats.reduce((sum, stat) => sum + (stat.games_won || 0), 0);
  const progressPercent = Math.min(100, (streamer.current_clicks / Math.max(1, streamer.clicks_required)) * 100);
  const topPlayer = stats[0];

  return (
    <div className="min-h-screen bg-transparent p-4 font-sans overflow-hidden">
      {/* Timer principal */}
      {config.showTimer && (
        <div className={`fixed ${getPositionClasses(config.timerPosition)} z-50`}>
          <div className="bg-black/95 backdrop-blur-md border-2 border-purple-500/50 rounded-2xl p-8 text-white shadow-2xl animate-pulse-glow">
            <div className="text-center">
              <div className="flex items-center justify-center mb-3">
                <Timer className="w-8 h-8 mr-3 text-purple-400" />
                <span className="text-2xl font-bold text-purple-400 tracking-wider">PAUVRATHON</span>
              </div>
              
              <div className={`${getTimerSizeClass(config.timerSize)} font-mono font-black mb-4 text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text drop-shadow-lg`}>
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
              
              <div className="flex items-center justify-center space-x-3">
                <div className={`w-4 h-4 rounded-full animate-pulse shadow-lg ${
                  streamer.status === 'live' ? 'bg-green-500 shadow-green-500/50' : 
                  streamer.status === 'paused' ? 'bg-yellow-500 shadow-yellow-500/50' : 'bg-gray-500'
                }`}></div>
                <Badge variant={streamer.status === 'live' ? 'default' : 'secondary'} className="text-sm font-bold tracking-wider px-4 py-1">
                  {streamer.status === 'live' ? 'EN DIRECT' : 
                   streamer.status === 'paused' ? 'EN PAUSE' : 'HORS LIGNE'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panneau de statistiques */}
      <div className={`fixed ${getPositionClasses(config.statsPosition === 'left' ? 'left' : 'right')} space-y-4 z-40 max-w-sm`}>
        
        {/* Progression des clics */}
        {config.showProgress && (
          <div className="bg-black/95 backdrop-blur-md border-2 border-orange-500/50 rounded-xl p-5 text-white shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Target className="w-5 h-5 mr-2 text-orange-400" />
                <span className="font-bold text-lg">Progression</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-orange-400">
                  {streamer.current_clicks}
                </div>
                <div className="text-xs text-gray-400">
                  / {streamer.clicks_required}
                </div>
              </div>
            </div>
            <Progress 
              value={progressPercent} 
              className="h-3 bg-gray-700 shadow-inner"
            />
            <div className="flex justify-between text-sm mt-2">
              <span className="text-orange-400 font-bold">{Math.round(progressPercent)}%</span>
              <span className="text-gray-300">
                {Math.max(0, streamer.clicks_required - streamer.current_clicks)} restants
              </span>
            </div>
          </div>
        )}

        {/* Statistiques rapides */}
        {config.showStats && (
          <div className="bg-black/95 backdrop-blur-md border-2 border-cyan-500/50 rounded-xl p-5 text-white shadow-xl">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center mb-2">
                <Activity className="w-5 h-5 mr-2 text-cyan-400" />
                <span className="font-bold text-lg">Statistiques Live</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="text-3xl font-bold text-cyan-400 font-mono">{totalParticipants}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Participants</div>
              </div>
              
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="text-3xl font-bold text-yellow-400 font-mono">{totalWins}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Victoires</div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-center">
              <div className="text-sm text-gray-400 mb-1">Total des clics</div>
              <div className="text-2xl font-bold text-purple-400 font-mono">
                {streamer.total_clicks || 0}
              </div>
            </div>
          </div>
        )}

        {/* Temps ajouté total */}
        {config.showTimeAdded && (
          <div className="bg-black/95 backdrop-blur-md border-2 border-green-500/50 rounded-xl p-5 text-white shadow-xl text-center">
            <div className="flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 mr-2 text-green-400" />
              <span className="font-bold text-lg">Temps Gagné</span>
            </div>
            <div className="text-4xl font-bold text-green-400 font-mono mb-2">
              +{Math.floor((streamer.total_time_added || 0) / 3600)}h {Math.floor(((streamer.total_time_added || 0) % 3600) / 60)}m
            </div>
            <div className="text-sm text-gray-400">
              {streamer.total_time_added || 0} secondes au total
            </div>
          </div>
        )}

        {/* Top contributeur actuel */}
        {config.showTopPlayer && topPlayer && (
          <div className="bg-black/95 backdrop-blur-md border-2 border-pink-500/50 rounded-xl p-5 text-white shadow-xl">
            <div className="flex items-center justify-center mb-3">
              <Crown className="w-6 h-6 mr-2 text-yellow-400" />
              <span className="font-bold text-lg">Top Joueur</span>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-400 mb-2 truncate">
                {topPlayer.profile_twitch_display_name}
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <div className="flex items-center justify-center mb-1">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="font-bold text-lg">{topPlayer.games_won || 0}</div>
                  <div className="text-xs text-gray-400">Victoires</div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <div className="flex items-center justify-center mb-1">
                    <Clock className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="font-bold text-lg">
                    {Math.floor((topPlayer.time_contributed || 0) / 60)}m
                  </div>
                  <div className="text-xs text-gray-400">Contribués</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Indicateur de connexion */}
      <div className="fixed bottom-4 left-4 z-30">
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-xs font-medium transition-all duration-300 ${
          connectionStatus === 'connected' ? 'bg-green-900/70 text-green-300 border border-green-500/30' :
          connectionStatus === 'connecting' ? 'bg-yellow-900/70 text-yellow-300 border border-yellow-500/30' :
          'bg-red-900/70 text-red-300 border border-red-500/30'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            connectionStatus === 'connected' ? 'bg-green-400' :
            connectionStatus === 'connecting' ? 'bg-yellow-400' :
            'bg-red-400'
          }`}></div>
          <span className="uppercase tracking-wide">
            {connectionStatus === 'connected' ? 'Live' :
             connectionStatus === 'connecting' ? 'Connexion...' :
             'Déconnecté'}
          </span>
        </div>
        
        <div className="text-xs text-gray-500 mt-1 px-3">
          MAJ: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* Styles CSS pour les animations */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
          }
          50% {
            box-shadow: 0 0 40px rgba(168, 85, 247, 0.8);
          }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideInFromLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .slide-in-right {
          animation: slideInFromRight 0.5s ease-out;
        }
        
        .slide-in-left {
          animation: slideInFromLeft 0.5s ease-out;
        }
        
        /* Amélioration de la lisibilité */
        .backdrop-blur-md {
          backdrop-filter: blur(12px);
        }
        
        /* Amélioration des barres de progression */
        .progress-bar {
          background: linear-gradient(90deg, #f59e0b 0%, #ef4444 100%);
        }
      `}</style>
    </div>
  );
}