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
  Play,
  TrendingUp
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
        <section className="relative py-20 lg:py-32 min-h-screen flex items-center">
          <ResponsiveLayout>
            <div className={`text-center transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              {/* Badge d'intro */}
              <div className="mb-8">
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 text-sm font-medium animate-pulse">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Révolutionnez votre streaming
                </Badge>
              </div>

              {/* Titre principal */}
              <div className="mb-8">
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-4 bg-gradient-to-r from-white via-purple-200 to-pink-300 bg-clip-text text-transparent leading-tight">
                  Pauvrathon
                </h1>
                <div className="flex justify-center">
                  <div className="h-2 w-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                </div>
              </div>
              
              <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
                La plateforme interactive révolutionnaire où{" "}
                <span className="text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text font-semibold">
                  vos clics prolongent le stream
                </span>
                {" "}! Participez aux mini-jeux et faites durer l'aventure de vos streamers préférés.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                {user ? (
                  <Link to="/decouverte" className="group">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105 transition-all duration-300">
                      <Users className="mr-2 h-5 w-5" />
                      Découvrir les Pauvrathons
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
                
                <Button variant="outline" size="lg" className="border-2 border-purple-400 text-purple-300 hover:bg-purple-400 hover:text-white px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300">
                  <Play className="mr-2 h-5 w-5" />
                  Voir la démo
                </Button>
              </div>

              {/* Stats rapides */}
              <div className="flex flex-wrap justify-center gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-purple-400">500+</div>
                  <div className="text-sm text-gray-400">Streamers actifs</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-pink-400">10k+</div>
                  <div className="text-sm text-gray-400">Heures ajoutées</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-400">50k+</div>
                  <div className="text-sm text-gray-400">Joueurs</div>
                </div>
              </div>
            </div>
          </ResponsiveLayout>
        </section>

        {/* Features Section */}
        <section className="py-24 relative">
          <ResponsiveLayout>
            <div className="text-center mb-20">
              <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 text-sm font-medium mb-6">
                Comment ça marche
              </Badge>
              <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Simple comme un clic
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Trois étapes pour révolutionner votre expérience de streaming
              </p>
            </div>
            
            <ResponsiveGrid cols={3}>
              <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/30 border-purple-500/30 backdrop-blur-xl hover:border-purple-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 group">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">Découvrir</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-300 text-lg leading-relaxed">
                    Explorez une bibliothèque infinie de streamers en live et découvrez leurs Pauvrathons uniques.
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
                    Cliquez, jouez et maîtrisez des mini-jeux addictifs pour débloquer du temps de stream bonus.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-900/50 to-orange-900/30 border-pink-500/30 backdrop-blur-xl hover:border-pink-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/20 group">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Trophy className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">Dominer</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-300 text-lg leading-relaxed">
                    Créez votre empire streaming, configurez vos défis et regardez votre communauté grandir.
                  </CardDescription>
                </CardContent>
              </Card>
            </ResponsiveGrid>
          </ResponsiveLayout>
        </section>

        {/* Process Section */}
        <section className="py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-sm"></div>
          <ResponsiveLayout>
            <div className="text-center mb-20 relative">
              <Badge className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 text-sm font-medium mb-6">
                Processus simplifié
              </Badge>
              <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Votre parcours en 4 étapes
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Ligne de connexion */}
              <div className="hidden lg:block absolute top-16 left-1/2 transform -translate-x-1/2 w-full h-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500"></div>
              
              {[
                { num: "1", title: "Se connecter", desc: "Connexion Twitch sécurisée en un clic", color: "from-purple-500 to-purple-600", icon: Zap },
                { num: "2", title: "Explorer", desc: "Découvrez des streamers passionnants", color: "from-blue-500 to-blue-600", icon: Target },
                { num: "3", title: "Jouer", desc: "Mini-jeux addictifs et gratifiants", color: "from-pink-500 to-pink-600", icon: Gamepad2 },
                { num: "4", title: "Impacter", desc: "Prolongez et enrichissez l'expérience", color: "from-orange-500 to-orange-600", icon: TrendingUp }
              ].map(({ num, title, desc, color, icon: Icon }, index) => (
                <div key={index} className="text-center relative">
                  <div className={`mx-auto w-24 h-24 bg-gradient-to-br ${color} rounded-full flex items-center justify-center mb-6 text-2xl font-bold text-white shadow-2xl border-4 border-white/20 hover:scale-110 transition-transform duration-300 relative z-10`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-white">{title}</h3>
                  <p className="text-gray-300 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </ResponsiveLayout>
        </section>

        {/* Impact Section */}
        <section className="py-24">
          <ResponsiveLayout>
            <div className="grid lg:grid-cols-3 gap-12 items-center">
              <div className="lg:col-span-2">
                <Badge className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 py-2 text-sm font-medium mb-6">
                  Impact communautaire
                </Badge>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Chaque clic compte,<br />chaque jeu transforme
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed mb-8">
                  Rejoignez une révolution interactive où votre participation directe façonne l'avenir du streaming. 
                  Votre engagement ne se contente pas de divertir : il crée de véritables moments de communauté.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Temps réel</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-400">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span>Impact mesurable</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-400">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <span>Communauté active</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                {[
                  { icon: Users, title: "Communauté", value: "50k+", desc: "Joueurs actifs chaque jour", color: "text-purple-400" },
                  { icon: Timer, title: "Temps ajouté", value: "10k", desc: "Heures de stream prolongées", color: "text-pink-400" },
                  { icon: Gamepad2, title: "Mini-jeux", value: "100+", desc: "Défis uniques disponibles", color: "text-blue-400" }
                ].map(({ icon: Icon, title, value, desc, color }, index) => (
                  <div key={index} className="bg-gradient-to-r from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <Icon className={`h-12 w-12 ${color}`} />
                      <div>
                        <div className={`text-2xl font-bold ${color}`}>{value}</div>
                        <div className="text-white font-semibold">{title}</div>
                        <div className="text-sm text-gray-400">{desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ResponsiveLayout>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-orange-900/30"></div>
          <ResponsiveLayout>
            <div className="text-center relative">
              <div className="mb-8">
                <Badge className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-4 py-2 text-sm font-medium animate-pulse">
                  <Star className="w-4 h-4 mr-2" />
                  Rejoignez la révolution
                </Badge>
              </div>
              
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-300 bg-clip-text text-transparent">
                L'aventure commence maintenant
              </h2>
              
              <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                Ne regardez plus passivement. <span className="text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text font-bold">Participez, influencez, transformez</span> l'expérience streaming avec Pauvrathon.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                {user ? (
                  <Link to="/decouverte" className="group">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-12 py-6 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-purple-500/30 transform hover:scale-105 transition-all duration-300">
                      <Sparkles className="mr-3 h-6 w-6" />
                      Découvrir maintenant
                      <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/auth" className="group">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-12 py-6 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-purple-500/30 transform hover:scale-105 transition-all duration-300">
                      <Zap className="mr-3 h-6 w-6" />
                      Commencer l'aventure
                      <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                    </Button>
                  </Link>
                )}
                
                <p className="text-sm text-gray-400 sm:hidden">
                  Gratuit • Pas d'inscription complexe • Résultats instantanés
                </p>
              </div>
              
              <p className="hidden sm:block text-sm text-gray-400 mt-6">
                Gratuit • Pas d'inscription complexe • Résultats instantanés
              </p>
            </div>
          </ResponsiveLayout>
        </section>
      </main>
    </div>
  );
}