import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Twitch, Search, Trophy } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold gradient-text mb-4 neon-glow-strong">
            Pauvrathon
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            La plateforme communautaire pour les subathons Twitch
          </p>
          
          {!user ? (
            <div className="space-y-4">
              <Link to="/auth">
                <Button size="lg" className="mr-4 neon-glow pulse-neon">
                  <Twitch className="mr-2 h-5 w-5" />
                  Connexion Twitch
                </Button>
              </Link>
              <Link to="/decouverte">
                <Button variant="outline" size="lg" className="neon-border">
                  <Search className="mr-2 h-5 w-5" />
                  Découverte
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <Link to="/decouverte">
                <Button size="lg" className="mr-4 neon-glow">
                  <Search className="mr-2 h-5 w-5" />
                  Découverte
                </Button>
              </Link>
              <Link to="/suivis">
                <Button variant="outline" size="lg" className="neon-border">
                  <Trophy className="mr-2 h-5 w-5" />
                  Mes Suivis
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="neon-border glass-effect">
            <CardHeader>
              <CardTitle className="flex items-center text-primary">
                <Search className="mr-2 h-5 w-5" />
                Découvrir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Explorez les streamers en subathon et découvrez de nouveaux contenus passionnants.
              </p>
            </CardContent>
          </Card>

          <Card className="neon-border glass-effect">
            <CardHeader>
              <CardTitle className="flex items-center text-accent">
                <Trophy className="mr-2 h-5 w-5" />
                Participer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Participez aux mini-jeux et aidez vos streamers préférés à prolonger leur subathon.
              </p>
            </CardContent>
          </Card>

          <Card className="neon-border glass-effect">
            <CardHeader>
              <CardTitle className="flex items-center text-primary">
                <Twitch className="mr-2 h-5 w-5" />
                Streamer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Créez votre propre expérience de subathon avec des mini-jeux personnalisables.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold mb-4">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Connectez-vous</h3>
              <p className="text-sm text-muted-foreground">
                Utilisez votre compte Twitch pour vous connecter
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Découvrez</h3>
              <p className="text-sm text-muted-foreground">
                Explorez les streamers en subathon actif
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Participez</h3>
              <p className="text-sm text-muted-foreground">
                Cliquez et jouez aux mini-jeux
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                4
              </div>
              <h3 className="font-semibold mb-2">Contribuez</h3>
              <p className="text-sm text-muted-foreground">
                Aidez à prolonger le subathon !
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}