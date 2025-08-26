import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Users, Clock } from 'lucide-react';

export default function Following() {
  const { user } = useAuth();
  const [followedStreamers, setFollowedStreamers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    // TODO: Implement Twitch API call to get followed streamers
    // This would require a backend endpoint to handle Twitch API calls
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Mes Suivis</h1>
          <p className="text-muted-foreground">
            Vos streamers suivis et leur statut de subathon
          </p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-muted h-12 w-12" />
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-24" />
                      <div className="h-3 bg-muted rounded w-16" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-3 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : followedStreamers.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Aucun streamer suivi
            </h3>
            <p className="text-muted-foreground mb-6">
              Vous ne suivez aucun streamer pour le moment. Découvrez de nouveaux streamers !
            </p>
            <Button asChild>
              <a href="/decouverte">Découvrir des Streamers</a>
            </Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Fonctionnalité en développement
            </h3>
            <p className="text-muted-foreground">
              L'intégration avec l'API Twitch pour récupérer vos suivis est en cours de développement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}