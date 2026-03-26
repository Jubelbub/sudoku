// solver.js – Logic-based Sudoku solver (medium difficulty techniques only)
// Techniques: Naked Singles, Hidden Singles, Naked Pairs, Hidden Pairs,
//             Pointing Pairs, Box-Line Reduction
// Never guesses or backtracks.

/**
 * Get all units (rows, columns, boxes) as arrays of [row, col] positions.
 */
function getUnits() {
  const units = [];
  // Rows
  for (let r = 0; r < 9; r++) {
    const unit = [];
    for (let c = 0; c < 9; c++) unit.push([r, c]);
    units.push(unit);
  }
  // Columns
  for (let c = 0; c < 9; c++) {
    const unit = [];
    for (let r = 0; r < 9; r++) unit.push([r, c]);
    units.push(unit);
  }
  // Boxes
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const unit = [];
      for (let r = br * 3; r < br * 3 + 3; r++) {
        for (let c = bc * 3; c < bc * 3 + 3; c++) unit.push([r, c]);
      }
      units.push(unit);
    }
  }
  return units;
}

const UNITS = getUnits();

/**
 * Get the three units (row, col, box) that contain cell [r, c].
 */
function getUnitsForCell(r, c) {
  const rowUnit = r;
  const colUnit = 9 + c;
  const boxUnit = 18 + Math.floor(r / 3) * 3 + Math.floor(c / 3);
  return [UNITS[rowUnit], UNITS[colUnit], UNITS[boxUnit]];
}

/**
 * Initialize candidates grid from a puzzle grid.
 * Each cell gets a Set of possible values (1-9 minus peers' placed values).
 */
function initCandidates(grid) {
  const candidates = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set())
  );

  // Start with all candidates for empty cells
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        for (let v = 1; v <= 9; v++) candidates[r][c].add(v);
      } else {
        candidates[r][c].add(grid[r][c]);
      }
    }
  }

  // Eliminate based on placed values
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) {
        eliminateFromPeers(candidates, r, c, grid[r][c]);
      }
    }
  }

  return candidates;
}

function eliminateFromPeers(candidates, r, c, val) {
  const units = getUnitsForCell(r, c);
  for (const unit of units) {
    for (const [ur, uc] of unit) {
      if (ur === r && uc === c) continue;
      candidates[ur][uc].delete(val);
    }
  }
}

function isSolved(candidates) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (candidates[r][c].size !== 1) return false;
    }
  }
  return true;
}

function isInvalid(candidates) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (candidates[r][c].size === 0) return true;
    }
  }
  return false;
}

function extractSolution(candidates) {
  return candidates.map(row => row.map(cell => [...cell][0]));
}

// --- Technique implementations ---

function applyNakedSingles(candidates) {
  let progress = false;
  let placements = 0;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (candidates[r][c].size === 1) continue; // already solved
      if (candidates[r][c].size === 0) continue;
      // This shouldn't be size 1 if we check "unsolved" properly
      // Actually size === 1 means solved. We want size that became 1 after eliminations.
    }
  }

  // Find cells with exactly 1 candidate that are not yet "placed"
  // In our model, size 1 = solved. We need to propagate new singletons.
  // Let's track which cells are newly singleton and need propagation.
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (candidates[r][c].size === 1) {
        // Check if peers still have this value – if so, eliminate
        const val = [...candidates[r][c]][0];
        const units = getUnitsForCell(r, c);
        for (const unit of units) {
          for (const [ur, uc] of unit) {
            if (ur === r && uc === c) continue;
            if (candidates[ur][uc].has(val)) {
              candidates[ur][uc].delete(val);
              progress = true;
              placements++; // counting eliminations here
            }
          }
        }
      }
    }
  }

  return { name: 'nakedSingles', progress, eliminations: placements };
}

function applyHiddenSingles(candidates) {
  let progress = false;
  let placements = 0;

  for (const unit of UNITS) {
    for (let val = 1; val <= 9; val++) {
      const cells = unit.filter(([r, c]) => candidates[r][c].has(val));
      if (cells.length === 1) {
        const [r, c] = cells[0];
        if (candidates[r][c].size > 1) {
          // Place this value – remove all other candidates
          const removed = candidates[r][c].size - 1;
          candidates[r][c] = new Set([val]);
          eliminateFromPeers(candidates, r, c, val);
          progress = true;
          placements += removed;
        }
      }
    }
  }

  return { name: 'hiddenSingles', progress, eliminations: placements };
}

