import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navigation } from '@/components/Navigation';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { SubscriptionBadge } from '@/components/SubscriptionBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useStreamerStatus } from '@/hooks/useStreamerStatus';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Calendar,
  LogOut,
  AlertTriangle,
  Shield,
  Star,
  Heart
} from 'lucide-react';

export default function Profile() {
  const { user, profile, signOut, connectTwitch, twitchUser } = useAuth();
  const { isLive } = useStreamerStatus(user?.id);
  const { checkSubscription } = useSubscription();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Handle checkout success/cancellation
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast({
        title: "Abonnement activé !",
        description: "Merci pour votre abonnement. Votre badge sera visible sous peu.",
      });
      // Refresh subscription status
      checkSubscription();
    } else if (checkout === 'cancelled') {
      toast({
        title: "Abonnement annulé",
        description: "Vous pouvez réessayer à tout moment.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast, checkSubscription]);

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
                    <div className="flex items-center">
                      <CardTitle className="text-2xl">
                        {profile?.twitch_display_name || 'Utilisateur'}
                      </CardTitle>
                      <SubscriptionBadge />
                    </div>
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
                    Vous êtes actuellement en live. Certaines actions peuvent être désactivées.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Subscription Management */}
          <SubscriptionCard />

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

           {/* Support the Developer */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center">
                 <Heart className="mr-2 h-5 w-5 text-red-500" />
                 Soutenir le Développeur
               </CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-muted-foreground mb-4">
                 Pauvrathon vous plaît ? Soutenez le développement du projet !
               </p>
               <Button 
                 onClick={() => window.open(`https://www.paypal.com/donate/?business=dierickxsimon198%40gmail.com&no_recurring=0&currency_code=EUR`, '_blank')}
                 className="w-full sm:w-auto"
               >
                 <Heart className="mr-2 h-4 w-4" />
                 Faire un don PayPal
               </Button>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}