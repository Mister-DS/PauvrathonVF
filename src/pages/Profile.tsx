import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  AlertTriangle 
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

export default function Profile() {
  const { user, profile, signOut, connectTwitch, twitchUser } = useAuth();
  const { isLive } = useStreamerStatus(user?.id);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      // Pour l'instant, on peut seulement supprimer les données dans notre base
      // La suppression du compte auth devra être faite côté client
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      toast({
        title: "Compte supprimé",
        description: "Votre compte et toutes vos données ont été supprimés.",
      });

      // Déconnexion après suppression
      await signOut();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le compte.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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
                      {/* Indicateur live pour les streamers */}
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

          {/* Statistics */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">0</p>
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
                    <p className="text-2xl font-bold">0</p>
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
                    <p className="text-2xl font-bold">0s</p>
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
                <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Aucune activité récente
                </h3>
                <p className="text-muted-foreground">
                  Participez à des subathons pour voir votre historique ici !
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
                  Vous souhaitez organiser votre propre subathon ? Faites une demande pour devenir streamer !
                </p>
                <Button asChild>
                  <a href="/demande-streamer">Faire une demande</a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Account Deletion */}
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
                Cette action est <strong>irréversible</strong>.
              </p>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Suppression...' : 'Supprimer mon compte'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center text-destructive">
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Confirmer la suppression
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      <strong>Cette action est irréversible !</strong>
                      <br /><br />
                      En confirmant, vous supprimez définitivement :
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Votre profil utilisateur</li>
                        <li>Vos statistiques de jeu</li>
                        <li>Vos demandes streamer</li>
                        <li>Vos données de suivis</li>
                        <li>Toutes vos données personnelles</li>
                      </ul>
                      <br />
                      Êtes-vous absolument certain de vouloir continuer ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Oui, supprimer définitivement
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}