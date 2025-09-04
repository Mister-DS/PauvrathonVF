import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Définir les interfaces pour le composant
interface TicTacToeProps {
  onWin: (score: number) => void;
  onLose: () => void;
}

type Player = 'X' | 'O' | null;
type Board = Player[];

const WINNING_COMBINATIONS = [
  [0, 1, 2], // Première ligne
  [3, 4, 5], // Deuxième ligne
  [6, 7, 8], // Troisième ligne
  [0, 3, 6], // Première colonne
  [1, 4, 7], // Deuxième colonne
  [2, 5, 8], // Troisième colonne
  [0, 4, 8], // Diagonale principale
  [2, 4, 6], // Diagonale secondaire
];

export function TicTacToe({ onWin, onLose }: TicTacToeProps) {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [gameStatus, setGameStatus] = useState<string>('');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [moves, setMoves] = useState<number>(0);

  // Initialisation du jeu
  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setGameStatus('À votre tour ! Placez votre X');
    setIsGameOver(false);
    setMoves(0);
  };

  // Vérifier s'il y a un gagnant
  const checkWinner = (board: Board): Player => {
    for (let combination of WINNING_COMBINATIONS) {
      const [a, b, c] = combination;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  };

  // Vérifier si le plateau est plein
  const isBoardFull = (board: Board): boolean => {
    return board.every(cell => cell !== null);
  };

  // Intelligence artificielle simple pour l'ordinateur
  const getAIMove = (board: Board): number => {
    // 1. Essayer de gagner
    for (let combination of WINNING_COMBINATIONS) {
      const [a, b, c] = combination;
      const cells = [board[a], board[b], board[c]];
      const oCount = cells.filter(cell => cell === 'O').length;
      const nullCount = cells.filter(cell => cell === null).length;
      
      if (oCount === 2 && nullCount === 1) {
        return combination[cells.indexOf(null)];
      }
    }

    // 2. Bloquer le joueur s'il peut gagner
    for (let combination of WINNING_COMBINATIONS) {
      const [a, b, c] = combination;
      const cells = [board[a], board[b], board[c]];
      const xCount = cells.filter(cell => cell === 'X').length;
      const nullCount = cells.filter(cell => cell === null).length;
      
      if (xCount === 2 && nullCount === 1) {
        return combination[cells.indexOf(null)];
      }
    }

    // 3. Prendre le centre si disponible
    if (board[4] === null) {
      return 4;
    }

    // 4. Prendre un coin si disponible
    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(corner => board[corner] === null);
    if (availableCorners.length > 0) {
      return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }

    // 5. Prendre n'importe quelle case disponible
    const availableMoves = board.map((cell, index) => cell === null ? index : null)
                               .filter(index => index !== null) as number[];
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  };

  // Gérer le clic sur une case
  const handleCellClick = (index: number) => {
    if (board[index] || isGameOver) return;

    // Tour du joueur
    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    setMoves(moves + 1);

    const winner = checkWinner(newBoard);
    if (winner === 'X') {
      setGameStatus('Félicitations ! Vous avez gagné ! 🎉');
      setIsGameOver(true);
      setTimeout(() => onWin(10 - Math.floor(moves / 2)), 1500);
      return;
    }

    if (isBoardFull(newBoard)) {
      setGameStatus('Match nul ! 🤝');
      setIsGameOver(true);
      setTimeout(() => onLose(), 1500);
      return;
    }

    setGameStatus('L\'ordinateur réfléchit...');
    setCurrentPlayer('O');

    // Tour de l'ordinateur après un délai
    setTimeout(() => {
      const aiMove = getAIMove(newBoard);
      const aiBoard = [...newBoard];
      aiBoard[aiMove] = 'O';
      setBoard(aiBoard);

      const aiWinner = checkWinner(aiBoard);
      if (aiWinner === 'O') {
        setGameStatus('L\'ordinateur a gagné ! 😔');
        setIsGameOver(true);
        setTimeout(() => onLose(), 1500);
        return;
      }

      if (isBoardFull(aiBoard)) {
        setGameStatus('Match nul ! 🤝');
        setIsGameOver(true);
        return;
      }

      setGameStatus('À votre tour ! Placez votre X');
      setCurrentPlayer('X');
    }, 800);
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Tic Tac Toe</CardTitle>
        <p className="text-sm text-muted-foreground">
          Alignez 3 X pour gagner contre l'ordinateur !
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold">
            Coups joués: {Math.floor(moves / 2) + (moves % 2)}
          </p>
          <p className="text-sm text-muted-foreground">
            Vous: X | Ordinateur: O
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
          {board.map((cell, index) => (
            <div
              key={index}
              className={`
                aspect-square rounded-lg flex items-center justify-center text-4xl font-bold cursor-pointer transition-all duration-200 border-2
                ${cell ? 'bg-primary/20 scale-105 cursor-not-allowed' : 'bg-muted hover:bg-muted/80 hover:scale-105'}
                ${cell === 'X' ? 'text-blue-600 border-blue-300' : ''}
                ${cell === 'O' ? 'text-red-600 border-red-300' : ''}
                ${!cell ? 'border-gray-300' : ''}
              `}
              onClick={() => handleCellClick(index)}
            >
              {cell || ''}
            </div>
          ))}
        </div>

        {gameStatus && (
          <div className="text-center p-3 rounded bg-muted">
            <p className={`font-medium ${
              gameStatus.includes('Félicitations') ? 'text-green-600' : 
              gameStatus.includes('gagné !') && gameStatus.includes('ordinateur') ? 'text-red-600' : 
              gameStatus.includes('nul') ? 'text-yellow-600' :
              'text-foreground'
            }`}>
              {gameStatus}
            </p>
          </div>
        )}

        <Button onClick={initializeGame} className="w-full mt-4">
          Nouvelle partie
        </Button>
      </CardContent>
    </Card>
  );
}