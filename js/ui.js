// ui.js – DOM rendering and touch interaction

export function initUI(board, timer, ranking, onNewGame) {
  const gridEl = document.getElementById('grid');
  const timerEl = document.getElementById('timer');
  const overlay = document.getElementById('overlay');
  const overlayTime = document.getElementById('overlay-time');
  const overlayRank = document.getElementById('overlay-rank');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const btnNewGame = document.getElementById('btn-new-game');
  const btnNotes = document.getElementById('btn-notes');
  const btnErase = document.getElementById('btn-erase');
  const rankingPanel = document.getElementById('ranking-panel');
  const rankingList = document.getElementById('ranking-list');
  const rankingToggle = document.getElementById('ranking-toggle-btn');

  const btnCheck = document.getElementById('btn-check');
  const btnPause = document.getElementById('btn-pause');
  const btnHint = document.getElementById('btn-hint');
  const pauseOverlay = document.getElementById('pause-overlay');

  let selectedRow = -1;
  let selectedCol = -1;
  let notesMode = false;
  let gameEnded = false;
  let paused = false;
  let wrongCells = new Set();

  // Build grid cells
  gridEl.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', () => selectCell(r, c));
      gridEl.appendChild(cell);
    }
  }

  // Number buttons
  for (let n = 1; n <= 9; n++) {
    const btn = document.getElementById(`num-${n}`);
    if (btn) {
      btn.addEventListener('click', () => enterNumber(n));
    }
  }

  // Action buttons
  btnNotes.addEventListener('click', toggleNotesMode);
  btnErase.addEventListener('click', eraseCell);
  btnNewGame.addEventListener('click', () => {
    hideOverlay();
    onNewGame();
  });
  btnPlayAgain.addEventListener('click', () => {
    hideOverlay();
    onNewGame();
  });

  // Pause button
  btnPause.addEventListener('click', () => {
    if (gameEnded) return;
    togglePause();
  });

  // Hint button
  btnHint.addEventListener('click', () => {
    if (gameEnded || paused) return;
    revealHint();
  });

  // Check / give up button
  btnCheck.addEventListener('click', () => {
    if (gameEnded) return;
    if (paused) togglePause();
    endGame();
  });

  // Ranking toggle
  const rankingBackdrop = document.getElementById('ranking-backdrop');

  function openRanking() {
    rankingPanel.classList.add('visible');
    rankingBackdrop.classList.add('visible');
    updateRankingDisplay();
  }

  function closeRanking() {
    rankingPanel.classList.remove('visible');
    rankingBackdrop.classList.remove('visible');
  }

  rankingToggle.addEventListener('click', () => {
    if (rankingPanel.classList.contains('visible')) {
      closeRanking();
    } else {
      openRanking();
    }
  });

  // Ranking close
  const rankingCloseBtn = document.getElementById('ranking-close-btn');
  rankingCloseBtn.addEventListener('click', closeRanking);
  rankingBackdrop.addEventListener('click', closeRanking);

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      enterNumber(num);
      e.preventDefault();
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      eraseCell();
      e.preventDefault();
    }
    if (e.key === 'n' || e.key === 'N') {
      toggleNotesMode();
      e.preventDefault();
    }
    // Arrow key navigation
    if (e.key === 'ArrowUp' && selectedRow > 0) { selectCell(selectedRow - 1, selectedCol); e.preventDefault(); }
    if (e.key === 'ArrowDown' && selectedRow < 8) { selectCell(selectedRow + 1, selectedCol); e.preventDefault(); }
    if (e.key === 'ArrowLeft' && selectedCol > 0) { selectCell(selectedRow, selectedCol - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight' && selectedCol < 8) { selectCell(selectedRow, selectedCol + 1); e.preventDefault(); }
  });

  function selectCell(r, c) {
    selectedRow = r;
    selectedCol = c;
    renderGrid();
  }

  function enterNumber(n) {
    if (gameEnded || paused) return;
    if (selectedRow < 0 || selectedCol < 0) return;
    const cell = board.getCell(selectedRow, selectedCol);
    if (cell.given) return;

    if (notesMode) {
      board.toggleNote(selectedRow, selectedCol, n);
    } else {
      board.setCell(selectedRow, selectedCol, n);
    }
    renderGrid();
    updateNumberCompletion();
    checkCompletion();
  }

  function eraseCell() {
    if (gameEnded || paused) return;
    if (selectedRow < 0 || selectedCol < 0) return;
    board.clearCell(selectedRow, selectedCol);
    renderGrid();
    updateNumberCompletion();
  }

  function toggleNotesMode() {
    notesMode = !notesMode;
    btnNotes.classList.toggle('active', notesMode);
  }

  function renderGrid() {
    const cells = gridEl.querySelectorAll('.cell');
    const selectedValue = selectedRow >= 0 && selectedCol >= 0
      ? board.getCell(selectedRow, selectedCol).value
      : 0;

    cells.forEach(cellEl => {
      const r = parseInt(cellEl.dataset.row);
      const c = parseInt(cellEl.dataset.col);
      const data = board.getCell(r, c);

      // Reset classes
      cellEl.className = 'cell';
      if (data.given) {
        cellEl.classList.add('given');
      } else if (data.value !== 0) {
        cellEl.classList.add('player-value');
      }
      if (data.isError) cellEl.classList.add('error');

      // Show red cross on cells that were wrong before solution reveal
      if (gameEnded && wrongCells.has(`${r},${c}`)) {
        cellEl.classList.add('wrong');
      }

      // Highlighting
      if (r === selectedRow && c === selectedCol) {
        cellEl.classList.add('selected');
      } else if (selectedRow >= 0) {
        const sameRow = r === selectedRow;
        const sameCol = c === selectedCol;
        const sameBox = Math.floor(r / 3) === Math.floor(selectedRow / 3) &&
                        Math.floor(c / 3) === Math.floor(selectedCol / 3);
        if (sameRow || sameCol || sameBox) {
          cellEl.classList.add('highlighted');
        }
        if (selectedValue !== 0 && data.value === selectedValue) {
          cellEl.classList.add('same-value');
        }
      }

      // Re-set data attributes for CSS borders
      cellEl.dataset.row = r;
      cellEl.dataset.col = c;

      // Content
      if (data.value !== 0) {
        cellEl.textContent = data.value;
      } else if (data.notes.size > 0) {
        cellEl.textContent = '';
        const notesGrid = document.createElement('div');
        notesGrid.className = 'notes-grid';
        for (let n = 1; n <= 9; n++) {
          const noteEl = document.createElement('span');
          noteEl.className = 'note';
          noteEl.textContent = data.notes.has(n) ? n : '';
          notesGrid.appendChild(noteEl);
        }
        cellEl.appendChild(notesGrid);
      } else {
        cellEl.textContent = '';
      }
    });
  }

  function updateNumberCompletion() {
    const player = board.getPlayer();
    const counts = Array(10).fill(0);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (player[r][c] !== 0) counts[player[r][c]]++;
      }
    }
    for (let n = 1; n <= 9; n++) {
      const btn = document.getElementById(`num-${n}`);
      if (btn) {
        btn.classList.toggle('completed', counts[n] >= 9);
      }
    }
  }

  function checkCompletion() {
    if (board.isComplete() && board.checkSolution()) {
      const elapsed = timer.stop();
      showCompletionOverlay(elapsed);
    }
  }

  function showCompletionOverlay(elapsed) {
    overlayTime.textContent = timer.formatTime(elapsed);
    const result = ranking.addRanking({
      time: elapsed,
      date: new Date().toLocaleDateString(),
    });
    if (result.isTopTen) {
      overlayRank.textContent = `Platz ${result.rank} in der Bestenliste!`;
    } else {
      overlayRank.textContent = '';
    }
    overlay.classList.add('visible');
    updateRankingDisplay();
  }

  function hideOverlay() {
    overlay.classList.remove('visible');
  }

  function updateRankingDisplay() {
    const rankings = ranking.getRankings();
    rankingList.innerHTML = '';
    if (rankings.length === 0) {
      rankingList.innerHTML = '<li style="justify-content:center;color:var(--number-dim)">Noch keine Einträge</li>';
      return;
    }
    rankings.forEach((entry, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="rank-num">${idx + 1}.</span>
        <span class="rank-time">${entry.formattedTime}</span>
        <span class="rank-date">${entry.date}</span>
      `;
      rankingList.appendChild(li);
    });
  }

  function togglePause() {
    paused = !paused;
    if (paused) {
      timer.stop();
      btnPause.textContent = '▶';
      pauseOverlay.classList.add('visible');
    } else {
      timer.start();
      btnPause.textContent = '⏸';
      pauseOverlay.classList.remove('visible');
    }
  }

  function revealHint() {
    if (selectedRow < 0 || selectedCol < 0) return;
    const cell = board.getCell(selectedRow, selectedCol);
    if (cell.given) return;
    const solution = board.getSolution();
    board.setCell(selectedRow, selectedCol, solution[selectedRow][selectedCol]);
    renderGrid();
    updateNumberCompletion();
    checkCompletion();
  }

  function endGame() {
    gameEnded = true;
    timer.stop();
    wrongCells = new Set();
    const solution = board.getSolution();
    // Mark wrong cells before overwriting
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = board.getCell(r, c);
        if (!cell.given && cell.value !== 0 && cell.value !== solution[r][c]) {
          wrongCells.add(`${r},${c}`);
        }
      }
    }
    // Fill in the complete solution
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = board.getCell(r, c);
        if (!cell.given) {
          board.setCell(r, c, solution[r][c]);
        }
      }
    }
    selectedRow = -1;
    selectedCol = -1;
    btnCheck.classList.add('active');
    renderGrid();
  }

  // Public API
  return {
    renderGrid,
    updateRankingDisplay,
    updateNumberCompletion,
    reset() {
      selectedRow = -1;
      selectedCol = -1;
      notesMode = false;
      gameEnded = false;
      paused = false;
      wrongCells = new Set();
      btnNotes.classList.remove('active');
      btnCheck.classList.remove('active');
      btnPause.textContent = '⏸';
      pauseOverlay.classList.remove('visible');
      hideOverlay();
      renderGrid();
      updateNumberCompletion();
      updateRankingDisplay();
    },
  };
}
