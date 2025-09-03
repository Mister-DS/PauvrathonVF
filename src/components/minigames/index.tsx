// src/components/minigames/index.tsx

import { GuessNumber } from './GuessNumber';
import { Hangman } from './Hangman';
import { MemoryGame } from './MemoryGame';

export const minigameComponents = {
  guess_number: GuessNumber,
  hangman: Hangman,
  memory_game: MemoryGame,
  // Ajoutez d'autres jeux ici au fur et à mesure que vous les créez.
};