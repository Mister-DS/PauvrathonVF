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
    setWord(randomWord.toLowerCase()); // S'assurer que le mot est en minuscules
  }, []);

  const handleLetterGuess = (letter: string) => {
    const lowerLetter = letter.toLowerCase(); // Convertir en minuscules pour la comparaison
    
    if (guessedLetters.has(lowerLetter)) return;

    const newGuessedLetters = new Set(guessedLetters);
    newGuessedLetters.add(lowerLetter);
    setGuessedLetters(newGuessedLetters);

    if (!word.includes(lowerLetter)) {
      const newWrongGuesses = [...wrongGuesses, letter]; // Garder la lettre majuscule pour l'affichage
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
    .map(letter => guessedLetters.has(letter) ? letter.toUpperCase() : '_') // Afficher en majuscules
    .join(' ');

  const isWon = word.split('').every(letter => guessedLetters.has(letter));
  const isLost = currentAttempts >= maxAttempts;

  useEffect(() => {
    if (isWon && word) {
      // Calculer le score basé sur les erreurs (moins d'erreurs = meilleur score)
      const score = Math.max(1, maxAttempts - wrongGuesses.length);
      setTimeout(() => onWin(score), 1000);
    }
  }, [isWon, word, onWin, maxAttempts, wrongGuesses.length]);

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
    '  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n      |\n=========',
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
          {/* Affichage de debug en mode développement */}
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-muted-foreground">
              Debug: Mot = "{word}"
            </p>
          )}
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
              💀 Perdu ! Le mot était: {word.toUpperCase()}
            </p>
          </div>
        )}

        {!isWon && !isLost && (
          <div className="grid grid-cols-6 gap-1">
            {alphabet.map(letter => {
              const isGuessed = guessedLetters.has(letter.toLowerCase());
              const isCorrect = word.includes(letter.toLowerCase());
              
              return (
                <Button
                  key={letter}
                  variant={isGuessed ? 
                    (isCorrect ? 'default' : 'destructive') : 
                    'outline'
                  }
                  size="sm"
                  onClick={() => handleLetterGuess(letter)}
                  disabled={isGuessed}
                  className="text-xs p-1 h-8"
                >
                  {letter}
                </Button>
              );
            })}
          </div>
        )}

        {wrongGuesses.length > 0 && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Lettres incorrectes: {wrongGuesses.join(', ')}
            </p>
          </div>
        )}

        {/* Aide visuelle pour les lettres trouvées */}
        {guessedLetters.size > 0 && !isWon && !isLost && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Lettres trouvées: {Array.from(guessedLetters).filter(letter => word.includes(letter)).map(l => l.toUpperCase()).join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}