function applyNakedPairs(candidates) {
  let progress = false;
  let eliminations = 0;

  for (const unit of UNITS) {
    // Find cells with exactly 2 candidates
    const pairCells = unit.filter(([r, c]) => candidates[r][c].size === 2);

    for (let i = 0; i < pairCells.length; i++) {
      for (let j = i + 1; j < pairCells.length; j++) {
        const [r1, c1] = pairCells[i];
        const [r2, c2] = pairCells[j];
        const set1 = candidates[r1][c1];
        const set2 = candidates[r2][c2];

        // Check if they share the same 2 candidates
        if (set1.size === 2 && set2.size === 2 && setsEqual(set1, set2)) {
          const pairVals = [...set1];
          // Eliminate these values from all other cells in the unit
          for (const [ur, uc] of unit) {
            if ((ur === r1 && uc === c1) || (ur === r2 && uc === c2)) continue;
            for (const val of pairVals) {
              if (candidates[ur][uc].has(val)) {
                candidates[ur][uc].delete(val);
                progress = true;
                eliminations++;
              }
            }
          }
        }
      }
    }
  }

  return { name: 'nakedPairs', progress, eliminations };
}

function applyHiddenPairs(candidates) {
  let progress = false;
  let eliminations = 0;

  for (const unit of UNITS) {
    // For each pair of values, check if they appear in exactly 2 cells
    for (let v1 = 1; v1 <= 9; v1++) {
      for (let v2 = v1 + 1; v2 <= 9; v2++) {
        const cellsV1 = unit.filter(([r, c]) => candidates[r][c].has(v1) && candidates[r][c].size > 1);
        const cellsV2 = unit.filter(([r, c]) => candidates[r][c].has(v2) && candidates[r][c].size > 1);

        if (cellsV1.length !== 2 || cellsV2.length !== 2) continue;

        // Check if they're in the same 2 cells
        if (cellsV1[0][0] === cellsV2[0][0] && cellsV1[0][1] === cellsV2[0][1] &&
            cellsV1[1][0] === cellsV2[1][0] && cellsV1[1][1] === cellsV2[1][1]) {
          // Hidden pair found – remove all other candidates from these 2 cells
          for (const [r, c] of cellsV1) {
            for (const val of [...candidates[r][c]]) {
              if (val !== v1 && val !== v2) {
                candidates[r][c].delete(val);
                progress = true;
                eliminations++;
              }
            }
          }
        }
      }
    }
  }

  return { name: 'hiddenPairs', progress, eliminations };
}

function applyPointingPairs(candidates) {
  let progress = false;
  let eliminations = 0;

  // For each box
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const boxStartR = br * 3;
      const boxStartC = bc * 3;

      for (let val = 1; val <= 9; val++) {
        // Find cells in this box that have this candidate
        const cells = [];
        for (let r = boxStartR; r < boxStartR + 3; r++) {
          for (let c = boxStartC; c < boxStartC + 3; c++) {
            if (candidates[r][c].has(val) && candidates[r][c].size > 1) {
              cells.push([r, c]);
            }
            // Also include solved cells with this value for completeness
            if (candidates[r][c].size === 1 && candidates[r][c].has(val)) {
              // This value is already placed, skip this val for this box
              cells.length = 0;
              break;
            }
          }
          if (cells.length === 0) break;
        }

        if (cells.length < 2) continue;

        // Check if all cells are in the same row
        const allSameRow = cells.every(([r]) => r === cells[0][0]);
        if (allSameRow) {
          const row = cells[0][0];
          for (let c = 0; c < 9; c++) {
            if (c >= boxStartC && c < boxStartC + 3) continue;
            if (candidates[row][c].has(val)) {
              candidates[row][c].delete(val);
              progress = true;
              eliminations++;
            }
          }
        }

        // Check if all cells are in the same column
        const allSameCol = cells.every(([, c]) => c === cells[0][1]);
        if (allSameCol) {
          const col = cells[0][1];
          for (let r = 0; r < 9; r++) {
            if (r >= boxStartR && r < boxStartR + 3) continue;
            if (candidates[r][col].has(val)) {
              candidates[r][col].delete(val);
              progress = true;
              eliminations++;
            }
          }
        }
      }
    }
  }

  return { name: 'pointingPairs', progress, eliminations };
}

