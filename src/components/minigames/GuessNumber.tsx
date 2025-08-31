import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GuessNumberProps {
  onWin: (score: number) => void;
  onLose: () => void;
  attempts: number;
  maxAttempts: number;
}

export function GuessNumber({ onWin, onLose, attempts, maxAttempts }: GuessNumberProps) {
  const [targetNumber, setTargetNumber] = useState<number>(0);
  const [guess, setGuess] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [gameHistory, setGameHistory] = useState<{ guess: number; result: string }[]>([]);
  const [currentAttempts, setCurrentAttempts] = useState(attempts);

  useEffect(() => {
    setTargetNumber(Math.floor(Math.random() * 151));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const guessNumber = parseInt(guess);
    if (isNaN(guessNumber) || guessNumber < 0 || guessNumber > 150) {
      setMessage('Veuillez entrer un nombre entre 0 et 150');
      return;
    }

    const newAttempts = currentAttempts + 1;
    setCurrentAttempts(newAttempts);

    if (guessNumber === targetNumber) {
      setMessage('Félicitations ! Vous avez trouvé le nombre !');
      setGameHistory(prev => [...prev, { guess: guessNumber, result: '🎉 Correct !' }]);
      // Calculer le score basé sur la performance (moins d'essais = meilleur score)
      const score = Math.max(1, maxAttempts - currentAttempts + 1);
      setTimeout(() => onWin(score), 1500);
    } else if (newAttempts >= maxAttempts) {
      setMessage(`Perdu ! Le nombre était ${targetNumber}`);
      setGameHistory(prev => [...prev, { guess: guessNumber, result: `❌ ${guessNumber < targetNumber ? 'Trop petit' : 'Trop grand'}` }]);
      setTimeout(() => onLose(), 1500);
    } else {
      const hint = guessNumber < targetNumber ? 'Trop petit !' : 'Trop grand !';
      setMessage(hint);
      setGameHistory(prev => [...prev, { guess: guessNumber, result: hint }]);
    }

    setGuess('');
  };

  const remainingAttempts = maxAttempts - currentAttempts;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Devine le Chiffre</CardTitle>
        <p className="text-sm text-muted-foreground">
          Trouvez un nombre entre 0 et 150
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold">
            Tentatives restantes: {remainingAttempts}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="number"
            min="0"
            max="150"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Votre nombre..."
            disabled={currentAttempts >= maxAttempts}
          />
          <Button 
            type="submit" 
            className="w-full"
            disabled={currentAttempts >= maxAttempts || !guess}
          >
            Deviner
          </Button>
        </form>

        {message && (
          <div className="text-center p-2 rounded bg-muted">
            <p className={`font-medium ${
              message.includes('Félicitations') ? 'text-green-600' : 
              message.includes('Perdu') ? 'text-red-600' : 
              'text-foreground'
            }`}>
              {message}
            </p>
          </div>
        )}

        {gameHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Historique:</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {gameHistory.map((entry, index) => (
                <div key={index} className="text-sm flex justify-between">
                  <span>{entry.guess}</span>
                  <span>{entry.result}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}