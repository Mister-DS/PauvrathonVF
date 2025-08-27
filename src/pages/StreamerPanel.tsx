import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Streamer, SubathonStats } from '@/types';
import { 
  Settings, 
  Clock, 
  MousePointer, 
  Timer, 
  Gamepad2, 
  Trophy,
  Users,
  Star,
  Save,
  Play,
  Pause,
  RotateCcw,
  Dice1
} from 'lucide-react';

export default function StreamerPanel() {
  const { user, profile } = useAuth();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [stats, setStats] = useState<SubathonStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    time_increment: 30,
    clicks_required: 100,
    cooldown_seconds: 300,
    is_live: false,
    time_mode: 'fixed' as 'fixed' | 'random',
    max_random_time: 60,
  });

  // Redirect if not authenticated or not a streamer
  if (!user || (profile?.role !== 'streamer' && profile?.role !== 'admin')) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchStreamerData();
    fetchStats();
    
    // Set up real-time updates for streamer data
    const interval = setInterval(() => {
      fetchStreamerData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  const fetchStreamerData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('streamers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setStreamer(data as Streamer);
        setSettings({
          time_increment: data.time_increment,
          clicks_required: data.clicks_required,
          cooldown_seconds: data.cooldown_seconds,
          is_live: data.is_live,
          time_mode: (data.time_mode as 'fixed' | 'random') || 'fixed',
          max_random_time: data.max_random_time || 60,
        });
      }
    } catch (error) {
      console.error('Error fetching streamer data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos données de streamer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!streamer) return;

    try {
      const { data, error } = await supabase
        .from('subathon_stats')
        .select('*')
        .eq('streamer_id', streamer.id)
        .order('time_contributed', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setStats(data || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!streamer) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('streamers')
        .update(settings)
        .eq('id', streamer.id);

      if (error) throw error;

      setStreamer(prev => prev ? { ...prev, ...settings } : null);
      
      toast({
        title: "Paramètres sauvegardés",
        description: "Vos paramètres ont été mis à jour avec succès.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetClicks = async () => {
    if (!streamer) return;

    try {
      const { error } = await supabase
        .from('streamers')
        .update({ current_clicks: 0 })
        .eq('id', streamer.id);

      if (error) throw error;

      setStreamer(prev => prev ? { ...prev, current_clicks: 0 } : null);
      
      toast({
        title: "Clics remis à zéro",
        description: "Le compteur de clics a été réinitialisé.",
      });
    } catch (error) {
      console.error('Error resetting clicks:', error);
      toast({
        title: "Erreur",
        description: "Impossible de remettre à zéro les clics.",
        variant: "destructive",
      });
    }
  };

  const topContributor = stats.length > 0 ? stats[0] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!streamer) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Configuration requise</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Vous devez d'abord être approuvé comme streamer pour accéder à ce panneau.
              </p>
              <Button asChild>
                <a href="/demande-streamer">Faire une demande</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text">Panneau Streamer</h1>
          <p className="text-muted-foreground">
            Gérez votre subathon et personnalisez votre expérience
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Settings */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="neon-border">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Paramètres du Subathon
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Time Configuration Section */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-medium flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Configuration du Temps
                  </h3>
                  
                  <RadioGroup
                    value={settings.time_mode}
                    onValueChange={(value) => setSettings(prev => ({ 
                      ...prev, 
                      time_mode: value as 'fixed' | 'random' 
                    }))}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                      <RadioGroupItem value="fixed" id="fixed" />
                      <Label htmlFor="fixed" className="flex-1 cursor-pointer">
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4" />
                          Temps fixe
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                      <RadioGroupItem value="random" id="random" />
                      <Label htmlFor="random" className="flex-1 cursor-pointer">
                        <div className="flex items-center">
                          <Dice1 className="mr-2 h-4 w-4" />
                          Temps aléatoire
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="grid md:grid-cols-2 gap-4">
                    {settings.time_mode === 'fixed' ? (
                      <div>
                        <Label htmlFor="time_increment">Temps ajouté par victoire (secondes)</Label>
                        <Input
                          id="time_increment"
                          type="number"
                          min="1"
                          max="300"
                          value={settings.time_increment}
                          onChange={(e) => setSettings(prev => ({ 
                            ...prev, 
                            time_increment: parseInt(e.target.value) || 1
                          }))}
                        />
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="max_random_time">Temps maximum aléatoire (secondes)</Label>
                        <Input
                          id="max_random_time"
                          type="number"
                          min="1"
                          max="300"
                          value={settings.max_random_time}
                          onChange={(e) => setSettings(prev => ({ 
                            ...prev, 
                            max_random_time: parseInt(e.target.value) || 1
                          }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Entre 1 et {settings.max_random_time} secondes seront ajoutées
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Other Settings */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clicks_required">Clics requis pour mini-jeu</Label>
                    <Input
                      id="clicks_required"
                      type="number"
                      min="10"
                      max="1000"
                      value={settings.clicks_required}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        clicks_required: parseInt(e.target.value) || 10
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cooldown_seconds">Cooldown après mini-jeu (secondes)</Label>
                    <Input
                      id="cooldown_seconds"
                      type="number"
                      min="0"
                      max="3600"
                      value={settings.cooldown_seconds}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        cooldown_seconds: parseInt(e.target.value) || 0
                      }))}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_live"
                    checked={settings.is_live}
                    onCheckedChange={(checked) => setSettings(prev => ({ 
                      ...prev, 
                      is_live: checked 
                    }))}
                  />
                  <Label htmlFor="is_live">Subathon en direct</Label>
                </div>

                <div className="flex space-x-4">
                  <Button 
                    onClick={handleSaveSettings} 
                    disabled={saving}
                    className="neon-glow"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleResetClicks}
                    className="neon-border"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Clics
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Status */}
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="mr-2 h-5 w-5" />
                  Statut Actuel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {streamer.current_clicks}
                    </div>
                    <p className="text-sm text-muted-foreground">Clics actuels</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">
                      {streamer.total_time_added}s
                    </div>
                    <p className="text-sm text-muted-foreground">Temps ajouté</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {Math.floor(streamer.total_time_added / 60)}:{(streamer.total_time_added % 60).toString().padStart(2, '0')}
                    </div>
                    <p className="text-sm text-muted-foreground">Format temps</p>
                  </div>
                  
                  <div className="text-center">
                    <Badge variant={streamer.is_live ? 'default' : 'secondary'} className="pulse-neon">
                      {streamer.is_live ? 'En direct' : 'Hors ligne'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {/* Top Contributor */}
            <Card className="neon-border">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="mr-2 h-5 w-5" />
                  Meilleur Contributeur
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topContributor ? (
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">
                      {topContributor.player_twitch_username || 'Anonyme'}
                    </div>
                    <div className="text-2xl font-bold mt-2">
                      {topContributor.time_contributed}s
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {topContributor.games_won} victoires sur {topContributor.games_played} parties
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-2" />
                    <p>Aucun contributeur pour le moment</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full neon-border"
                  asChild
                >
                  <a href={`/streamer/${streamer.id}`} target="_blank">
                    <Play className="mr-2 h-4 w-4" />
                    Voir ma page
                  </a>
                </Button>
                
                <Button 
                  variant={settings.is_live ? "secondary" : "default"}
                  className="w-full"
                  onClick={async () => {
                    const newLiveStatus = !settings.is_live;
                    setSettings(prev => ({ ...prev, is_live: newLiveStatus }));
                    
                    // Sauvegarder immédiatement le changement de statut
                    try {
                      const { error } = await supabase
                        .from('streamers')
                        .update({ is_live: newLiveStatus })
                        .eq('id', streamer.id);

                      if (error) throw error;

                      setStreamer(prev => prev ? { ...prev, is_live: newLiveStatus } : null);
                      
                      toast({
                        title: newLiveStatus ? "🔴 Stream repris" : "⏸️ Stream en pause",
                        description: newLiveStatus ? 
                          "Votre subathon est maintenant en direct !" : 
                          "Votre subathon est maintenant en pause.",
                      });
                    } catch (error) {
                      console.error('Error updating live status:', error);
                      // Revert local state on error
                      setSettings(prev => ({ ...prev, is_live: !newLiveStatus }));
                      toast({
                        title: "Erreur",
                        description: "Impossible de mettre à jour le statut.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {settings.is_live ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Mettre en pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Reprendre le stream
                    </>
                  )}
                </Button>

                {/* Bouton Arrêter */}
                <Button 
                  variant="destructive"
                  className="w-full"
                  onClick={async () => {
                    // Confirmer l'arrêt
                    if (!confirm("Êtes-vous sûr de vouloir arrêter complètement le subathon ? Cela remettra les clics à zéro.")) {
                      return;
                    }

                    setSettings(prev => ({ ...prev, is_live: false }));
                    
                    try {
                      // Arrêter le stream et remettre les clics à zéro
                      const { error } = await supabase
                        .from('streamers')
                        .update({ 
                          is_live: false,
                          current_clicks: 0
                        })
                        .eq('id', streamer.id);

                      if (error) throw error;

                      setStreamer(prev => prev ? { 
                        ...prev, 
                        is_live: false,
                        current_clicks: 0
                      } : null);
                      
                      toast({
                        title: "⏹️ Stream arrêté",
                        description: "Votre subathon a été arrêté et les clics remis à zéro.",
                      });
                    } catch (error) {
                      console.error('Error stopping stream:', error);
                      toast({
                        title: "Erreur",
                        description: "Impossible d'arrêter le stream.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Arrêter le stream
                </Button>
              </CardContent>
            </Card>

            {/* Mini Stats */}
            <Card className="neon-border">
              <CardHeader>
                <CardTitle>Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Participants uniques:</span>
                  <span className="font-bold">{stats.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total clics:</span>
                  <span className="font-bold">
                    {stats.reduce((sum, stat) => sum + stat.clicks_contributed, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total parties:</span>
                  <span className="font-bold">
                    {stats.reduce((sum, stat) => sum + stat.games_played, 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}