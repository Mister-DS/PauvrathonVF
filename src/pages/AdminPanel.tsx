// src/pages/AdminPanel.tsx

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
  UserMinus,
  ArrowUpRight,
  Filter,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// Interfaces pour un typage plus précis
interface DetailedStreamerRequest extends StreamerRequest {
  rejection_reason?: string;
  profiles: {
    twitch_display_name: string;
    twitch_username: string;
  };
}

// Fonction utilitaire
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

export default function AdminPanel() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [streamerRequests, setStreamerRequests] = useState<DetailedStreamerRequest[]>([]);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [availableMinigames, setAvailableMinigames] = useState<Minigame[]>([]);
  const [newMinigameName, setNewMinigameName] = useState('');
  const [newMinigameDescription, setNewMinigameDescription] = useState('');
  const [newMinigameIsActive, setNewMinigameIsActive] = useState(true);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<DetailedStreamerRequest | null>(null);

  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const fetchStreamerRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('streamer_requests')
        .select(`
          *,
          profiles (
            twitch_display_name,
            twitch_username
          )
        `)
        .eq('status', 'pending');

      if (error) throw error;
      setStreamerRequests(data as DetailedStreamerRequest[]);
    } catch (error: any) {
      console.error('Error fetching streamer requests:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes de streamer.",
        variant: "destructive",
      });
    }
  };

  const fetchStreamers = async () => {
    try {
      const { data, error } = await supabase
        .from('streamers')
        .select('*');

      if (error) throw error;
      setStreamers(data as Streamer[]);
    } catch (error: any) {
      console.error('Error fetching streamers:', error);
    }
  };

  const fetchMinigames = async () => {
    try {
      const { data, error } = await supabase
        .from('minigames')
        .select('*');

      if (error) throw error;
      setAvailableMinigames(data as Minigame[]);
    } catch (error: any) {
      console.error('Error fetching minigames:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStreamerRequests(),
        fetchStreamers(),
        fetchMinigames()
      ]);
      setLoading(false);
    };
    loadData();

    const requestChannel = supabase
      .channel('public:streamer_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streamer_requests' }, () => {
        fetchStreamerRequests();
      })
      .subscribe();

    const streamerChannel = supabase
      .channel('public:streamers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streamers' }, () => {
        fetchStreamers();
      })
      .subscribe();

    const minigameChannel = supabase
      .channel('public:minigames')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'minigames' }, () => {
        fetchMinigames();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(requestChannel);
      supabase.removeChannel(streamerChannel);
      supabase.removeChannel(minigameChannel);
    };
  }, []);

  // ******************************************************
  // FONCTION AJOUTÉE POUR GÉRER L'ACCEPTATION DES DEMANDES
  // ******************************************************
  const handleAcceptRequest = async (request: DetailedStreamerRequest) => {
    try {
      // 1. Mettre à jour le statut de la demande
      const { error: requestError } = await supabase
        .from('streamer_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', request.id);

      if (requestError) throw requestError;

      // 2. Créer l'entrée dans la table 'streamers'
      const streamerInsertData = {
        user_id: request.user_id,
        stream_title: request.stream_title,
        twitch_id: request.twitch_id,
        twitch_login: request.twitch_login,
        twitch_display_name: request.profiles.twitch_display_name,
        clicks_required: 100,
        total_time_added: 0,
        is_live: false,
        status: 'offline',
        current_clicks: 0,
        initial_duration: 7200, // 2 heures par défaut
        total_elapsed_time: 0,
        total_paused_duration: 0,
        pause_started_at: null,
        stream_started_at: null,
        time_mode: 'fixed',
        time_increment: 30,
        min_random_time: 10,
        max_random_time: 60,
        cooldown_seconds: 30,
        active_minigames: [],
      };
      
      const { error: streamerError } = await supabase
        .from('streamers')
        .insert(streamerInsertData);

      if (streamerError) throw streamerError;

      // 3. Mettre à jour le rôle de l'utilisateur
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'streamer', updated_at: new Date().toISOString() })
        .eq('id', request.user_id);

      if (profileError) throw profileError;

      toast({
        title: "Demande acceptée",
        description: `Le profil de ${request.profiles.twitch_display_name} a été validé.`,
      });
      fetchStreamerRequests(); // Recharger les demandes
      fetchStreamers(); // Recharger la liste des streamers
    } catch (error: any) {
      console.error('Erreur lors de l\'acceptation:', error);
      toast({
        title: "Erreur",
        description: `Impossible d'accepter la demande: ${error.message || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    }
  };

  const handleRejectDialog = (request: DetailedStreamerRequest) => {
    setSelectedRequest(request);
    setShowRejectionDialog(true);
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase
        .from('streamer_requests')
        .update({ status: 'rejected', rejection_reason: rejectionReason, updated_at: new Date().toISOString() })
        .eq('id', selectedRequest.id);

      if (error) throw error;
      
      toast({
        title: "Demande rejetée",
        description: `La demande de ${selectedRequest.profiles.twitch_display_name} a été rejetée.`,
      });
      fetchStreamerRequests();
      setShowRejectionDialog(false);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Erreur lors du rejet:', error);
      toast({
        title: "Erreur",
        description: `Impossible de rejeter la demande: ${error.message || 'Erreur inconnue'}`,
        variant: "destructive",
      });
    }
  };

  const handleMinigameAction = async (action: 'add' | 'delete', minigameId?: string) => {
    try {
      if (action === 'add') {
        const { error } = await supabase
          .from('minigames')
          .insert({ name: newMinigameName, description: newMinigameDescription, is_active: newMinigameIsActive });
        if (error) throw error;
        toast({ title: "Succès", description: "Mini-jeu ajouté." });
        setNewMinigameName('');
        setNewMinigameDescription('');
        setNewMinigameIsActive(true);
      } else if (action === 'delete') {
        const { error } = await supabase
          .from('minigames')
          .delete()
          .eq('id', minigameId);
        if (error) throw error;
        toast({ title: "Succès", description: "Mini-jeu supprimé." });
      }
      fetchMinigames();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: `Impossible d'effectuer l'action: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
            Panneau Admin
          </h1>
          <Badge variant="secondary" className="text-base py-1 px-3">
            <Crown className="w-4 h-4 mr-2" />
            Mode Admin
          </Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Section Demandes de Streamer */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Demandes de Streamer ({streamerRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {streamerRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Aucune demande en attente.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {streamerRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={`https://static-cdn.jtvnw.net/jtv_user_pictures/${request.twitch_id}-profile_image-300x300.png`} />
                            <AvatarFallback>{request.profiles.twitch_display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{request.profiles.twitch_display_name}</h3>
                              <a href={`https://twitch.tv/${request.profiles.twitch_username}`} target="_blank" rel="noopener noreferrer">
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </a>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Demande pour le rôle de streamer.
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {/* ****************************************************** */}
                          {/* APPEL CORRECT DE LA NOUVELLE FONCTION AVEC L'OBJET REQUÊTE */}
                          {/* ****************************************************** */}
                          <Button variant="outline" size="sm" onClick={() => handleAcceptRequest(request)}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            Accepter
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleRejectDialog(request)}>
                            <XCircle className="mr-2 h-4 w-4 text-red-500" />
                            Rejeter
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section Mini-Jeux */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Gamepad2 className="mr-2 h-5 w-5" />
                Gestion des mini-jeux
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Ajouter un mini-jeu</h3>
                <Input
                  placeholder="Nom du mini-jeu"
                  value={newMinigameName}
                  onChange={(e) => setNewMinigameName(e.target.value)}
                />
                <Textarea
                  placeholder="Description (optionnel)"
                  value={newMinigameDescription}
                  onChange={(e) => setNewMinigameDescription(e.target.value)}
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="new-minigame-active"
                    checked={newMinigameIsActive}
                    onChange={(e) => setNewMinigameIsActive(e.target.checked)}
                    className="h-4 w-4 text-primary"
                  />
                  <Label htmlFor="new-minigame-active">Actif par défaut</Label>
                </div>
                <Button 
                  onClick={() => handleMinigameAction('add')} 
                  disabled={!newMinigameName.trim()}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter le mini-jeu
                </Button>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Mini-jeux existants</h3>
                {availableMinigames.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun mini-jeu trouvé.</p>
                ) : (
                  <ul className="space-y-2">
                    {availableMinigames.map((game) => (
                      <li key={game.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                        <span>{game.name}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleMinigameAction('delete', game.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialog for Rejection Reason */}
        <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
                Rejeter la demande
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Veuillez fournir une raison pour le rejet de cette demande de streamer.
              </p>
              <div>
                <Label htmlFor="rejection-reason">Raison du rejet</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Ex: Le profil Twitch n'existe pas ou ne correspond pas."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleRejectRequest} disabled={!rejectionReason.trim()}>
                Confirmer le rejet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}