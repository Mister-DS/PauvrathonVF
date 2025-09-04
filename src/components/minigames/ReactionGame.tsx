import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReactionGameProps {
  onWin: (score: number) => void;
  onLose: () => void;
}

interface Target {
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

export function ReactionGame({ onWin, onLose }: ReactionGameProps) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [message, setMessage] = useState('Cliquez sur les cercles rouges qui apparaissent !');
  const [gameOver, setGameOver] = useState(false);
  const [averageReactionTime, setAverageReactionTime] = useState(0);
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const targetIdRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);

  // Fonctions de fin de jeu avec useCallback pour éviter les re-renders
  const handleWin = useCallback((finalScore: number) => {
    setIsPlaying(false);
    setGameOver(true);
    setMessage(`Excellent ! Score final: ${finalScore} points !`);
    setTimeout(() => onWin(finalScore), 1500);
  }, [onWin]);

  const handleLose = useCallback((finalScore: number, reason: string) => {
    setIsPlaying(false);
    setGameOver(true);
    setMessage(reason);
    setTimeout(() => onLose(), 1500);
  }, [onLose]);

  // Générer une nouvelle cible
  const spawnTarget = useCallback(() => {
    if (!gameAreaRef.current || !isPlaying) return;

    const rect = gameAreaRef.current.getBoundingClientRect();
    const padding = 40; // Espacement des bords
    
    const newTarget: Target = {
      id: targetIdRef.current++,
      x: Math.random() * (rect.width - padding * 2) + padding,
      y: Math.random() * (rect.height - padding * 2) + padding,
      timestamp: Date.now()
    };

    setTargets(prev => [...prev, newTarget]);

    // Supprimer la cible après 2 secondes si pas cliquée
    setTimeout(() => {
      setTargets(prev => {
        const updated = prev.filter(t => t.id !== newTarget.id);
        if (prev.length > updated.length) {
          setMisses(m => m + 1);
        }
        return updated;
      });
    }, 2000);
  }, [isPlaying]);

  // Gérer le clic sur une cible
  const handleTargetClick = (target: Target) => {
    const reactionTime = Date.now() - target.timestamp;
    reactionTimesRef.current.push(reactionTime);
    
    // Calculer le temps de réaction moyen
    const avgTime = reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length;
    setAverageReactionTime(Math.round(avgTime));

    setTargets(prev => prev.filter(t => t.id !== target.id));
    setScore(prev => prev + (reactionTime < 500 ? 20 : reactionTime < 800 ? 15 : 10));
  };

  // Démarrer le jeu
  const startGame = () => {
    setTargets([]);
    setScore(0);
    setMisses(0);
    setTimeLeft(30);
    setIsPlaying(true);
    setGameOver(false);
    setMessage('Cliquez rapidement sur les cercles !');
    targetIdRef.current = 0;
    reactionTimesRef.current = [];
    setAverageReactionTime(0);
  };

  // Timer du jeu - CORRIGÉ
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          // Récupérer le score actuel via un callback
          setScore(currentScore => {
            if (currentScore >= 200) {
              handleWin(currentScore);
            } else {
              handleLose(currentScore, `Temps écoulé ! Score final: ${currentScore} points`);
            }
            return currentScore;
          });
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, gameOver, handleWin, handleLose]); // Dépendances simplifiées

  // Apparition des cibles
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const spawnInterval = setInterval(() => {
      spawnTarget();
    }, 800);

    return () => clearInterval(spawnInterval);
  }, [isPlaying, gameOver, spawnTarget]);

  // Vérifier les échecs
  useEffect(() => {
    if (misses >= 10 && isPlaying) {
      setScore(currentScore => {
        handleLose(currentScore, `Trop de ratés ! Score final: ${currentScore} points`);
        return currentScore;
      });
    }
  }, [misses, isPlaying, handleLose]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Jeu de Réflexes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Cliquez sur les cercles rouges le plus rapidement possible !
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-center">
          <div>
            <p className="text-lg font-semibold">{score}</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-blue-600">{timeLeft}s</p>
            <p className="text-xs text-muted-foreground">Temps</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{misses}/10</p>
            <p className="text-xs text-muted-foreground">Ratés</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{averageReactionTime}ms</p>
            <p className="text-xs text-muted-foreground">Réaction moy.</p>
          </div>
        </div>

        <div 
          ref={gameAreaRef}
          className="relative bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden"
          style={{ height: '300px', minHeight: '300px' }}
        >
          {targets.map(target => (
            <div
              key={target.id}
              className="absolute w-10 h-10 bg-red-500 rounded-full cursor-pointer hover:bg-red-400 transition-all duration-100 hover:scale-110 shadow-lg"
              style={{
                left: target.x - 20,
                top: target.y - 20,
                animation: 'pulse 0.8s ease-in-out infinite'
              }}
              onClick={() => handleTargetClick(target)}
            />
          ))}
          
          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500 text-center">
                La zone de jeu apparaîtra ici<br/>
                Cliquez sur "Commencer" pour jouer !
              </p>
            </div>
          )}

          {isPlaying && targets.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-400 text-sm">
                Attendez l'apparition des cibles...
              </p>
            </div>
          )}
        </div>

        {message && (
          <div className="text-center p-3 rounded bg-muted">
            <p className={`font-medium ${
              message.includes('Excellent') ? 'text-green-600' : 
              message.includes('Trop de ratés') || message.includes('Temps écoulé') ? 'text-red-600' : 
              'text-foreground'
            }`}>
              {message}
            </p>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <p>Objectif: 200 points en 30 secondes</p>
          <p>Points: Réaction &lt;500ms = 20pts, &lt;800ms = 15pts, autres = 10pts</p>
          <p>Maximum 10 ratés autorisés</p>
        </div>

        <Button 
          onClick={startGame} 
          className="w-full mt-4"
          disabled={isPlaying && !gameOver}
        >
          {isPlaying && !gameOver ? 'Partie en cours...' : 'Commencer'}
        </Button>
      </CardContent>
    </Card>
  );
}