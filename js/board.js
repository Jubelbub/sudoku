// board.js – Sudoku board data model

export function createBoard(puzzle, solution) {
  const player = puzzle.map(row => [...row]);
  const notes = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set())
  );

  return {
    getCell(r, c) {
      const given = puzzle[r][c] !== 0;
      const value = player[r][c];
      const isError = value !== 0 && !given && hasConflict(player, r, c);
      return { value, given, notes: notes[r][c], isError };
    },

    setCell(r, c, value) {
      if (puzzle[r][c] !== 0) return; // given cells are immutable
      player[r][c] = value;
      if (value !== 0) notes[r][c].clear();
    },

    toggleNote(r, c, value) {
      if (puzzle[r][c] !== 0) return;
      if (player[r][c] !== 0) return; // cell has a value, no notes
      if (notes[r][c].has(value)) {
        notes[r][c].delete(value);
      } else {
        notes[r][c].add(value);
      }
    },

    clearCell(r, c) {
      if (puzzle[r][c] !== 0) return;
      player[r][c] = 0;
      notes[r][c].clear();
    },

    isComplete() {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (player[r][c] === 0) return false;
        }
      }
      return true;
    },

    checkSolution() {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (player[r][c] !== solution[r][c]) return false;
        }
      }
      return true;
    },

    getSolution() {
      return solution;
    },

    getPuzzle() {
      return puzzle;
    },

    getPlayer() {
      return player;
    },
  };
}

function hasConflict(grid, r, c) {
  const val = grid[r][c];
  if (val === 0) return false;

  // Row
  for (let i = 0; i < 9; i++) {
    if (i !== c && grid[r][i] === val) return true;
  }
  // Column
  for (let i = 0; i < 9; i++) {
    if (i !== r && grid[i][c] === val) return true;
  }
  // Box
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = br; i < br + 3; i++) {
    for (let j = bc; j < bc + 3; j++) {
      if (i !== r && j !== c && grid[i][j] === val) return true;
    }
  }
  return false;
}
