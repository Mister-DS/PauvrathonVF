import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface DynamicGameProps {
  gameCode: string;
  gameName: string;
  onWin: (score: number) => void;
  onLose: () => void;
  attempts?: number;
  maxAttempts?: number;
}

export function DynamicGame({ 
  gameCode, 
  gameName, 
  onWin, 
  onLose, 
  attempts = 0, 
  maxAttempts = 12 
}: DynamicGameProps) {
  const [error, setError] = useState<string | null>(null);
  const [gameKey, setGameKey] = useState(0); // Pour forcer le re-render

  // Créer un environnement sécurisé pour l'exécution du code
  const GameComponent = useMemo(() => {
    try {
      setError(null);
      
      if (!gameCode || !gameCode.trim()) {
        throw new Error("Code de jeu vide");
      }

      // Création d'un contexte sécurisé avec les dépendances nécessaires
      const secureContext = {
        React,
        useState,
        useEffect,
        useMemo,
        Button,
        Input,
        Card,
        CardContent,
        CardHeader,
        CardTitle,
        Alert,
        AlertDescription,
        // Fonctions utilitaires
        Math,
        parseInt,
        parseFloat,
        Array,
        Object,
        JSON,
        String,
        Number,
        Boolean,
        Date,
        console: {
          log: (...args: any[]) => console.log('[DynamicGame]', ...args),
          error: (...args: any[]) => console.error('[DynamicGame]', ...args),
          warn: (...args: any[]) => console.warn('[DynamicGame]', ...args)
        }
      };

      // Créer une fonction qui exécute le code dans un contexte contrôlé
      const createGameFunction = new Function(
        ...Object.keys(secureContext),
        `
        "use strict";
        try {
          ${gameCode}
        } catch (error) {
          throw new Error("Erreur dans le code du jeu: " + error.message);
        }
        `
      );

      // Exécuter la fonction avec le contexte sécurisé
      const GameFunction = createGameFunction(...Object.values(secureContext));

      // Vérifier que le code retourne bien une fonction/composant
      if (typeof GameFunction !== 'function') {
        throw new Error("Le code doit retourner une fonction de composant React");
      }

      // Créer un wrapper qui passe les props nécessaires
      return function WrappedGame(props: any) {
        try {
          return React.createElement(GameFunction, {
            ...props,
            onWin,
            onLose,
            attempts,
            maxAttempts
          });
        } catch (renderError: any) {
          console.error('Erreur de rendu du jeu dynamique:', renderError);
          return React.createElement(Alert, { variant: "destructive" },
            React.createElement(AlertTriangle, { className: "h-4 w-4" }),
            React.createElement(AlertDescription, null, 
              `Erreur de rendu: ${renderError.message}`
            )
          );
        }
      };

    } catch (executionError: any) {
      console.error('Erreur d\'exécution du jeu dynamique:', executionError);
      setError(executionError.message);
      
      // Retourner un composant d'erreur
      return function ErrorComponent() {
        return React.createElement(Alert, { variant: "destructive" },
          React.createElement(AlertTriangle, { className: "h-4 w-4" }),
          React.createElement(AlertDescription, null, executionError.message)
        );
      };
    }
  }, [gameCode, gameKey, onWin, onLose, attempts, maxAttempts]);

  const handleRestart = () => {
    setGameKey(prev => prev + 1);
    setError(null);
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Erreur - {gameName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleRestart} variant="outline" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div key={gameKey}>
      <GameComponent />
    </div>
  );
}

// Hook pour charger les jeux depuis la base de données
export function useDynamicGames() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = async () => {
    try {
      setLoading(true);
      setError(null);

      // Import dynamique pour éviter les erreurs côté serveur
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error: fetchError } = await supabase
        .from('minigames')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setGames(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des jeux:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const getRandomGame = () => {
    if (games.length === 0) return null;
    return games[Math.floor(Math.random() * games.length)];
  };

  const getGameByName = (name: string) => {
    return games.find(game => game.name === name);
  };

  return {
    games,
    loading,
    error,
    refetch: fetchGames,
    getRandomGame,
    getGameByName
  };
}