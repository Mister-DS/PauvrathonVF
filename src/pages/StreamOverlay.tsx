import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Trophy, 
  Users, 
  Timer, 
  Zap,
  Target,
  TrendingUp
} from 'lucide-react';

export default function StreamOverlay() {
  const { id } = useParams<{ id: string }>();
  const [streamer, setStreamer] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (!id) return;
    
    fetchStreamerData();
    
    // Mise à jour toutes les 2 secondes pour un affichage fluide
    const interval = setInterval(() => {
      fetchStreamerData();
      setLastUpdate(new Date());
    }, 2000);
    
    return () => clearInterval(interval);
  }, [id]);

  // Timer en temps réel
  useEffect(() => {
    if (!streamer) return;
    
    const timer = setInterval(() => {
      if (streamer.status === 'live' && streamer.stream_started_at) {
        const startTime = new Date(streamer.stream_started_at).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - startTime) / 1000);
        
        const baseDuration = streamer.initial_duration || 7200;
        const totalDuration = baseDuration + (streamer.total_time_added || 0);
        const remaining = Math.max(0, totalDuration - elapsed);
        
        if (remaining > 0) {
          const hours = Math.floor(remaining / 3600);
          const minutes = Math.floor((remaining % 3600) / 60);
          const seconds = remaining % 60;
          setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setTimeRemaining("00:00:00");
        }
      } else if (streamer.status === 'paused' && streamer.pause_started_at && streamer.stream_started_at) {
        const startTime = new Date(streamer.stream_started_at).getTime();
        const pauseTime = new Date(streamer.pause_started_at).getTime();
        const elapsedWhenPaused = Math.floor((pauseTime - startTime) / 1000);
        
        const baseDuration = streamer.initial_duration || 7200;
        const totalDuration = baseDuration + (streamer.total_time_added || 0);
        const remaining = Math.max(0, totalDuration - elapsedWhenPaused);
        
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;
        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeRemaining("--:--:--");
      }
    }, 100); // Mise à jour très fréquente pour la fluidité
    
    return () => clearInterval(timer);
  }, [streamer]);

  const fetchStreamerData = async () => {
    if (!id) return;

    try {
      const { data: streamerData, error: streamerError } = await supabase
        .from('streamers')
        .select('*')
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

  return (
    <div className="min-h-screen bg-transparent p-4 font-sans">
      {/* Timer principal - Grande taille pour OBS */}
      <div className="fixed top-4 right-4 bg-black/90 backdrop-blur-sm border-2 border-purple-500/50 rounded-xl p-6 text-white shadow-2xl">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Timer className="w-6 h-6 mr-2 text-purple-400" />
            <span className="text-lg font-bold text-purple-400">PAUVRATHON</span>
          </div>
          
          <div className="text-6xl font-mono font-black mb-2 text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text">
            {timeRemaining}
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

      {/* Statistiques compactes - Position gauche */}
      <div className="fixed top-4 left-4 space-y-3">
        {/* Progression des clics */}
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

        {/* Stats rapides */}
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

        {/* Temps ajouté total */}
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

        {/* Top contributeur actuel */}
        {stats.length > 0 && (
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

      {/* Widget temps minimal - Coin bas droite */}
      <div className="fixed bottom-4 right-4 bg-black/95 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 text-white">
        <div className="text-center">
          <div className="text-xs text-purple-400 mb-1">TEMPS RESTANT</div>
          <div className="text-2xl font-mono font-bold text-white">
            {timeRemaining}
          </div>
        </div>
      </div>

      {/* Indicateur de mise à jour */}
      <div className="fixed bottom-4 left-4 text-xs text-gray-500">
        Dernière MAJ: {lastUpdate.toLocaleTimeString()}
      </div>

      {/* CSS pour les animations */}
      <style jsx>{`
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