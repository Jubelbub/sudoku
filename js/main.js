// main.js – App entry point, wires all modules together

import { generatePuzzle } from './generator.js';
import { createBoard } from './board.js';
import { createTimer } from './timer.js';
import * as ranking from './ranking.js';
import { initUI } from './ui.js';

let board = null;
let timer = null;
let ui = null;

function startNewGame() {
  const loading = document.getElementById('loading');
  loading.classList.add('visible');

  // Use setTimeout to let loading screen render before blocking generation
  setTimeout(() => {
    try {
      const { puzzle, solution, difficulty, attempts } = generatePuzzle();
      console.log(`Puzzle generated in ${attempts} attempt(s)`, difficulty);

      board = createBoard(puzzle, solution);

      if (!timer) {
        timer = createTimer(document.getElementById('timer'));
      }
      timer.reset();

      if (!ui) {
        ui = initUI(board, timer, ranking, startNewGame);
      } else {
        // Re-initialize UI with new board
        ui = initUI(board, timer, ranking, startNewGame);
      }

      ui.reset();
      timer.start();
    } catch (err) {
      console.error('Failed to generate puzzle:', err);
    } finally {
      loading.classList.remove('visible');
    }
  }, 50);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', startNewGame);
