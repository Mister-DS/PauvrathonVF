// src/components/minigames/index.tsx

import { GuessNumber } from './GuessNumber';
import { Hangman } from './Hangman';
import { MemoryGame } from './MemoryGame';

// Un dictionnaire central qui associe les noms des mini-jeux (utilisés dans la base de données) à leurs composants.
export const minigameComponents = {
  guess_number: GuessNumber,
  hangman: Hangman,
  memory_game: MemoryGame,
  // Ajoutez d'autres jeux ici au fur et à mesure que vous les créez.
};