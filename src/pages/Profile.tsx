import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useStreamerStatus } from '@/hooks/useStreamerStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  User, 
  Trophy, 
  Clock, 
  Gamepad2, 
  Calendar, 
  LogOut, 
  Trash2, 
  AlertTriangle,
  Loader2,
  Shield,
  Star // Ajout de l'icône Star pour les clics
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Fonction utilitaire pour formater le temps
const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

export default function Profile() {
  const { user, profile, signOut, connectTwitch, twitchUser } = useAuth();
  const { isLive } = useStreamerStatus(user?.id);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    if (confirmationEmail !== user.email) {
      toast({
        title: "Confirmation incorrecte",
        description: "Veuillez taper votre email exact pour confirmer la suppression.",
        variant: "destructive",
      });
      return;
    }

    if (profile?.role === 'streamer' && isLive) {
      toast({
        title: "Suppression impossible",
        description: "Vous ne pouvez pas supprimer votre compte pendant que vous êtes en live. Terminez d'abord votre stream.",
        variant: "destructive",
      });
      return;
    }
    
    setIsDeleting(true);
    
    try {
      // Use an Edge Function to delete the user on the server
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id },
      });

      if (error) {
        throw new Error(`Erreur lors de l'appel de la fonction de suppression: ${error.message}`);
      }

      toast({
        title: "Compte supprimé",
        description: "Votre compte et toutes vos données ont été supprimés définitivement.",
      });
      
      // Sign out and redirect after a short delay
      setTimeout(async () => {
        await signOut();
        window.location.href = '/';
      }, 2000);
      
    } catch (error: any) {
      toast({
        title: "Erreur de suppression",
        description: error.message || "Impossible de supprimer le compte.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeletionDialog(false);
      setConfirmationEmail('');
    }
  };

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Avatar className="h-20 w-20">
                        <AvatarImage 
                          src={profile?.avatar_url || twitchUser?.profile_image_url} 
                          alt={profile?.twitch_display_name || 'User'} 
                        />
                        <AvatarFallback className="text-2xl">
                          {profile?.twitch_display_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {/* Live indicator for streamers */}
                      {profile?.role === 'streamer' && isLive && (
                        <div className="absolute -top-1 -right-1">
                          <Badge 
                            variant="default" 
                            className="bg-red-500 text-white text-xs px-2 py-1 animate-pulse"
                          >
                            🔴 LIVE
                          </Badge>
                        </div>
                      )}
                    </div>
                  <div>
                    <CardTitle className="text-2xl">
                      {profile?.twitch_display_name || 'Utilisateur'}
                    </CardTitle>
                    <p className="text-muted-foreground">
                      {profile?.twitch_username ? `@${profile.twitch_username}` : 'Pas de Twitch connecté'}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant={profile?.role === 'admin' ? 'default' : 
                                   profile?.role === 'streamer' ? 'secondary' : 'outline'}>
                        {profile?.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                        {profile?.role === 'admin' ? 'Administrateur' :
                         profile?.role === 'streamer' ? 'Streamer' : 'Viewer'}
                      </Badge>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Inscrit le {new Date(profile?.created_at || '').toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Twitch Connection */}
          {!profile?.twitch_id && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Connexion Twitch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Connectez votre compte Twitch pour une expérience complète sur Pauvrathon.
                </p>
                <Button onClick={connectTwitch}>
                  Connecter Twitch
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Warning if streamer is live */}
          {profile?.role === 'streamer' && isLive && (
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="text-sm font-medium">
                    Vous êtes actuellement en live. Certaines actions (comme la suppression de compte) sont désactivées.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">0</p> {/* Remplacer par profile?.games_played ou similaire */}
                    <p className="text-xs text-muted-foreground">Parties jouées</p>
                  </div>
                  <Gamepad2 className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">0</p> {/* Remplacer par profile?.wins ou similaire */}
                    <p className="text-xs text-muted-foreground">Victoires</p>
                  </div>
                  <Trophy className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{formatTime(profile?.total_time_contributed || 0)}</p> {/* Remplacer par profile?.total_time_contributed ou similaire */}
                    <p className="text-xs text-muted-foreground">Temps contribué</p>
                  </div>
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Activité Récente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Star className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Aucune activité récente
                </h3>
                <p className="text-muted-foreground">
                  Participez à des pauvrathons pour voir votre historique ici !
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Role-specific Actions */}
          {profile?.role === 'viewer' && (
            <Card>
              <CardHeader>
                <CardTitle>Devenir Streamer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Vous souhaitez organiser votre propre pauvrathon ? Faites une demande pour devenir streamer !
                </p>
                <Button asChild>
                  <a href="/demande-streamer">Faire une demande</a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Account Deletion - Secure version */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Zone de Danger
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Supprimer définitivement votre compte et toutes vos données associées. 
                Cette action est <strong>irréversible</strong> et supprimera :
              </p>
              
              <ul className="list-disc list-inside text-sm text-muted-foreground mb-6 space-y-1">
                <li>Votre profil utilisateur et authentification</li>
                <li>Vos statistiques de jeu et contributions</li>
                <li>Vos demandes streamer (en attente ou traitées)</li>
                <li>Vos follows et abonnements</li>
                <li>Votre profil streamer (si applicable)</li>
                <li>Toutes vos données personnelles</li>
              </ul>
              
              <AlertDialog open={showDeletionDialog} onOpenChange={setShowDeletionDialog}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={isDeleting || (profile?.role === 'streamer' && isLive)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Suppression...' : 'Supprimer mon compte'}
                  </Button>
                </AlertDialogTrigger>
                
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center text-destructive">
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Confirmer la suppression
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <div className="text-center p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                        <p className="font-semibold text-destructive mb-2">
                          ⚠️ ATTENTION : Cette action est irréversible !
                        </p>
                        <p className="text-sm">
                          Toutes vos données seront définitivement perdues.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirm-email" className="text-sm font-medium">
                          Pour confirmer, tapez votre email exact :
                        </Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Email attendu : <code className="bg-muted px-1 rounded">{user?.email}</code>
                        </p>
                        <Input
                          id="confirm-email"
                          type="email"
                          placeholder={user?.email}
                          value={confirmationEmail}
                          onChange={(e) => setConfirmationEmail(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel onClick={() => {
                      setConfirmationEmail('');
                      setShowDeletionDialog(false);
                    }}>
                      Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      disabled={confirmationEmail !== user?.email || isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Suppression...
                        </>
                      ) : (
                        'Oui, supprimer définitivement'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              {profile?.role === 'streamer' && isLive && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Suppression désactivée pendant le live
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}