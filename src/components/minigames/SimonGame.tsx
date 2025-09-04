import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SimonGameProps {
  onWin: (score: number) => void;
  onLose: () => void;
}

const COLORS = [
  { id: 0, name: 'red', bg: 'bg-red-500', active: 'bg-red-300', sound: 261.63 },
  { id: 1, name: 'blue', bg: 'bg-blue-500', active: 'bg-blue-300', sound: 329.63 },
  { id: 2, name: 'green', bg: 'bg-green-500', active: 'bg-green-300', sound: 392.00 },
  { id: 3, name: 'yellow', bg: 'bg-yellow-500', active: 'bg-yellow-300', sound: 523.25 }
];

export function SimonGame({ onWin, onLose }: SimonGameProps) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [level, setLevel] = useState(0);
  const [message, setMessage] = useState('Cliquez sur Commencer pour jouer !');
  const [isGameOver, setIsGameOver] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Jouer un son
  const playSound = (frequency: number) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  // Commencer une nouvelle partie
  const startGame = () => {
    const firstStep = Math.floor(Math.random() * 4);
    setSequence([firstStep]);
    setPlayerSequence([]);
    setLevel(1);
    setIsPlaying(true);
    setIsGameOver(false);
    setMessage('Mémorisez la séquence...');
    playSequence([firstStep]);
  };

  // Jouer la séquence
  const playSequence = (seq: number[]) => {
    setIsPlayerTurn(false);
    let i = 0;
    
    const playNext = () => {
      if (i < seq.length) {
        setActiveButton(seq[i]);
        playSound(COLORS[seq[i]].sound);
        
        timeoutRef.current = setTimeout(() => {
          setActiveButton(null);
          timeoutRef.current = setTimeout(() => {
            i++;
            playNext();
          }, 200);
        }, 600);
      } else {
        setIsPlayerTurn(true);
        setMessage(`À votre tour ! Niveau ${seq.length}`);
      }
    };
    
    playNext();
  };

  // Gérer le clic sur un bouton coloré
  const handleColorClick = (colorId: number) => {
    if (!isPlayerTurn || isGameOver) return;

    const newPlayerSequence = [...playerSequence, colorId];
    setPlayerSequence(newPlayerSequence);
    
    // Effet visuel et sonore
    setActiveButton(colorId);
    playSound(COLORS[colorId].sound);
    setTimeout(() => setActiveButton(null), 200);

    // Vérifier si c'est correct
    if (newPlayerSequence[newPlayerSequence.length - 1] !== sequence[newPlayerSequence.length - 1]) {
      // Erreur
      setMessage('Erreur ! Partie terminée 😔');
      setIsGameOver(true);
      setIsPlaying(false);
      setTimeout(() => onLose(), 1500);
      return;
    }

    // Si la séquence est complète
    if (newPlayerSequence.length === sequence.length) {
      if (sequence.length >= 10) {
        // Victoire !
        setMessage('Félicitations ! Vous avez atteint le niveau 10 ! 🎉');
        setIsGameOver(true);
        setIsPlaying(false);
        setTimeout(() => onWin(sequence.length * 2), 1500);
        return;
      }

      // Niveau suivant
      setPlayerSequence([]);
      setLevel(level + 1);
      setMessage('Excellent ! Niveau suivant...');
      
      setTimeout(() => {
        const nextStep = Math.floor(Math.random() * 4);
        const newSequence = [...sequence, nextStep];
        setSequence(newSequence);
        playSequence(newSequence);
      }, 1000);
    }
  };

  // Nettoyage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Simon Game</CardTitle>
        <p className="text-sm text-muted-foreground">
          Mémorisez et reproduisez la séquence de couleurs !
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold">
            Niveau: {level}
          </p>
          <p className="text-sm text-muted-foreground">
            Objectif: Atteindre le niveau 10
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          {COLORS.map((color) => (
            <div
              key={color.id}
              className={`
                aspect-square rounded-lg cursor-pointer transition-all duration-200 border-4 border-gray-300
                ${activeButton === color.id ? color.active : color.bg}
                ${isPlayerTurn && !isGameOver ? 'hover:scale-105 hover:brightness-110' : ''}
                ${!isPlayerTurn || isGameOver ? 'cursor-not-allowed opacity-70' : ''}
              `}
              onClick={() => handleColorClick(color.id)}
            />
          ))}
        </div>

        {message && (
          <div className="text-center p-3 rounded bg-muted">
            <p className={`font-medium ${
              message.includes('Félicitations') ? 'text-green-600' : 
              message.includes('Erreur') ? 'text-red-600' : 
              message.includes('Excellent') ? 'text-blue-600' :
              'text-foreground'
            }`}>
              {message}
            </p>
          </div>
        )}

        <Button 
          onClick={startGame} 
          className="w-full mt-4"
          disabled={isPlaying && !isGameOver}
        >
          {isPlaying && !isGameOver ? 'Partie en cours...' : 'Nouvelle partie'}
        </Button>
      </CardContent>
    </Card>
  );
}