import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Twitch, Search, Trophy, Play, Users, Gamepad2, Zap, Clock } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 rounded-3xl blur-xl" />
          <div className="relative z-10 p-12">
            <h1 className="text-6xl font-bold gradient-text mb-6 neon-glow-strong">
              Pauvrathon
            </h1>
            <p className="text-2xl text-muted-foreground mb-4">
              La plateforme communautaire pour les streamers et leurs communautés
            </p>
            <p className="text-lg text-muted-foreground/80 mb-8 max-w-2xl mx-auto">
              Participez aux mini-jeux interactifs, aidez vos streamers préférés à prolonger leur stream, 
              et découvrez une nouvelle façon de vivre l'expérience Twitch !
            </p>
            
            {!user ? (
              <div className="space-y-4">
                <Link to="/auth">
                  <Button size="lg" className="mr-4 neon-glow pulse-neon text-lg px-8 py-6">
                    <Twitch className="mr-2 h-6 w-6" />
                    Connexion Twitch
                  </Button>
                </Link>
                <Link to="/decouverte">
                  <Button variant="outline" size="lg" className="neon-border text-lg px-8 py-6">
                    <Search className="mr-2 h-6 w-6" />
                    Découvrir les Pauvrathons
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <Link to="/decouverte">
                  <Button size="lg" className="mr-4 neon-glow text-lg px-8 py-6">
                    <Search className="mr-2 h-6 w-6" />
                    Découvrir les Pauvrathons
                  </Button>
                </Link>
                <Link to="/suivis">
                  <Button variant="outline" size="lg" className="neon-border text-lg px-8 py-6">
                    <Trophy className="mr-2 h-6 w-6" />
                    Mes Suivis
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Features Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-6xl mx-auto">
          <Card className="neon-border glass-effect hover:scale-105 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-primary text-xl">
                <Search className="mr-3 h-6 w-6" />
                Découvrir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Explorez les streamers en Pauvrathon actif et découvrez de nouveaux contenus passionnants. 
                Trouvez votre prochaine communauté favorite !
              </p>
            </CardContent>
          </Card>

          <Card className="neon-border glass-effect hover:scale-105 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-accent text-xl">
                <Gamepad2 className="mr-3 h-6 w-6" />
                Participer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Participez aux mini-jeux interactifs et aidez vos streamers préférés à prolonger leur Pauvrathon. 
                Chaque clic compte !
              </p>
            </CardContent>
          </Card>

          <Card className="neon-border glass-effect hover:scale-105 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-secondary text-xl">
                <Twitch className="mr-3 h-6 w-6" />
                Streamer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Créez votre propre expérience de Pauvrathon avec des mini-jeux personnalisables et 
                engagez votre communauté comme jamais !
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-8 gradient-text">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold group-hover:scale-110 transition-transform neon-glow">
                1
              </div>
              <h3 className="font-semibold mb-3 text-lg">Connectez-vous</h3>
              <p className="text-muted-foreground leading-relaxed">
                Utilisez votre compte Twitch pour accéder à la plateforme et découvrir l'univers Pauvrathon
              </p>
            </div>
            <div className="text-center group">
              <div className="bg-gradient-to-br from-accent to-accent/60 text-accent-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold group-hover:scale-110 transition-transform neon-glow">
                2
              </div>
              <h3 className="font-semibold mb-3 text-lg">Découvrez</h3>
              <p className="text-muted-foreground leading-relaxed">
                Explorez les streamers en Pauvrathon actif et choisissez celui que vous souhaitez soutenir
              </p>
            </div>
            <div className="text-center group">
              <div className="bg-gradient-to-br from-secondary to-secondary/60 text-secondary-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold group-hover:scale-110 transition-transform neon-glow">
                3
              </div>
              <h3 className="font-semibold mb-3 text-lg">Participez</h3>
              <p className="text-muted-foreground leading-relaxed">
                Cliquez pour faire avancer la barre de progression et déclenchez des mini-jeux excitants
              </p>
            </div>
            <div className="text-center group">
              <div className="bg-gradient-to-br from-primary to-accent rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold group-hover:scale-110 transition-transform neon-glow text-primary-foreground">
                4
              </div>
              <h3 className="font-semibold mb-3 text-lg">Contribuez</h3>
              <p className="text-muted-foreground leading-relaxed">
                Gagnez aux mini-jeux pour ajouter du temps et aidez à prolonger le Pauvrathon !
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-2xl p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold gradient-text mb-4">L'expérience Pauvrathon</h2>
            <p className="text-muted-foreground text-lg">Une nouvelle façon d'interagir avec vos streamers préférés</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Communauté</h3>
              <p className="text-muted-foreground">
                Rejoignez une communauté active et participez ensemble aux défis des streamers
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Zap className="h-12 w-12 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Interactivité</h3>
              <p className="text-muted-foreground">
                Chaque clic et chaque jeu gagné a un impact direct sur le stream
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Clock className="h-12 w-12 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Temps réel</h3>
              <p className="text-muted-foreground">
                Suivez en temps réel l'évolution du Pauvrathon et l'impact de vos actions
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="inline-block p-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl backdrop-blur-sm border border-primary/20">
            <h2 className="text-3xl font-bold mb-4 gradient-text">Prêt à rejoindre l'aventure ?</h2>
            <p className="text-muted-foreground mb-6 text-lg max-w-md mx-auto">
              Découvrez dès maintenant les Pauvrathons en cours et commencez à participer !
            </p>
            <Link to={user ? "/decouverte" : "/auth"}>
              <Button size="lg" className="neon-glow text-lg px-8 py-6">
                <Play className="mr-2 h-6 w-6" />
                {user ? "Découvrir les Pauvrathons" : "Commencer maintenant"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}