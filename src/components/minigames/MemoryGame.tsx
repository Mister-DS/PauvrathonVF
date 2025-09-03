import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { shuffle } from 'lodash';

// Définir les interfaces pour les props du composant
interface MemoryCard {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryGameProps {
  onWin: (score: number) => void;
  onLose: () => void;
}

// Liste des emojis à utiliser pour les cartes
const cardEmojis = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍍', '🥝', '🥭'];

export function MemoryGame({ onWin, onLose }: MemoryGameProps) {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchesFound, setMatchesFound] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  const [message, setMessage] = useState<string>('');

  // Initialisation du jeu
  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    // Créer des paires de cartes avec des valeurs et des identifiants uniques
    const initialCards = shuffle(
      [...cardEmojis, ...cardEmojis].map((emoji, index) => ({
        id: index,
        value: emoji,
        isFlipped: false,
        isMatched: false,
      }))
    );
    setCards(initialCards);
    setFlippedCards([]);
    setMatchesFound(0);
    setAttempts(0);
    setMessage('Trouvez les paires de cartes !');
  };

  // Gérer le clic sur une carte
  const handleCardClick = (clickedCard: MemoryCard) => {
    if (flippedCards.length === 2 || clickedCard.isFlipped || clickedCard.isMatched) {
      return;
    }

    // Retourner la carte
    const newCards = cards.map((card) =>
      card.id === clickedCard.id ? { ...card, isFlipped: true } : card
    );
    setCards(newCards);

    const newFlippedCards = [...flippedCards, clickedCard.id];
    setFlippedCards(newFlippedCards);

    // Gérer la logique de correspondance lorsque deux cartes sont retournées
    if (newFlippedCards.length === 2) {
      setAttempts(attempts + 1);
      const [firstCardId, secondCardId] = newFlippedCards;
      const firstCard = newCards.find((card) => card.id === firstCardId);
      const secondCard = newCards.find((card) => card.id === secondCardId);

      // Si les valeurs correspondent
      if (firstCard && secondCard && firstCard.value === secondCard.value) {
        setMessage('C\'est une paire ! 🎉');
        const updatedCards = newCards.map((card) =>
          card.id === firstCardId || card.id === secondCardId
            ? { ...card, isMatched: true }
            : card
        );
        setCards(updatedCards);
        setMatchesFound(matchesFound + 1);
        setFlippedCards([]);

        // Vérifier si le jeu est terminé
        if (matchesFound + 1 === cardEmojis.length) {
          setMessage('Félicitations ! Vous avez trouvé toutes les paires !');
          setTimeout(() => onWin(20 - attempts), 1500); // Score basé sur le nombre d'essais
        }
      } else {
        // Si les valeurs ne correspondent pas
        setMessage('Ce n\'est pas une paire. Réessayez.');
        setTimeout(() => {
          const resetCards = cards.map((card) =>
            card.id === firstCardId || card.id === secondCardId
              ? { ...card, isFlipped: false }
              : card
          );
          setCards(resetCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Jeu de Mémoire</CardTitle>
        <p className="text-sm text-muted-foreground">
          Trouvez toutes les paires de cartes correspondantes.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold">
            Essais: {attempts}
          </p>
          <p className="text-sm text-muted-foreground">
            Paires trouvées: {matchesFound} / {cardEmojis.length}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`
                aspect-square rounded-lg flex items-center justify-center text-4xl cursor-pointer transition-all duration-200
                ${card.isFlipped || card.isMatched ? 'bg-primary/20 scale-105' : 'bg-muted hover:bg-muted/80'}
                ${card.isMatched ? 'cursor-not-allowed' : ''}
              `}
              onClick={() => handleCardClick(card)}
            >
              {(card.isFlipped || card.isMatched) ? card.value : '❓'}
            </div>
          ))}
        </div>
        {message && (
          <div className="text-center p-2 rounded bg-muted">
            <p className={`font-medium ${
              message.includes('Félicitations') ? 'text-green-600' : 
              message.includes('pas une paire') ? 'text-red-600' : 
              'text-foreground'
            }`}>
              {message}
            </p>
          </div>
        )}
        <Button onClick={initializeGame} className="w-full mt-4">
          Recommencer
        </Button>
      </CardContent>
    </Card>
  );
}