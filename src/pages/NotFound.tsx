import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { Home, ArrowLeft, Search, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <Card className="max-w-2xl w-full text-center">
          <CardContent className="pt-8 pb-8">
            {/* Icône et numéro 404 */}
            <div className="mb-8">
              <div className="relative mx-auto w-32 h-32 mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 opacity-20 animate-pulse"></div>
                <div className="relative flex items-center justify-center w-full h-full">
                  <AlertTriangle className="w-16 h-16 text-destructive" />
                </div>
              </div>
              
              <h1 className="text-8xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text mb-4">
                404
              </h1>
            </div>

            {/* Contenu principal */}
            <div className="space-y-4 mb-8">
              <h2 className="text-2xl font-semibold">
                Page introuvable
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                La page que vous recherchez n'existe pas ou a été déplacée. 
                Vérifiez l'URL ou retournez à l'accueil.
              </p>
              
              {/* Affichage du chemin demandé */}
              <div className="bg-muted/50 rounded-lg p-3 mx-auto max-w-md">
                <p className="text-sm text-muted-foreground">
                  Chemin demandé : 
                  <code className="ml-2 bg-muted px-2 py-1 rounded text-xs">
                    {location.pathname}
                  </code>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild className="neon-glow">
                <a href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Retour à l'accueil
                </a>
              </Button>
              
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Page précédente
              </Button>
              
              <Button variant="ghost" asChild>
                <a href="/discovery">
                  <Search className="mr-2 h-4 w-4" />
                  Découvrir les streams
                </a>
              </Button>
            </div>

            {/* Suggestions */}
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="font-medium mb-4">Pages populaires :</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="link" size="sm" asChild>
                  <a href="/discovery">Découverte</a>
                </Button>
                <Button variant="link" size="sm" asChild>
                  <a href="/demande-streamer">Devenir Streamer</a>
                </Button>
                <Button variant="link" size="sm" asChild>
                  <a href="/auth">Se connecter</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;