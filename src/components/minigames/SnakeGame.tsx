import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SnakeGameProps {
  onWin: (score: number) => void;
  onLose: () => void;
}

interface Position {
  x: number;
  y: number;
}

const BOARD_SIZE = 15;
const INITIAL_SNAKE = [{ x: 7, y: 7 }];
const INITIAL_FOOD = { x: 10, y: 10 };
const INITIAL_DIRECTION = { x: 1, y: 0 };

export function SnakeGame({ onWin, onLose }: SnakeGameProps) {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>(INITIAL_FOOD);
  const [direction, setDirection] = useState<Position>(INITIAL_DIRECTION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('Utilisez les flèches pour jouer !');

  // Générer une nouvelle position de nourriture
  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * BOARD_SIZE),
        y: Math.floor(Math.random() * BOARD_SIZE)
      };
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  // Vérifier les collisions
  const checkCollision = useCallback((head: Position, snakeBody: Position[]): boolean => {
    // Collision avec les murs
    if (head.x < 0 || head.x >= BOARD_SIZE || head.y < 0 || head.y >= BOARD_SIZE) {
      return true;
    }
    // Collision avec le corps
    return snakeBody.some(segment => segment.x === head.x && segment.y === head.y);
  }, []);

  // Logique de jeu
  const gameLoop = useCallback(() => {
    if (!isPlaying || gameOver) return;

    setSnake(currentSnake => {
      const head = currentSnake[0];
      const newHead = {
        x: head.x + direction.x,
        y: head.y + direction.y
      };

      // Vérifier collision
      if (checkCollision(newHead, currentSnake)) {
        setGameOver(true);
        setIsPlaying(false);
        setMessage('Game Over ! Le serpent s\'est cogné 😔');
        setTimeout(() => onLose(), 1500);
        return currentSnake;
      }

      const newSnake = [newHead, ...currentSnake];

      // Vérifier si on mange la nourriture
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(currentScore => {
          const newScore = currentScore + 10;
          if (newScore >= 100) {
            setGameOver(true);
            setIsPlaying(false);
            setMessage('Félicitations ! Score maximum atteint ! 🎉');
            setTimeout(() => onWin(newScore), 1500);
          }
          return newScore;
        });
        setFood(generateFood(newSnake));
        return newSnake; // Le serpent grandit
      }

      // Enlever la queue si pas de nourriture mangée
      return newSnake.slice(0, -1);
    });
  }, [direction, food, isPlaying, gameOver, checkCollision, generateFood, onWin, onLose]);

  // Gestion des touches
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!isPlaying || gameOver) return;

    switch (e.key) {
      case 'ArrowUp':
        if (direction.y === 0) setDirection({ x: 0, y: -1 });
        break;
      case 'ArrowDown':
        if (direction.y === 0) setDirection({ x: 0, y: 1 });
        break;
      case 'ArrowLeft':
        if (direction.x === 0) setDirection({ x: -1, y: 0 });
        break;
      case 'ArrowRight':
        if (direction.x === 0) setDirection({ x: 1, y: 0 });
        break;
    }
  }, [direction, isPlaying, gameOver]);

  // Démarrer le jeu
  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    setFood(INITIAL_FOOD);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setIsPlaying(true);
    setGameOver(false);
    setMessage('Mangez la nourriture rouge ! 🍎');
  };

  // Effet pour le game loop
  useEffect(() => {
    const interval = setInterval(gameLoop, 200);
    return () => clearInterval(interval);
  }, [gameLoop]);

  // Effet pour les touches
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Rendu d'une case
  const renderCell = (x: number, y: number) => {
    const isSnakeHead = snake[0]?.x === x && snake[0]?.y === y;
    const isSnakeBody = snake.slice(1).some(segment => segment.x === x && segment.y === y);
    const isFood = food.x === x && food.y === y;

    let cellClass = 'w-4 h-4 border border-gray-200 ';
    if (isSnakeHead) {
      cellClass += 'bg-green-600';
    } else if (isSnakeBody) {
      cellClass += 'bg-green-400';
    } else if (isFood) {
      cellClass += 'bg-red-500 rounded-full';
    } else {
      cellClass += 'bg-gray-100';
    }

    return <div key={`${x}-${y}`} className={cellClass} />;
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Snake Game</CardTitle>
        <p className="text-sm text-muted-foreground">
          Utilisez les flèches pour diriger le serpent !
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold">
            Score: {score}
          </p>
          <p className="text-sm text-muted-foreground">
            Objectif: Atteindre 100 points
          </p>
        </div>

        <div className="flex justify-center">
          <div className="grid grid-cols-15 gap-0 border-2 border-gray-300 p-2 bg-white" style={{gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`}}>
            {Array.from({ length: BOARD_SIZE }, (_, y) =>
              Array.from({ length: BOARD_SIZE }, (_, x) => renderCell(x, y))
            )}
          </div>
        </div>

        {/* Contrôles tactiles pour mobile */}
        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto md:hidden">
          <div></div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleKeyPress({ key: 'ArrowUp' } as KeyboardEvent)}
            disabled={!isPlaying || gameOver}
          >
            ↑
          </Button>
          <div></div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleKeyPress({ key: 'ArrowLeft' } as KeyboardEvent)}
            disabled={!isPlaying || gameOver}
          >
            ←
          </Button>
          <div></div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleKeyPress({ key: 'ArrowRight' } as KeyboardEvent)}
            disabled={!isPlaying || gameOver}
          >
            →
          </Button>
          <div></div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleKeyPress({ key: 'ArrowDown' } as KeyboardEvent)}
            disabled={!isPlaying || gameOver}
          >
            ↓
          </Button>
          <div></div>
        </div>

        {message && (
          <div className="text-center p-3 rounded bg-muted">
            <p className={`font-medium ${
              message.includes('Félicitations') ? 'text-green-600' : 
              message.includes('Game Over') ? 'text-red-600' : 
              'text-foreground'
            }`}>
              {message}
            </p>
          </div>
        )}

        <Button onClick={startGame} className="w-full mt-4">
          {isPlaying && !gameOver ? 'Partie en cours...' : 'Nouvelle partie'}
        </Button>
      </CardContent>
    </Card>
  );
}