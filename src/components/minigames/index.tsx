// src/components/minigames/index.tsx

import { GuessNumber } from './GuessNumber';
import { Hangman } from './Hangman';
import { MemoryGame } from './MemoryGame';
import { TicTacToe } from './TicTacToe';
import { SimonGame } from './SimonGame';
import { SnakeGame } from './SnakeGame';
import { ReactionGame } from './ReactionGame';

export const minigameComponents = {
  guess_number: GuessNumber,
  hangman: Hangman,
  memory_game: MemoryGame,
  tic_tac_toe: TicTacToe,
  simon_game: SimonGame,
  snake_game: SnakeGame,
  reaction_game: ReactionGame,
  // Ajoutez d'autres jeux ici au fur et à mesure que vous les créez.
};