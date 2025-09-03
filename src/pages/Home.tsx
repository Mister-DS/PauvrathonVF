import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { ResponsiveLayout, ResponsiveGrid, ResponsiveStack } from "@/components/ResponsiveLayout";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Users, 
  GamepadIcon, 
  Zap, 
  Trophy, 
  Timer, 
  Target,
  Gamepad2,
  Clock,
  MousePointer,
  Star
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-12 sm:py-16 lg:py-24 bg-gradient-to-br from-background via-background/95 to-primary/5">
          <ResponsiveLayout>
            <div className="text-center">
              <h1 className="text-4xl sm:text-6xl lg:text-8xl font-bold mb-4 sm:mb-6 gradient-text animate-fade-in">
                Pauvrathon
              </h1>
              <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
                La plateforme interactive où vos clics et vos compétences prolongent le stream ! 
                Participez aux mini-jeux, gagnez du temps pour vos streamers préférés.
              </p>
              
              <ResponsiveStack direction="horizontal" spacing="md" className="justify-center">
                {user ? (
                  <Link to="/decouverte" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 neon-glow hover:neon-glow-strong transition-all duration-300">
                      <Users className="mr-2 h-4 sm:h-5 w-4 sm:w-5" />
                      Découvrir les Pauvrathons
                    </Button>
                  </Link>
                ) : (
                  <Link to="/auth" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 neon-glow hover:neon-glow-strong transition-all duration-300">
                      <Zap className="mr-2 h-4 sm:h-5 w-4 sm:w-5" />
                      Connexion Twitch
                    </Button>
                  </Link>
                )}
              </ResponsiveStack>
            </div>
          </ResponsiveLayout>
        </section>

        {/* Features Section */}
        <section className="py-12 sm:py-16 lg:py-20">
          <ResponsiveLayout>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12 lg:mb-16 gradient-text">
              Comment ça fonctionne ?
            </h2>
            
            <ResponsiveGrid cols={3}>
              <Card className="glass-effect neon-border hover:neon-glow transition-all duration-300 h-full">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 sm:w-16 h-12 sm:h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                    <Users className="h-6 sm:h-8 w-6 sm:w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl">Découvrir</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-sm sm:text-base leading-relaxed">
                    Explorez les streamers en live, découvrez leurs Pauvrathons et choisissez celui qui vous intéresse le plus.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="glass-effect neon-border hover:neon-glow transition-all duration-300 h-full">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 sm:w-16 h-12 sm:h-16 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                    <GamepadIcon className="h-6 sm:h-8 w-6 sm:w-8 text-accent" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl">Participer</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-sm sm:text-base leading-relaxed">
                    Cliquez pour atteindre l'objectif et débloquez des mini-jeux. Réussissez-les pour ajouter du temps au stream !
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="glass-effect neon-border hover:neon-glow transition-all duration-300 h-full">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 sm:w-16 h-12 sm:h-16 bg-secondary/20 rounded-full flex items-center justify-center mb-4">
                    <Trophy className="h-6 sm:h-8 w-6 sm:w-8 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl">Streamer</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-sm sm:text-base leading-relaxed">
                    Créez votre propre Pauvrathon, configurez vos mini-jeux et laissez votre communauté prolonger votre stream.
                  </CardDescription>
                </CardContent>
              </Card>
            </ResponsiveGrid>
          </ResponsiveLayout>
        </section>

        {/* How it Works Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-muted/20">
          <ResponsiveLayout>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12 lg:mb-16 gradient-text">
              Étapes pour commencer
            </h2>
            
            <ResponsiveGrid cols={4}>
              <div className="text-center">
                <div className="mx-auto w-16 sm:w-20 h-16 sm:h-20 bg-primary rounded-full flex items-center justify-center mb-4 text-xl sm:text-2xl font-bold text-primary-foreground">
                  1
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Se connecter</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Connectez-vous avec votre compte Twitch pour accéder à la plateforme
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-16 sm:w-20 h-16 sm:h-20 bg-accent rounded-full flex items-center justify-center mb-4 text-xl sm:text-2xl font-bold text-accent-foreground">
                  2
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Découvrir</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Parcourez les streamers en live et leurs Pauvrathons actifs
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-16 sm:w-20 h-16 sm:h-20 bg-secondary rounded-full flex items-center justify-center mb-4 text-xl sm:text-2xl font-bold text-secondary-foreground">
                  3
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Participer</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Cliquez et jouez aux mini-jeux pour faire gagner du temps au streamer
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-16 sm:w-20 h-16 sm:h-20 bg-muted rounded-full flex items-center justify-center mb-4 text-xl sm:text-2xl font-bold text-muted-foreground">
                  4
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Contribuer</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Votre réussite prolonge le stream et fait grandir la communauté
                </p>
              </div>
            </ResponsiveGrid>
          </ResponsiveLayout>
        </section>

        {/* Stats Section */}
        <section className="py-12 sm:py-16 lg:py-20">
          <ResponsiveLayout>
            <ResponsiveGrid cols={3}>
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center mb-4">
                  <Users className="h-10 sm:h-12 w-10 sm:w-12 text-primary" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-primary">Communauté</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Rejoignez une communauté active et participez ensemble à l'aventure Pauvrathon
                </p>
              </div>

              <div className="text-center space-y-2">
                <div className="flex items-center justify-center mb-4">
                  <Gamepad2 className="h-10 sm:h-12 w-10 sm:w-12 text-accent" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-accent">Interactif</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Des mini-jeux variés et amusants qui changent selon les préférences du streamer
                </p>
              </div>

              <div className="text-center space-y-2">
                <div className="flex items-center justify-center mb-4">
                  <Timer className="h-10 sm:h-12 w-10 sm:w-12 text-secondary-foreground" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-secondary-foreground">Temps réel</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Voyez l'impact de vos actions instantanément sur le temps de stream
                </p>
              </div>
            </ResponsiveGrid>
          </ResponsiveLayout>
        </section>

        {/* CTA Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-primary/10 to-accent/10">
          <ResponsiveLayout>
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 gradient-text">
                Prêt à rejoindre l'aventure ?
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
                Découvrez le pouvoir de la communauté et prolongez vos streams préférés !
              </p>
              
              {user ? (
                <Link to="/decouverte" className="inline-block">
                  <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 neon-glow hover:neon-glow-strong transition-all duration-300">
                    <Star className="mr-2 h-4 sm:h-5 w-4 sm:w-5" />
                    Commencer maintenant
                  </Button>
                </Link>
              ) : (
                <Link to="/auth" className="inline-block">
                  <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 neon-glow hover:neon-glow-strong transition-all duration-300">
                    <Zap className="mr-2 h-4 sm:h-5 w-4 sm:w-5" />
                    Se connecter avec Twitch
                  </Button>
                </Link>
              )}
            </div>
          </ResponsiveLayout>
        </section>
      </main>
    </div>
  );
}