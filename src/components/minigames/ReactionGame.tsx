import { useState, useEffect, useRef } from 'react';
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

  // Générer une nouvelle cible
  const spawnTarget = () => {
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
  };

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
    setTimeLeft(10);
    setIsPlaying(true);
    setGameOver(false);
    setMessage('Cliquez rapidement sur les cercles !');
    targetIdRef.current = 0;
    reactionTimesRef.current = [];
    setAverageReactionTime(0);
  };

  // Timer du jeu
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsPlaying(false);
          setGameOver(true);
          
          if (score >= 200) {
            setMessage(`Excellent ! Score final: ${score} points ! 🎉`);
            setTimeout(() => onWin(score), 1500);
          } else {
            setMessage(`Temps écoulé ! Score final: ${score} points`);
            setTimeout(() => onLose(), 1500);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, gameOver, score, onWin, onLose]);

  // Apparition des cibles
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const spawnInterval = setInterval(() => {
      spawnTarget();
    }, 800);

    return () => clearInterval(spawnInterval);
  }, [isPlaying, gameOver]);

  // Vérifier les échecs
  useEffect(() => {
    if (misses >= 10) {
      setIsPlaying(false);
      setGameOver(true);
      setMessage(`Trop de ratés ! Score final: ${score} points 😔`);
      setTimeout(() => onLose(), 1500);
    }
  }, [misses, score, onLose]);

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
            <p className="text-lg font-semibold">{timeLeft}s</p>
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
              className="absolute w-10 h-10 bg-red-500 rounded-full cursor-pointer hover:bg-red-400 transition-all duration-100 hover:scale-110 animate-pulse shadow-lg"
              style={{
                left: target.x - 20,
                top: target.y - 20,
                animation: 'pulse 0.5s ease-in-out infinite'
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
          <p>Objectif: 200 points en 10 secondes</p>
          <p>Points: Réaction &lt;500ms = 20pts, &lt;800ms = 15pts, autres = 10pts</p>
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