// src/pages/AdminPanel.tsx

import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { StreamerRequest, Streamer, Minigame } from "@/types";
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
  AlertTriangle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Interfaces pour un typage plus précis
interface DetailedStreamerRequest extends StreamerRequest {
  rejection_reason?: string;
  profiles?: {
    twitch_display_name?: string;
    avatar_url?: string;
    twitch_username?: string;
  };
}

const predefinedGames = [
  {
    id: "guess_number",
    name: "Devine le nombre",
    description: "Les viewers doivent deviner le nombre mystère.",
  },
  {
    id: "click_race",
    name: "Course aux clics",
    description: "Le premier à cliquer 100 fois l'emporte.",
  },
  {
    id: "random_emote",
    name: "Émote aléatoire",
    description: "Le premier à poster l'émote du jour gagne.",
  },
];

export default function AdminPanel() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<DetailedStreamerRequest[]>([]);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [minigames, setMinigames] = useState<Minigame[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMinigameName, setNewMinigameName] = useState("");
  const [newMinigameDescription, setNewMinigameDescription] = useState("");
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );
  const [processingRequest, setProcessingRequest] = useState<string | null>(
    null
  );

  if (!user || profile?.role !== "admin") {
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
        .from("streamer_requests")
        .select(
          `
          *,
          profiles(twitch_display_name, avatar_url, twitch_username)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRequests((data || []) as DetailedStreamerRequest[]);
    } catch (error) {
      console.error("Error fetching requests:", error);
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
        .from("streamers")
        .select(
          `
          *,
          profiles(twitch_display_name, avatar_url, twitch_username)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const streamersWithProfile = (data || []).map((streamer) => ({
        ...streamer,
        profile: Array.isArray(streamer.profiles)
          ? streamer.profiles[0]
          : streamer.profiles,
      }));

      setStreamers(streamersWithProfile as unknown as Streamer[]);
    } catch (error) {
      console.error("Error fetching streamers:", error);
    }
  };

  const fetchMinigames = async () => {
    try {
      const { data, error } = await supabase
        .from("minigames")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setMinigames((data as Minigame[]) || []);
    } catch (error) {
      console.error("Error fetching minigames:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    if (processingRequest) return;
  
    setProcessingRequest(requestId);
  
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request || !request.user_id) {
        throw new Error('Demande ou user_id manquant');
      }
  
      console.log('Processing request:', request);
  
      // Étape 1: Trouver le profil de l'utilisateur en utilisant le user_id de la demande
      const { data: userProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', request.user_id)
        .single();
  
      if (profileCheckError) {
        if (profileCheckError.code === 'PGRST116') {
          await supabase
            .from('streamer_requests')
            .update({
              status: 'rejected',
              rejection_reason: 'Profil utilisateur supprimé ou inexistant.',
              reviewed_at: new Date().toISOString(),
              reviewed_by: user.id
            })
            .eq('id', requestId);
          throw new Error('Le profil de cet utilisateur n\'existe plus. La demande a été rejetée automatiquement.');
        } else {
          throw new Error(`Erreur lors de la vérification du profil: ${profileCheckError.message}`);
        }
      }
  
      // Étape 2: Mettre à jour le rôle de l'utilisateur dans la table 'profiles'
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          role: 'streamer',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.user_id);
  
      if (profileUpdateError) {
        throw new Error(`Erreur de mise à jour du rôle: ${profileUpdateError.message}`);
      }
  
      // Étape 3: Mettre à jour le statut de la demande dans la table 'streamer_requests'
      const { error: updateRequestError } = await supabase
        .from('streamer_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', requestId);
  
      if (updateRequestError) {
        throw new Error(`Erreur de mise à jour de la demande: ${updateRequestError.message}`);
      }
  
      // Étape 4: Créer une entrée dans la table 'streamers' si elle n'existe pas
      // Note : On utilise l'ID de l'utilisateur de la table 'auth.users' ici
      const { data: existingStreamer, error: streamerCheckError } = await supabase
        .from('streamers')
        .select('id')
        .eq('user_id', userProfile.user_id) // CORRECTION: Utiliser le user_id récupéré
        .single();
  
      if (streamerCheckError && streamerCheckError.code !== 'PGRST116') {
        throw new Error(`Erreur lors de la vérification du streamer: ${streamerCheckError.message}`);
      }
  
      if (!existingStreamer) {
        let extractedTwitchId = null;
        try {
          const twitchUrlMatch = request.stream_link.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
          if (twitchUrlMatch) {
            extractedTwitchId = twitchUrlMatch[1];
          }
        } catch (e) {
          console.warn('Could not extract Twitch ID from stream link');
        }
  
        const streamerData = {
          user_id: userProfile.user_id, // CORRECTION: Utiliser le user_id récupéré
          twitch_id: extractedTwitchId || 'unknown',
          stream_title: `Pauvrathon de ${request.twitch_username}`,
          // ... autres champs par défaut
        };
        
        const { error: streamerInsertError } = await supabase.from('streamers').insert(streamerData);
        if (streamerInsertError) {
          throw new Error(`Erreur de création du streamer: ${streamerInsertError.message}`);
        }
      }
  
      toast({
        title: "Demande approuvée",
        description: `La demande de ${request.profiles?.twitch_username} a été traitée avec succès.`,
      });
  
      await Promise.all([fetchRequests(), fetchStreamers()]);
  
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de traiter la demande.",
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequestId || !rejectionReason.trim()) {
      toast({
        title: "Raison manquante",
        description: "Veuillez fournir une raison pour le rejet.",
        variant: "destructive",
      });
      return;
    }

    try {
      const request = requests.find((r) => r.id === selectedRequestId);
      if (!request) return;

      const { error: updateError } = await supabase
        .from("streamer_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", selectedRequestId);

      if (updateError) throw updateError;

      toast({
        title: "Demande rejetée",
        description: `La demande de ${request.twitch_username} a été rejetée.`,
      });

      setShowRejectionDialog(false);
      setRejectionReason("");
      setSelectedRequestId(null);
      fetchRequests();
      fetchStreamers();
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Erreur",
        description: "Impossible de rejeter la demande.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveStreamer = async (streamerId: string, userId: string) => {
    try {
      const { error: streamerError } = await supabase
        .from("streamers")
        .delete()
        .eq("id", streamerId);

      if (streamerError) throw streamerError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: "viewer" })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      toast({
        title: "Streamer retiré",
        description: "Le rôle de streamer a été retiré avec succès.",
      });

      fetchStreamers();
    } catch (error: any) {
      console.error("Error removing streamer:", error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer le rôle de streamer.",
        variant: "destructive",
      });
    }
  };

  const handleAddMinigame = async () => {
    if (!newMinigameName) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer le nom du mini-jeu.",
        variant: "destructive",
      });
      return;
    }

    try {
      const componentCode = newMinigameName.toLowerCase().replace(/\s+/g, "_");

      const { data: existingGame, error: existingError } = await supabase
        .from("minigames")
        .select("id")
        .eq("component_code", componentCode)
        .single();

      if (existingGame) {
        toast({
          title: "Mini-jeu déjà existant",
          description: `Un mini-jeu avec le code "${componentCode}" a déjà été ajouté.`,
          variant: "destructive",
        });
        return;
      }

      if (existingError && existingError.code !== "PGRST116") {
        throw existingError;
      }

        const { error } = await supabase.from("minigames").insert({
          name: newMinigameName,
          component_code: componentCode,
          description: newMinigameDescription || `Mini-jeu ${newMinigameName}`
        });

      if (error) throw error;

      toast({
        title: "Mini-jeu ajouté",
        description: `Le mini-jeu "${newMinigameName}" (${componentCode}) a été ajouté avec succès.`,
      });

      setNewMinigameName("");
      setNewMinigameDescription("");
      fetchMinigames();
    } catch (error: any) {
      console.error("Error adding minigame:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le mini-jeu.",
        variant: "destructive",
      });
    }
  };

  const handleCreateAdminStreamerProfile = async () => {
    try {
      const { error } = await supabase.rpc("create_admin_streamer_profile");

      if (error) throw error;

      toast({
        title: "Profil streamer créé",
        description: "Vous avez maintenant accès aux fonctionnalités streamer.",
      });

      fetchStreamers();
    } catch (error: any) {
      console.error("Error creating admin streamer profile:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le profil streamer.",
        variant: "destructive",
      });
    }
  };

  const handleToggleMinigame = async (
    minigameId: string,
    isActive: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("minigames")
        .update({ is_active: !isActive })
        .eq("id", minigameId);

      if (error) throw error;

      toast({
        title: isActive ? "Mini-jeu désactivé" : "Mini-jeu activé",
        description: "Le statut du mini-jeu a été mis à jour.",
      });

      fetchMinigames();
    } catch (error: any) {
      console.error("Error toggling minigame:", error);
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

  const pendingRequests = requests.filter((r) => r.status === "pending");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500 text-white">Approuvé</Badge>;
      case "rejected":
        return <Badge className="bg-red-500 text-white">Rejeté</Badge>;
      default:
        return <Badge variant="outline">En attente</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text flex items-center">
            <Shield className="mr-3 h-8 w-8" />
            Panneau d'Administration
          </h1>
          <p className="text-muted-foreground mb-4">
            Gérez les utilisateurs, streamers et mini-jeux de la plateforme
          </p>
          <div className="flex gap-4">
            <Button
              onClick={handleCreateAdminStreamerProfile}
              className="neon-glow"
            >
              <Crown className="mr-2 h-4 w-4" />
              Me donner l'accès Streamer
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="neon-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-yellow-500">
                    {pendingRequests.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Demandes en attente
                  </p>
                </div>
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {streamers.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Streamers actifs
                  </p>
                </div>
                <Users className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="neon-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-accent">
                    {minigames.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Mini-jeux</p>
                </div>
                <Gamepad2 className="h-6 w-6 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="glass-effect cursor-pointer transition-transform duration-200 hover:scale-105"
            onClick={() => setShowAllRequests(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{requests.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Total demandes
                  </p>
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
                      <div
                        key={request.id}
                        className="border border-border rounded-lg p-4 glass-effect"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={request.profiles?.avatar_url} />
                              <AvatarFallback>
                                {request.twitch_username
                                  ?.charAt(0)
                                  .toUpperCase() || "S"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium">
                                {request.profiles?.twitch_display_name ||
                                  request.twitch_username}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(
                                  request.created_at
                                ).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">En attente</Badge>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm mb-1">
                            <strong>Chaîne:</strong>
                          </p>
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
                          <p className="text-sm mb-1">
                            <strong>Motivation:</strong>
                          </p>
                          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                            {request.motivation}
                          </p>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveRequest(request.id)}
                            disabled={processingRequest === request.id}
                            className="flex-1 neon-glow"
                          >
                            {processingRequest === request.id ? (
                              <>
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                Traitement...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Approuver
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedRequestId(request.id);
                              setShowRejectionDialog(true);
                            }}
                            disabled={processingRequest === request.id}
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
                  Streamers Actifs ({streamers.length})
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
                      <div
                        key={streamer.id}
                        className="flex items-center justify-between p-3 border border-border rounded neon-border"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={streamer.profile?.avatar_url} />
                            <AvatarFallback>
                              {streamer.profile?.twitch_display_name?.charAt(
                                0
                              ) || "S"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {streamer.profile?.twitch_display_name ||
                                "Streamer"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{streamer.profile?.twitch_username}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={streamer.is_live ? "default" : "secondary"}
                          >
                            {streamer.is_live ? "Live" : "Offline"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleRemoveStreamer(
                                streamer.id,
                                streamer.user_id
                              )
                            }
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
                  <Label htmlFor="game-id">Nom interne du jeu</Label>
                  <Input
                    id="game-id"
                    placeholder="Entrez le nom du jeu (ex: guess_number)"
                    value={newMinigameName}
                    onChange={(e) => setNewMinigameName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="game-description">Description</Label>
                  <Textarea
                    id="game-description"
                    placeholder="Entrez une brève description du jeu."
                    value={newMinigameDescription}
                    onChange={(e) => setNewMinigameDescription(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleAddMinigame}
                  className="w-full neon-glow"
                  disabled={!newMinigameName}
                >
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
                      <div
                        key={minigame.id}
                        className="flex items-center justify-between p-3 border border-border rounded neon-border"
                      >
                        <div>
                          <p className="font-medium">
                            {minigame.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {minigame.description || "Pas de description"}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              minigame.is_active ? "default" : "secondary"
                            }
                          >
                            {minigame.is_active ? "Actif" : "Inactif"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleToggleMinigame(
                                minigame.id,
                                minigame.is_active
                              )
                            }
                          >
                            {minigame.is_active ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
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

        {/* Dialog for All Requests */}
        <Dialog open={showAllRequests} onOpenChange={setShowAllRequests}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Historique des Demandes de Streamer ({requests.length})
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
              {requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                  <p>Aucune demande enregistrée</p>
                </div>
              ) : (
                requests.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={request.profiles?.avatar_url} />
                          <AvatarFallback>
                            {request.twitch_username?.charAt(0).toUpperCase() ||
                              "S"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">
                            {request.profiles?.twitch_display_name ||
                              request.twitch_username}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString(
                              "fr-FR"
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        {getStatusBadge(request.status)}
                        <span className="text-xs text-muted-foreground mt-1">
                          {request.reviewed_at
                            ? new Date(request.reviewed_at).toLocaleDateString(
                                "fr-FR"
                              )
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                    {request.status === "rejected" &&
                      request.rejection_reason && (
                        <div className="mt-2 p-3 text-sm rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          <p className="font-medium mb-1 flex items-center">
                            <AlertTriangle className="mr-2 w-4 h-4" /> Raison du
                            rejet
                          </p>
                          <p>{request.rejection_reason}</p>
                        </div>
                      )}
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog for Rejection Reason */}
        <Dialog
          open={showRejectionDialog}
          onOpenChange={setShowRejectionDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
                Rejeter la demande
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Veuillez fournir une raison pour le rejet de cette demande de
                streamer.
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
              <Button
                variant="outline"
                onClick={() => setShowRejectionDialog(false)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectRequest}
                disabled={!rejectionReason.trim()}
              >
                Confirmer le rejet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}