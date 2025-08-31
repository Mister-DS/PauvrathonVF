import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HangmanProps {
  onWin: (score: number) => void;
  onLose: () => void;
  attempts: number;
  maxAttempts: number;
}

const WORDS = [
      "chat", "chien", "maison", "route", "ordinateur", "fenetre", "voiture", "arbre", "pomme", "musique",
    "plage", "oiseau", "soleil", "montagne", "riviere", "carte", "papier", "stylo", "livre", "porte",
    "lampe", "table", "chaise", "ville", "pays", "carton", "ciseaux", "pierre", "pont", "feu",
    "piscine", "lune", "etoile", "nuage", "fleur", "herbe", "cadeau", "bateau", "train", "avion",
    "guitare", "piano", "violon", "trompette", "flute", "tambour", "sport", "football", "tennis", "voyage"
];

export function Hangman({ onWin, onLose, attempts, maxAttempts }: HangmanProps) {
  const [word, setWord] = useState<string>('');
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [currentAttempts, setCurrentAttempts] = useState(attempts);

  useEffect(() => {
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWord(randomWord);
  }, []);

  const handleLetterGuess = (letter: string) => {
    if (guessedLetters.has(letter)) return;

    const newGuessedLetters = new Set(guessedLetters);
    newGuessedLetters.add(letter);
    setGuessedLetters(newGuessedLetters);

    if (!word.includes(letter)) {
      const newWrongGuesses = [...wrongGuesses, letter];
      setWrongGuesses(newWrongGuesses);
      
      const newAttempts = currentAttempts + 1;
      setCurrentAttempts(newAttempts);

      if (newAttempts >= maxAttempts) {
        setTimeout(() => onLose(), 1000);
      }
    }
  };

  const displayWord = word
    .split('')
    .map(letter => guessedLetters.has(letter) ? letter : '_')
    .join(' ');

  const isWon = word.split('').every(letter => guessedLetters.has(letter));
  const isLost = currentAttempts >= maxAttempts;

  useEffect(() => {
    if (isWon && word) {
      // Calculer le score basé sur les erreurs (moins d'erreurs = meilleur score)
      const score = Math.max(1, maxAttempts - currentAttempts + 1);
      setTimeout(() => onWin(score), 1000);
    }
  }, [isWon, word, onWin, maxAttempts, currentAttempts]);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const remainingAttempts = maxAttempts - currentAttempts;

  const hangmanStages = [
    '',
    '  +---+\n      |\n      |\n      |\n      |\n      |\n=========',
    '  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========',
    '  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========',
    '  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========',
    '  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========',
    '  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========',
    '  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========',
    '  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========',
    '  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n  |   |\n=========',
    '  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n  |   |\n=========\n Game Over!',
    '  +---+\n  |   |\n  X   |\n /|\\  |\n / \\  |\n  |   |\n=========\n RIP'
  ];

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Jeu du Pendu</CardTitle>
        <p className="text-sm text-muted-foreground">
          Devinez le mot avant que le bonhomme soit pendu !
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold">
            Erreurs restantes: {remainingAttempts}
          </p>
        </div>

        <div className="text-center">
          <pre className="text-xs font-mono bg-muted p-2 rounded">
            {hangmanStages[Math.min(currentAttempts, hangmanStages.length - 1)]}
          </pre>
        </div>

        <div className="text-center">
          <p className="text-2xl font-mono tracking-wider mb-4">
            {displayWord}
          </p>
        </div>

        {isWon && (
          <div className="text-center p-2 rounded bg-green-100 dark:bg-green-900">
            <p className="font-medium text-green-600 dark:text-green-400">
              🎉 Félicitations ! Vous avez trouvé le mot !
            </p>
          </div>
        )}

        {isLost && (
          <div className="text-center p-2 rounded bg-red-100 dark:bg-red-900">
            <p className="font-medium text-red-600 dark:text-red-400">
              💀 Perdu ! Le mot était: {word}
            </p>
          </div>
        )}

        {!isWon && !isLost && (
          <div className="grid grid-cols-6 gap-1">
            {alphabet.map(letter => (
              <Button
                key={letter}
                variant={guessedLetters.has(letter) ? 
                  (word.includes(letter) ? 'default' : 'destructive') : 
                  'outline'
                }
                size="sm"
                onClick={() => handleLetterGuess(letter)}
                disabled={guessedLetters.has(letter)}
                className="text-xs p-1 h-8"
              >
                {letter}
              </Button>
            ))}
          </div>
        )}

        {wrongGuesses.length > 0 && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Lettres incorrectes: {wrongGuesses.join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}