function applyBoxLineReduction(candidates) {
  let progress = false;
  let eliminations = 0;

  // For each row, check if a candidate is confined to one box
  for (let r = 0; r < 9; r++) {
    for (let val = 1; val <= 9; val++) {
      const cols = [];
      for (let c = 0; c < 9; c++) {
        if (candidates[r][c].has(val) && candidates[r][c].size > 1) {
          cols.push(c);
        }
      }
      if (cols.length < 2) continue;

      const boxCol = Math.floor(cols[0] / 3);
      if (cols.every(c => Math.floor(c / 3) === boxCol)) {
        // All in same box – eliminate from rest of box
        const boxStartR = Math.floor(r / 3) * 3;
        const boxStartC = boxCol * 3;
        for (let br = boxStartR; br < boxStartR + 3; br++) {
          if (br === r) continue;
          for (let bc = boxStartC; bc < boxStartC + 3; bc++) {
            if (candidates[br][bc].has(val)) {
              candidates[br][bc].delete(val);
              progress = true;
              eliminations++;
            }
          }
        }
      }
    }
  }

  // For each column, check if a candidate is confined to one box
  for (let c = 0; c < 9; c++) {
    for (let val = 1; val <= 9; val++) {
      const rows = [];
      for (let r = 0; r < 9; r++) {
        if (candidates[r][c].has(val) && candidates[r][c].size > 1) {
          rows.push(r);
        }
      }
      if (rows.length < 2) continue;

      const boxRow = Math.floor(rows[0] / 3);
      if (rows.every(r => Math.floor(r / 3) === boxRow)) {
        // All in same box – eliminate from rest of box
        const boxStartR = boxRow * 3;
        const boxStartC = Math.floor(c / 3) * 3;
        for (let br = boxStartR; br < boxStartR + 3; br++) {
          for (let bc = boxStartC; bc < boxStartC + 3; bc++) {
            if (bc === c) continue;
            if (candidates[br][bc].has(val)) {
              candidates[br][bc].delete(val);
              progress = true;
              eliminations++;
            }
          }
        }
      }
    }
  }

  return { name: 'boxLineReduction', progress, eliminations };
}

// --- Utilities ---

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const val of a) {
    if (!b.has(val)) return false;
  }
  return true;
}

// --- Main solver ---

const TECHNIQUES = [
  applyNakedSingles,
  applyHiddenSingles,
  applyNakedPairs,
  applyHiddenPairs,
  applyPointingPairs,
  applyBoxLineReduction,
];

export function solvePuzzle(grid) {
  const candidates = initCandidates(grid);
  const log = [];

  if (isInvalid(candidates)) {
    return { solved: false, solution: null, log };
  }

  let maxIterations = 200;
  while (maxIterations-- > 0) {
    if (isSolved(candidates)) break;
    if (isInvalid(candidates)) return { solved: false, solution: null, log };

    let madeProgress = false;
    for (const technique of TECHNIQUES) {
      const result = technique(candidates);
      if (result.progress) {
        log.push({ technique: result.name, eliminations: result.eliminations });
        madeProgress = true;
        break; // restart from simplest technique
      }
    }

    if (!madeProgress) break;
  }

  if (isSolved(candidates)) {
    return { solved: true, solution: extractSolution(candidates), log };
  }

  return { solved: false, solution: null, log };
}

/**
 * Analyze difficulty metrics from a solver log.
 */
export function analyzeDifficulty(log) {
  const counts = {
    nakedSingles: 0,
    hiddenSingles: 0,
    nakedPairs: 0,
    hiddenPairs: 0,
    pointingPairs: 0,
    boxLineReduction: 0,
    totalEliminations: 0,
    advancedTechniqueUses: 0,
  };

  for (const entry of log) {
    if (counts[entry.technique] !== undefined) {
      counts[entry.technique]++;
    }
    counts.totalEliminations += entry.eliminations;
  }

  counts.advancedTechniqueUses =
    counts.nakedPairs + counts.hiddenPairs +
    counts.pointingPairs + counts.boxLineReduction;

  return counts;
}

/**
 * Check if difficulty meets "medium" criteria.
 */
export function isMediumDifficulty(log) {
  const metrics = analyzeDifficulty(log);
  return metrics.advancedTechniqueUses >= 3 && metrics.totalEliminations >= 8;
}

// Export for testing
export { initCandidates, UNITS, getUnitsForCell };
