import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { ResponsiveLayout, ResponsiveGrid, ResponsiveStack } from "@/components/ResponsiveLayout";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Users, 
  Gamepad, 
  Zap, 
  Trophy, 
  Timer, 
  Target,
  Gamepad2,
  Clock,
  MousePointer,
  Star,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Play
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
          style={{
            left: mousePosition.x * 0.02 + 'px',
            top: mousePosition.y * 0.02 + 'px',
          }}
        />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl animate-bounce" style={{animationDuration: '3s'}} />
        <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-pink-500/10 rounded-full blur-xl animate-pulse" style={{animationDelay: '1s'}} />
      </div>

      <Navigation />
      
      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="relative py-16 lg:py-24 min-h-screen flex items-center">
          <ResponsiveLayout>
            <div className={`text-center transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              {/* Badge d'intro */}
              <div className="mb-6">
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 text-sm font-medium animate-pulse">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Nouvelle génération de streaming interactif
                </Badge>
              </div>

              {/* Titre principal */}
              <div className="mb-6">
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-4 bg-gradient-to-r from-white via-purple-200 to-pink-300 bg-clip-text text-transparent leading-tight">
                  Pauvrathon
                </h1>
                <div className="flex justify-center">
                  <div className="h-2 w-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                </div>
              </div>
              
              <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
                La plateforme interactive où{" "}
                <span className="text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text font-semibold">
                  vos actions prolongent le stream
                </span>
                {" "}! Participez aux mini-jeux et influencez directement la durée des diffusions de vos streamers préférés.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                {user ? (
                  <Link to="/decouverte" className="group">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105 transition-all duration-300">
                      <Users className="mr-2 h-5 w-5" />
                      Découvrir les Streamers
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/auth" className="group">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105 transition-all duration-300">
                      <Zap className="mr-2 h-5 w-5" />
                      Connexion Twitch
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                )}
              </div>

              {/* Description du concept */}
              <div className="max-w-2xl mx-auto">
                <p className="text-gray-400 text-lg">
                  Un concept unique : plus la communauté participe aux défis, plus le stream dure longtemps. 
                  Chaque mini-jeu réussi ajoute du temps au compteur en direct.
                </p>
              </div>
            </div>
          </ResponsiveLayout>
        </section>

        {/* Features Section */}
        <section className="py-16 relative">
          <ResponsiveLayout>
            <div className="text-center mb-16">
              <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 text-sm font-medium mb-6">
                Comment ça marche
              </Badge>
              <h2 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Le principe est simple
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Une nouvelle façon d'interagir avec vos streamers préférés
              </p>
            </div>
            
            <ResponsiveGrid cols={3}>
              <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/30 border-purple-500/30 backdrop-blur-xl hover:border-purple-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 group">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Play className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">Regarder</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-300 text-lg leading-relaxed">
                    Découvrez des streamers passionnés qui utilisent Pauvrathon pour créer des expériences uniques.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/30 border-blue-500/30 backdrop-blur-xl hover:border-blue-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 group">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Gamepad className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">Participer</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-300 text-lg leading-relaxed">
                    Jouez aux mini-jeux disponibles sur la page du streamer pour ajouter du temps au compteur.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-900/50 to-orange-900/30 border-pink-500/30 backdrop-blur-xl hover:border-pink-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/20 group">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Timer className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">Prolonger</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-300 text-lg leading-relaxed">
                    Chaque succès ajoute du temps au stream en direct. Plus la communauté joue, plus ça dure !
                  </CardDescription>
                </CardContent>
              </Card>
            </ResponsiveGrid>
          </ResponsiveLayout>
        </section>

        {/* Mini-games Section */}
        <section className="py-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-sm"></div>
          <ResponsiveLayout>
            <div className="text-center mb-16 relative">
              <Badge className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 text-sm font-medium mb-6">
                Mini-jeux disponibles
              </Badge>
              <h2 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Des défis pour tous
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Chaque jeu complété ajoute du temps précieux au stream
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Nombre Mystère", desc: "Devinez le bon nombre", icon: Target, color: "from-purple-500 to-purple-600" },
                { title: "Pendu", desc: "Trouvez le mot caché", icon: Gamepad2, color: "from-blue-500 to-blue-600" },
                { title: "Mémoire", desc: "Mémorisez les séquences", icon: Star, color: "from-pink-500 to-pink-600" },
                { title: "Réflexes", desc: "Testez votre rapidité", icon: Zap, color: "from-orange-500 to-orange-600" },
                { title: "Simon", desc: "Répétez les motifs", icon: MousePointer, color: "from-green-500 to-green-600" },
                { title: "Snake", desc: "Jeu classique revisité", icon: TrendingUp, color: "from-teal-500 to-teal-600" },
                { title: "Tic-Tac-Toe", desc: "Stratégie pure", icon: Trophy, color: "from-red-500 to-red-600" },
                { title: "Plus à venir...", desc: "De nouveaux défis bientôt", icon: Sparkles, color: "from-gray-500 to-gray-600" }
              ].map(({ title, desc, icon: Icon, color }, index) => (
                <Card key={index} className="bg-gradient-to-br from-gray-900/80 to-gray-800/60 border-gray-700/50 backdrop-blur-xl hover:border-gray-600/50 transition-all duration-300 hover:scale-105">
                  <CardHeader className="text-center pb-2">
                    <div className={`mx-auto w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-white">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center pt-0">
                    <CardDescription className="text-gray-400 text-sm">
                      {desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ResponsiveLayout>
        </section>

        {/* For Streamers Section */}
        <section className="py-16">
          <ResponsiveLayout>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 py-2 text-sm font-medium mb-6">
                  Pour les streamers
                </Badge>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Créez votre propre<br />expérience Pauvrathon
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed mb-8">
                  Configurez vos propres règles, choisissez quels mini-jeux activer, et regardez votre communauté 
                  s'engager comme jamais. Chaque victoire de vos viewers ajoute du temps à votre stream en direct.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                    <span className="text-gray-300">Dashboard personnalisé pour configurer vos règles</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                    <span className="text-gray-300">Overlay OBS intégré pour afficher le timer en direct</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                    <span className="text-gray-300">Système de badges pour récompenser votre communauté</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <Card className="bg-gradient-to-r from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
                  <div className="flex items-center gap-4">
                    <Clock className="h-12 w-12 text-purple-400" />
                    <div>
                      <div className="text-white font-semibold">Timer en temps réel</div>
                      <div className="text-sm text-gray-400">Affichage dynamique du temps restant</div>
                    </div>
                  </div>
                </Card>
                <Card className="bg-gradient-to-r from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
                  <div className="flex items-center gap-4">
                    <Gamepad2 className="h-12 w-12 text-pink-400" />
                    <div>
                      <div className="text-white font-semibold">Mini-jeux configurables</div>
                      <div className="text-sm text-gray-400">Choisissez les défis pour votre audience</div>
                    </div>
                  </div>
                </Card>
                <Card className="bg-gradient-to-r from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
                  <div className="flex items-center gap-4">
                    <Users className="h-12 w-12 text-blue-400" />
                    <div>
                      <div className="text-white font-semibold">Engagement communautaire</div>
                      <div className="text-sm text-gray-400">Participation active de vos viewers</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </ResponsiveLayout>
        </section>

        {/* CTA Section */}
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-orange-900/30"></div>
          <ResponsiveLayout>
            <div className="text-center relative">
              <div className="mb-8">
                <Badge className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-4 py-2 text-sm font-medium animate-pulse">
                  <Star className="w-4 h-4 mr-2" />
                  Prêt à commencer ?
                </Badge>
              </div>
              
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-300 bg-clip-text text-transparent">
                L'aventure commence maintenant
              </h2>
              
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                Rejoignez la nouvelle génération de streaming interactif. <span className="text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text font-bold">Participez, influencez, prolongez</span> les streams de vos créateurs préférés.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                {user ? (
                  <Link to="/decouverte" className="group">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-12 py-6 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-purple-500/30 transform hover:scale-105 transition-all duration-300">
                      <Sparkles className="mr-3 h-6 w-6" />
                      Découvrir les streamers
                      <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/auth" className="group">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-12 py-6 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-purple-500/30 transform hover:scale-105 transition-all duration-300">
                      <Zap className="mr-3 h-6 w-6" />
                      Commencer maintenant
                      <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                    </Button>
                  </Link>
                )}
              </div>
              
              <p className="text-sm text-gray-400 mt-6">
                Gratuit • Connexion Twitch simple • Résultats instantanés
              </p>
            </div>
          </ResponsiveLayout>
        </section>
      </main>
    </div>
  );
}