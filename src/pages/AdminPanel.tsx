import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { StreamerRequest, Streamer, Minigame } from '@/types';
import { 
  Shield, 
  UserCheck, 
  UserX, 
  Users, 
  Clock,
  Gamepad2,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Crown,
  UserMinus
} from 'lucide-react';

export default function AdminPanel() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<StreamerRequest[]>([]);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [minigames, setMinigames] = useState<Minigame[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMinigame, setNewMinigame] = useState({
    name: '',
    code: '',
    description: ''
  });

  // Redirect if not admin
  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchRequests();
    fetchStreamers();
    fetchMinigames();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('streamer_requests')
        .select(`
          *,
          profiles(twitch_display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRequests((data || []) as StreamerRequest[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes.",
        variant: "destructive",
      });
    }
  };

  const fetchStreamers = async () => {
    try {
      const { data, error } = await supabase
        .from('streamers')
        .select(`
          *,
          profiles(twitch_display_name, avatar_url, twitch_username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const streamersWithProfile = (data || []).map(streamer => ({
        ...streamer,
        profile: streamer.profiles?.[0] || null
      }));
      
      setStreamers(streamersWithProfile as unknown as Streamer[]);
    } catch (error) {
      console.error('Error fetching streamers:', error);
    }
  };

  const fetchMinigames = async () => {
    try {
      const { data, error } = await supabase
        .from('minigames')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setMinigames(data || []);
    } catch (error) {
      console.error('Error fetching minigames:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approved' | 'rejected') => {
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      // Update request status
      const { error: updateError } = await supabase
        .from('streamer_requests')
        .update({ 
          status: action,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      if (action === 'approved') {
        // Create streamer record
        const { error: streamerError } = await supabase
          .from('streamers')
          .insert({
            user_id: request.user_id,
            twitch_id: request.twitch_username, // This should be improved with real Twitch ID
          });

        if (streamerError) throw streamerError;

        // Update user profile role
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: 'streamer' })
          .eq('user_id', request.user_id);

        if (profileError) throw profileError;
      }

      toast({
        title: action === 'approved' ? "Demande approuvée" : "Demande rejetée",
        description: `La demande de ${request.twitch_username} a été ${action === 'approved' ? 'approuvée' : 'rejetée'}.`,
      });

      fetchRequests();
      fetchStreamers();
    } catch (error: any) {
      console.error('Error handling request:', error);
      toast({
        title: "Erreur",
        description: "Impossible de traiter la demande.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveStreamer = async (streamerId: string, userId: string) => {
    try {
      // Remove from streamers table
      const { error: streamerError } = await supabase
        .from('streamers')
        .delete()
        .eq('id', streamerId);

      if (streamerError) throw streamerError;

      // Update profile role back to viewer
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'viewer' })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast({
        title: "Streamer retiré",
        description: "Le rôle de streamer a été retiré avec succès.",
      });

      fetchStreamers();
    } catch (error: any) {
      console.error('Error removing streamer:', error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer le rôle de streamer.",
        variant: "destructive",
      });
    }
  };

  const handleAddMinigame = async () => {
    if (!newMinigame.name || !newMinigame.code) {
      toast({
        title: "Erreur",
        description: "Le nom et le code sont requis.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('minigames')
        .insert({
          ...newMinigame,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Mini-jeu ajouté",
        description: "Le nouveau mini-jeu a été ajouté avec succès.",
      });

      setNewMinigame({ name: '', code: '', description: '' });
      fetchMinigames();
    } catch (error: any) {
      console.error('Error adding minigame:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le mini-jeu.",
        variant: "destructive",
      });
    }
  };

  const handleToggleMinigame = async (minigameId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('minigames')
        .update({ is_active: !isActive })
        .eq('id', minigameId);

      if (error) throw error;

      toast({
        title: isActive ? "Mini-jeu désactivé" : "Mini-jeu activé",
        description: "Le statut du mini-jeu a été mis à jour.",
      });

      fetchMinigames();
    } catch (error: any) {
      console.error('Error toggling minigame:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le mini-jeu.",
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

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const totalStreamers = streamers.length;
  const totalActiveGames = minigames.filter(m => m.is_active).length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text flex items-center">
            <Shield className="mr-3 h-8 w-8" />
            Panneau d'Administration
          </h1>
          <p className="text-muted-foreground">
            Gérez les utilisateurs, streamers et mini-jeux de la plateforme
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="neon-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-yellow-500">{pendingRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Demandes en attente</p>
                </div>
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-effect">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary">{totalStreamers}</p>
                  <p className="text-xs text-muted-foreground">Streamers actifs</p>
                </div>
                <Users className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="neon-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-accent">{totalActiveGames}</p>
                  <p className="text-xs text-muted-foreground">Mini-jeux actifs</p>
                </div>
                <Gamepad2 className="h-6 w-6 text-accent" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-effect">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{requests.length}</p>
                  <p className="text-xs text-muted-foreground">Total demandes</p>
                </div>
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Streamer Requests */}
          <div className="space-y-6">
            <Card className="neon-border">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserCheck className="mr-2 h-5 w-5" />
                  Demandes de Streamer ({pendingRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCheck className="mx-auto h-12 w-12 mb-4" />
                    <p>Aucune demande en attente</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="border border-border rounded-lg p-4 glass-effect">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={request.profiles?.avatar_url} />
                              <AvatarFallback>
                                {request.twitch_username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium">{request.twitch_username}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(request.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">En attente</Badge>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm mb-1"><strong>Chaîne:</strong></p>
                          <a 
                            href={request.stream_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
                          >
                            {request.stream_link}
                          </a>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-sm mb-1"><strong>Motivation:</strong></p>
                          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                            {request.motivation}
                          </p>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleRequestAction(request.id, 'approved')}
                            className="flex-1 neon-glow"
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRequestAction(request.id, 'rejected')}
                            className="flex-1"
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Rejeter
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Streamers */}
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="mr-2 h-5 w-5" />
                  Streamers Actifs ({totalStreamers})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {streamers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="mx-auto h-12 w-12 mb-4" />
                    <p>Aucun streamer actif</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {streamers.map((streamer) => (
                      <div key={streamer.id} className="flex items-center justify-between p-3 border border-border rounded neon-border">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={streamer.profile?.avatar_url} />
                            <AvatarFallback>
                              {streamer.profile?.twitch_display_name?.charAt(0) || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {streamer.profile?.twitch_display_name || 'Streamer'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{streamer.profile?.twitch_username}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={streamer.is_live ? 'default' : 'secondary'}>
                            {streamer.is_live ? 'Live' : 'Offline'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveStreamer(streamer.id, streamer.user_id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Minigames Management */}
          <div className="space-y-6">
            <Card className="neon-border">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="mr-2 h-5 w-5" />
                  Ajouter un Mini-jeu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="game-name">Nom du jeu</Label>
                  <Input
                    id="game-name"
                    value={newMinigame.name}
                    onChange={(e) => setNewMinigame(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: guess_number"
                  />
                </div>
                
                <div>
                  <Label htmlFor="game-code">Code du jeu</Label>
                  <Input
                    id="game-code"
                    value={newMinigame.code}
                    onChange={(e) => setNewMinigame(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Ex: number_guessing"
                  />
                </div>
                
                <div>
                  <Label htmlFor="game-description">Description</Label>
                  <Textarea
                    id="game-description"
                    value={newMinigame.description}
                    onChange={(e) => setNewMinigame(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description du mini-jeu..."
                    rows={3}
                  />
                </div>
                
                <Button onClick={handleAddMinigame} className="w-full neon-glow">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter le Mini-jeu
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gamepad2 className="mr-2 h-5 w-5" />
                  Mini-jeux ({minigames.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {minigames.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gamepad2 className="mx-auto h-12 w-12 mb-4" />
                    <p>Aucun mini-jeu configuré</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {minigames.map((minigame) => (
                      <div key={minigame.id} className="flex items-center justify-between p-3 border border-border rounded neon-border">
                        <div>
                          <p className="font-medium">{minigame.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {minigame.description || minigame.code}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={minigame.is_active ? 'default' : 'secondary'}>
                            {minigame.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleMinigame(minigame.id, minigame.is_active)}
                          >
                            {minigame.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}