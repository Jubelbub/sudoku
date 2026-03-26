// generator.js – Sudoku puzzle generator with medium difficulty calibration
// Uses backtracking only for initial grid creation, never for validation.
// Relies on solver.js for puzzle validation and difficulty assessment.

import { solvePuzzle, analyzeDifficulty, isMediumDifficulty } from './solver.js';

/**
 * Shuffle an array in place (Fisher-Yates).
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Create an empty 9x9 grid filled with zeros.
 */
function emptyGrid() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

/**
 * Deep clone a grid.
 */
function cloneGrid(grid) {
  return grid.map(row => [...row]);
}

/**
 * Check if placing val at (r, c) is valid in the grid.
 */
function isValid(grid, r, c, val) {
  // Row check
  for (let i = 0; i < 9; i++) {
    if (grid[r][i] === val) return false;
  }
  // Column check
  for (let i = 0; i < 9; i++) {
    if (grid[i][c] === val) return false;
  }
  // Box check
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = br; i < br + 3; i++) {
    for (let j = bc; j < bc + 3; j++) {
      if (grid[i][j] === val) return false;
    }
  }
  return true;
}

/**
 * Generate a complete valid Sudoku grid using backtracking.
 * This is the ONLY place where backtracking is used.
 */
function generateCompleteGrid() {
  const grid = emptyGrid();

  // Fill diagonal boxes first (they don't constrain each other)
  for (let box = 0; box < 3; box++) {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let idx = 0;
    for (let r = box * 3; r < box * 3 + 3; r++) {
      for (let c = box * 3; c < box * 3 + 3; c++) {
        grid[r][c] = nums[idx++];
      }
    }
  }

  // Solve the rest with backtracking
  if (!solveWithBacktracking(grid)) {
    // Extremely unlikely, just retry
    return generateCompleteGrid();
  }

  return grid;
}

/**
 * Internal backtracking solver for grid generation only.
 */
function solveWithBacktracking(grid) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const val of nums) {
          if (isValid(grid, r, c, val)) {
            grid[r][c] = val;
            if (solveWithBacktracking(grid)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

/**
 * Count solutions using backtracking (for uniqueness testing only).
 * Stops after finding 2 solutions.
 */
export function countSolutions(grid, limit = 2) {
  let count = 0;

  function solve(g) {
    if (count >= limit) return;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (g[r][c] === 0) {
          for (let val = 1; val <= 9; val++) {
            if (isValid(g, r, c, val)) {
              g[r][c] = val;
              solve(g);
              g[r][c] = 0;
              if (count >= limit) return;
            }
          }
          return;
        }
      }
    }
    count++;
  }

  solve(cloneGrid(grid));
  return count;
}

/**
 * Remove cells from a complete grid to create a puzzle.
 * Uses the logic solver to ensure the puzzle remains solvable.
 */
function createPuzzle(solution) {
  const puzzle = cloneGrid(solution);

  // Create shuffled list of all cell positions
  const positions = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  shuffle(positions);

  const MIN_GIVENS = 28;
  let removed = 0;
  const totalCells = 81;

  for (const [r, c] of positions) {
    // Stop removing if we'd drop below the minimum givens
    if (totalCells - (removed + 1) < MIN_GIVENS) break;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    removed++;

    const result = solvePuzzle(puzzle);
    if (!result.solved) {
      // Can't remove this cell – logic solver can't handle it
      puzzle[r][c] = backup;
      removed--;
    } else {
      // Verify solution matches
      const match = result.solution[r][c] === backup;
      if (!match) {
        // Solution diverged – not unique with logic solver
        puzzle[r][c] = backup;
        removed--;
      }
    }
  }

  return puzzle;
}

/**
 * Pre-computed fallback puzzles for timeout scenarios.
 */
const FALLBACK_PUZZLES = [
  {
    puzzle: [
      [0,0,3,0,2,0,6,0,0],
      [9,0,0,3,0,5,0,0,1],
      [0,0,1,8,0,6,4,0,0],
      [0,0,8,1,0,2,9,0,0],
      [7,0,0,0,0,0,0,0,8],
      [0,0,6,7,0,8,2,0,0],
      [0,0,2,6,0,9,5,0,0],
      [8,0,0,2,0,3,0,0,9],
      [0,0,5,0,1,0,3,0,0]
    ],
    solution: [
      [4,8,3,9,2,1,6,5,7],
      [9,6,7,3,4,5,8,2,1],
      [2,5,1,8,7,6,4,9,3],
      [5,4,8,1,3,2,9,7,6],
      [7,2,9,5,6,4,1,3,8],
      [1,3,6,7,9,8,2,4,5],
      [3,7,2,6,8,9,5,1,4],
      [8,1,4,2,5,3,7,6,9],
      [6,9,5,4,1,7,3,8,2]
    ]
  }
];

/**
 * Generate a medium-difficulty Sudoku puzzle.
 * Returns { puzzle, solution, difficulty }.
 */
export function generatePuzzle() {
  const startTime = performance.now();
  const timeout = 3000; // 3 seconds max
  let attempts = 0;

  while (performance.now() - startTime < timeout) {
    attempts++;
    const solution = generateCompleteGrid();
    const puzzle = createPuzzle(solution);

    // Validate with logic solver
    const result = solvePuzzle(puzzle);
    if (!result.solved) continue;

    // Check difficulty
    const difficulty = analyzeDifficulty(result.log);
    if (isMediumDifficulty(result.log)) {
      return { puzzle, solution, difficulty, attempts };
    }
  }

  // Timeout – use fallback
  console.warn('Generator timeout, using fallback puzzle');
  const fb = FALLBACK_PUZZLES[Math.floor(Math.random() * FALLBACK_PUZZLES.length)];
  const result = solvePuzzle(fb.puzzle);
  return {
    puzzle: cloneGrid(fb.puzzle),
    solution: cloneGrid(fb.solution),
    difficulty: analyzeDifficulty(result.log),
    attempts,
    fallback: true,
  };
}
