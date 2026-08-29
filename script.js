let currentSolution = [];
let currentPuzzle = [];
let selectedCell = null;
let moveHistory = [];
let redoStack = [];
let hintTargetCell = null;
let hintTargetValue = null;

// Settings & State
let isHighlightEnabled = true;
let activeHighlightNumber = null;
let isPencilMode = false;

const diffModes = ["Beginner", "Easy", "Hard", "Expert"];
const diffTargets = [50, 40, 30, 22];
let activeDiffIndex = 1;
let selectedDiffIndex = 1;

let pendingConfirmAction = null;
let timerInterval;
let secondsElapsed = 0;
const timerElement = document.getElementById("timer");
const boardElement = document.getElementById("board");
const message = document.getElementById("message");

// --- ALGORITHM: SUDOKU BACKTRACKING ENGINE ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function isSafe(board, row, col, num) {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num || board[x][col] === num) return false;
  }
  let startRow = row - (row % 3);
  let startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i + startRow][j + startCol] === num) return false;
    }
  }
  return true;
}

function findEmpty(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return [r, c];
    }
  }
  return null;
}

function solveBoard(board) {
  let emptyPos = findEmpty(board);
  if (!emptyPos) return true;
  let [row, col] = emptyPos;
  let nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (let num of nums) {
    if (isSafe(board, row, col, num)) {
      board[row][col] = num;
      if (solveBoard(board)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}

function countSolutions(board) {
  let emptyPos = findEmpty(board);
  if (!emptyPos) return 1;
  let [row, col] = emptyPos;
  let count = 0;
  for (let num = 1; num <= 9; num++) {
    if (isSafe(board, row, col, num)) {
      board[row][col] = num;
      count += countSolutions(board);
      board[row][col] = 0;
      if (count > 1) return count;
    }
  }
  return count;
}

function generateNewPuzzle(difficultyIndex) {
  let board = Array.from({ length: 9 }, () => Array(9).fill(0));
  solveBoard(board);
  currentSolution = board.map((row) => [...row]);
  let targetClues = diffTargets[difficultyIndex];
  let cellsToHide = 81 - targetClues;
  let coords = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      coords.push([r, c]);
    }
  }
  coords = shuffleArray(coords);
  for (let i = 0; i < coords.length; i++) {
    if (cellsToHide <= 0) break;
    let [r, c] = coords[i];
    let backup = board[r][c];
    board[r][c] = 0;
    let boardCopy = board.map((row) => [...row]);
    if (countSolutions(boardCopy) !== 1) {
      board[r][c] = backup;
    } else {
      cellsToHide--;
    }
  }
  currentPuzzle = board;
}

// --- MODALS UI LOGIC ---
document.querySelectorAll(".close-modal").forEach((btn) => {
  btn.addEventListener("click", function () {
    const targetId = this.getAttribute("data-target");
    document.getElementById(targetId).classList.add("hidden");
  });
});

document
  .getElementById("settings-btn")
  .addEventListener("click", () =>
    document.getElementById("settings-modal").classList.remove("hidden"),
  );
document
  .getElementById("nav-bulb-btn")
  .addEventListener("click", () =>
    document.getElementById("tools-modal").classList.remove("hidden"),
  );
document.getElementById("nav-difficulty-btn").addEventListener("click", () => {
  selectedDiffIndex = activeDiffIndex;
  updateDiffDisplay();
  document.getElementById("difficulty-modal").classList.remove("hidden");
});

document.getElementById("highlight-toggle").addEventListener("change", (e) => {
  isHighlightEnabled = e.target.checked;
  localStorage.setItem("sudoku-highlight-enabled", isHighlightEnabled);
  updateHighlights(activeHighlightNumber);
});

// Dark Mode Toggle Logic (persisted)
document.getElementById("dark-mode-toggle").addEventListener("change", (e) => {
  if (e.target.checked) document.body.classList.add("dark-mode");
  else document.body.classList.remove("dark-mode");
  localStorage.setItem("sudoku-dark-mode", e.target.checked);
});

const pencilBtn = document.getElementById("pencil-btn");
function applyPencilButtonState() {
  if (isPencilMode) {
    pencilBtn.classList.add("active");
    pencilBtn.classList.remove("secondary");
    pencilBtn.innerHTML = `<span style="font-size: 20px;"><img src="Icons/pen-solid-full.svg" alt="" height="20px" width="20px"/></span> Pencil Mode: ON`;
  } else {
    pencilBtn.classList.remove("active");
    pencilBtn.classList.add("secondary");
    pencilBtn.innerHTML = `<span style="font-size: 20px;"><img src="Icons/pen-solid-full.svg" alt="" height="20px" width="20px"/></span> Pencil Mode: OFF`;
  }
}
pencilBtn.addEventListener("click", () => {
  isPencilMode = !isPencilMode;
  applyPencilButtonState();
  localStorage.setItem("sudoku-pencil-mode", isPencilMode);
});

// --- PERSISTED SETTINGS ---
// Restores dark mode, highlight toggle, and pencil mode from a previous visit
// so a first-time player who sets these up doesn't have to redo them every time.
function loadPersistedSettings() {
  const savedDark = localStorage.getItem("sudoku-dark-mode");
  if (savedDark === "true") {
    document.body.classList.add("dark-mode");
    document.getElementById("dark-mode-toggle").checked = true;
  }

  const savedHighlight = localStorage.getItem("sudoku-highlight-enabled");
  if (savedHighlight !== null) {
    isHighlightEnabled = savedHighlight === "true";
    document.getElementById("highlight-toggle").checked = isHighlightEnabled;
  }

  const savedPencil = localStorage.getItem("sudoku-pencil-mode");
  if (savedPencil === "true") {
    isPencilMode = true;
    applyPencilButtonState();
  }
}

// --- PERSONAL BEST TIMES ---
function getBestTimesMap() {
  try {
    return JSON.parse(localStorage.getItem("sudoku-best-times")) || {};
  } catch (e) {
    return {};
  }
}

function refreshBestTimeDisplay() {
  const bestTimes = getBestTimesMap();
  const best = bestTimes[diffModes[activeDiffIndex]];
  const bestTimeElement = document.getElementById("best-time");
  if (bestTimeElement) {
    bestTimeElement.innerText =
      best !== undefined ? `Best: ${formatTime(best)}` : "Best: --:--";
  }
}

function showConfirmModal(msg, actionFunction) {
  document.getElementById("confirm-message").innerText = msg;
  pendingConfirmAction = actionFunction;
  document.getElementById("confirm-modal").classList.remove("hidden");
}

document.getElementById("confirm-yes").addEventListener("click", () => {
  if (pendingConfirmAction) pendingConfirmAction();
  document.getElementById("confirm-modal").classList.add("hidden");
});

document.getElementById("confirm-no").addEventListener("click", () => {
  pendingConfirmAction = null;
  document.getElementById("confirm-modal").classList.add("hidden");
});

function updateDiffDisplay() {
  document.getElementById("diff-display").innerText =
    diffModes[selectedDiffIndex];
}
document.getElementById("diff-prev").addEventListener("click", () => {
  if (selectedDiffIndex > 0) selectedDiffIndex--;
  updateDiffDisplay();
});
document.getElementById("diff-next").addEventListener("click", () => {
  if (selectedDiffIndex < diffModes.length - 1) selectedDiffIndex++;
  updateDiffDisplay();
});
document.getElementById("diff-start").addEventListener("click", () => {
  activeDiffIndex = selectedDiffIndex;
  document.getElementById("difficulty-modal").classList.add("hidden");
  startNewGame();
});

document
  .getElementById("nav-new-btn")
  .addEventListener("click", () =>
    showConfirmModal(
      "Are you sure you want to start a completely new game?",
      startNewGame,
    ),
  );
document
  .getElementById("nav-restart-btn")
  .addEventListener("click", () =>
    showConfirmModal(
      "Are you sure you want to restart the current board?",
      restartCurrentGame,
    ),
  );
document.getElementById("nav-undo-btn").addEventListener("click", undoLastMove);
document.getElementById("nav-redo-btn").addEventListener("click", redoLastMove);

// --- STATE MANAGEMENT ---
function getBoardSnapshot() {
  let snapshot = [];
  document.querySelectorAll(".cell").forEach((cell) => {
    snapshot.push({
      val: cell.dataset.val,
      notes: cell.dataset.notes,
      fixed: cell.dataset.fixed,
    });
  });
  return snapshot;
}

// --- RENDERING ENGINE ---
function updateCellDisplay(cell) {
  cell.innerHTML = "";
  let val = cell.dataset.val;

  if (val && val !== "") {
    const span = document.createElement("span");
    span.classList.add("big-number");
    span.innerText = val;
    cell.appendChild(span);
  } else {
    let notes = cell.dataset.notes ? cell.dataset.notes.split(",") : [];
    if (notes.length > 0) {
      const grid = document.createElement("div");
      grid.classList.add("notes-grid");
      for (let i = 1; i <= 9; i++) {
        const noteSpan = document.createElement("span");
        noteSpan.classList.add("note");
        if (notes.includes(i.toString())) {
          noteSpan.innerText = i;
          noteSpan.dataset.noteVal = i;
        }
        grid.appendChild(noteSpan);
      }
      cell.appendChild(grid);
    }
  }
}

// --- CORE GAME ACTIONS ---
function restartCurrentGame() {
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.remove("error-highlight");
    if (cell.dataset.fixed === "false") {
      cell.dataset.val = "";
      cell.dataset.notes = "";
      updateCellDisplay(cell);
    }
  });
  moveHistory = [];
  redoStack = [];
  selectedCell = null;
  updateHighlights(null);
  updateCounts();
  message.innerText = "";
  startTimer();
}

function undoLastMove() {
  if (moveHistory.length === 0) return;
  redoStack.push(getBoardSnapshot());
  const lastSnapshot = moveHistory.pop();
  document.querySelectorAll(".cell").forEach((cell, index) => {
    let snap = lastSnapshot[index];
    cell.dataset.val = snap.val;
    cell.dataset.notes = snap.notes;
    // Restore the fixed/locked state too - otherwise undoing a "Get a Hint" move
    // leaves the cell permanently blank AND locked, since it would still carry
    // fixed="true" from the hint even after its value is reverted.
    if (snap.fixed !== undefined) {
      cell.dataset.fixed = snap.fixed;
      cell.classList.toggle("fixed", snap.fixed === "true");
    }
    cell.classList.remove("error-highlight");
    updateCellDisplay(cell);
  });
  updateCounts();
  updateHighlights(activeHighlightNumber);
  checkBoard();
}

function redoLastMove() {
  if (redoStack.length === 0) return;
  moveHistory.push(getBoardSnapshot());
  const nextSnapshot = redoStack.pop();
  document.querySelectorAll(".cell").forEach((cell, index) => {
    let snap = nextSnapshot[index];
    cell.dataset.val = snap.val;
    cell.dataset.notes = snap.notes;
    if (snap.fixed !== undefined) {
      cell.dataset.fixed = snap.fixed;
      cell.classList.toggle("fixed", snap.fixed === "true");
    }
    cell.classList.remove("error-highlight");
    updateCellDisplay(cell);
  });
  updateCounts();
  updateHighlights(activeHighlightNumber);
  checkBoard();
}

// ... (Keep all your state variables, backtracking algorithm, and modal logic at the top exactly the same) ...

function updateHighlights(num) {
  activeHighlightNumber = num;

  // Clear all highlights
  document
    .querySelectorAll(".cell")
    .forEach((cell) => cell.classList.remove("highlight-circle"));
  document
    .querySelectorAll(".note")
    .forEach((note) => note.classList.remove("highlight-circle"));
  document
    .querySelectorAll(".numpad-btn")
    .forEach((btn) => btn.classList.remove("highlight-active"));

  if (!isHighlightEnabled || !num || num === "X") return;

  // Highlight big cells
  document.querySelectorAll(".cell").forEach((cell) => {
    if (cell.dataset.val === num) cell.classList.add("highlight-circle");
  });

  // Highlight tiny notes
  document.querySelectorAll(".note").forEach((note) => {
    if (note.dataset.noteVal === num) note.classList.add("highlight-circle");
  });

  // NEW: Highlight the numpad button itself
  document.querySelectorAll(".numpad-btn").forEach((btn) => {
    if (btn.dataset.val === num) btn.classList.add("highlight-active");
  });
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function startTimer() {
  clearInterval(timerInterval);
  secondsElapsed = 0;
  timerElement.innerText = "00:00";
  timerInterval = setInterval(() => {
    secondsElapsed++;
    timerElement.innerText = formatTime(secondsElapsed);
  }, 1000);
}
function stopTimer() {
  clearInterval(timerInterval);
}

function updateCounts() {
  const counts = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9 };
  document.querySelectorAll(".cell").forEach((cell) => {
    if (cell.dataset.val >= "1" && cell.dataset.val <= "9")
      counts[cell.dataset.val]--;
  });
  for (let i = 1; i <= 9; i++) {
    const countSpan = document.getElementById(`count-${i}`);
    if (countSpan) countSpan.innerText = Math.max(0, counts[i]);
  }
}

function checkBoard() {
  const cells = document.querySelectorAll(".cell");
  let isComplete = true;
  let isCorrect = true;

  cells.forEach((cell) => {
    const r = cell.dataset.row;
    const c = cell.dataset.col;
    const expectedValue = currentSolution[r][c].toString();
    if (cell.dataset.val === "") isComplete = false;
    else if (cell.dataset.val !== expectedValue) isCorrect = false;
  });

  if (isComplete && isCorrect) {
    stopTimer();

    const diffName = diffModes[activeDiffIndex];
    const bestTimes = getBestTimesMap();
    const prevBest = bestTimes[diffName];
    const isNewBest = prevBest === undefined || secondsElapsed < prevBest;

    if (isNewBest) {
      bestTimes[diffName] = secondsElapsed;
      localStorage.setItem("sudoku-best-times", JSON.stringify(bestTimes));
    }
    refreshBestTimeDisplay();

    message.innerText = isNewBest
      ? `New Best! You solved ${diffName} Mode in ${formatTime(secondsElapsed)}!`
      : `Congratulations! You solved ${diffName} Mode in ${formatTime(secondsElapsed)}!`;
    message.style.color = "#4caf50";

    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    boardElement.classList.add("board-win-pulse");
    setTimeout(() => boardElement.classList.remove("board-win-pulse"), 1000);
  } else {
    message.innerText = "";
  }
}

function startNewGame() {
  boardElement.innerHTML = "";
  message.innerText = "Generating Board...";
  setTimeout(() => {
    selectedCell = null;
    moveHistory = [];
    redoStack = [];
    updateHighlights(null);
    generateNewPuzzle(activeDiffIndex);
    startTimer();
    refreshBestTimeDisplay();
    message.innerText = "";

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const wrapper = document.createElement("div");
        wrapper.classList.add("cell-wrapper");
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.dataset.val = "";
        cell.dataset.notes = "";

        let val = currentPuzzle[row][col];
        if (val !== 0) {
          cell.dataset.val = val.toString();
          cell.classList.add("fixed");
          cell.dataset.fixed = "true";
        } else {
          cell.dataset.fixed = "false";
        }

        updateCellDisplay(cell);

        // FIXED KEYBOARD NAV: We now allow fixed cells to become selectedCell!
        cell.addEventListener("click", function () {
          document
            .querySelectorAll(".cell")
            .forEach((c) => c.classList.remove("selected"));

          this.classList.add("selected");
          selectedCell = this;

          if (this.dataset.val) updateHighlights(this.dataset.val);
          else updateHighlights(null);
        });

        wrapper.appendChild(cell);
        boardElement.appendChild(wrapper);
      }
    }
    updateCounts();
  }, 50);
}

// --- AUTO-REMOVE NOTES LOGIC ---
function removeNotesFromPeers(row, col, numStr) {
  document.querySelectorAll(".cell").forEach((cell) => {
    let r = cell.dataset.row;
    let c = cell.dataset.col;
    let sameRow = r === row;
    let sameCol = c === col;
    let sameBox =
      Math.floor(r / 3) === Math.floor(row / 3) &&
      Math.floor(c / 3) === Math.floor(col / 3);

    if ((sameRow || sameCol || sameBox) && !(r === row && c === col)) {
      if (cell.dataset.notes) {
        let notesArray = cell.dataset.notes.split(",");
        if (notesArray.includes(numStr)) {
          notesArray = notesArray.filter((n) => n !== numStr);
          cell.dataset.notes = notesArray.join(",");
          updateCellDisplay(cell);
        }
      }
    }
  });
}

// --- INPUT HANDLING ---
function enterNumber(val) {
  // 1. HIGHLIGHT GLOBALLY First (Even if no cell is selected)
  updateHighlights(val === "X" ? null : val);

  // 2. Prevent edits on empty selections or fixed cells
  if (!selectedCell || selectedCell.dataset.fixed === "true") return;

  const snapshotBeforeMove = getBoardSnapshot();
  let stateChanged = false;

  if (val === "X") {
    if (selectedCell.dataset.val !== "" || selectedCell.dataset.notes !== "") {
      selectedCell.dataset.val = "";
      selectedCell.dataset.notes = "";
      stateChanged = true;
    }
  } else {
    if (isPencilMode) {
      if (selectedCell.dataset.val === "") {
        let notesArray = selectedCell.dataset.notes
          ? selectedCell.dataset.notes.split(",")
          : [];
        if (notesArray.includes(val))
          notesArray = notesArray.filter((n) => n !== val);
        else {
          notesArray.push(val);
          notesArray.sort();
        }
        selectedCell.dataset.notes = notesArray.join(",");
        stateChanged = true;
      }
    } else {
      if (selectedCell.dataset.val !== val) {
        selectedCell.dataset.val = val;
        selectedCell.dataset.notes = "";
        removeNotesFromPeers(
          selectedCell.dataset.row,
          selectedCell.dataset.col,
          val,
        );
        stateChanged = true;
      }
    }
  }

  if (stateChanged) {
    moveHistory.push(snapshotBeforeMove);
    redoStack = [];
    selectedCell.classList.remove("error-highlight");
    updateCellDisplay(selectedCell);
    checkBoard();
    updateCounts();
  }
}

document.querySelectorAll(".numpad-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    enterNumber(this.getAttribute("data-val"));
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "9") {
    enterNumber(e.key);
  } else if (e.key === "Backspace" || e.key === "Delete") {
    enterNumber("X");
  } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    undoLastMove();
  } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) {
    e.preventDefault();
    redoLastMove();
  } else if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "w",
      "a",
      "s",
      "d",
      "W",
      "A",
      "S",
      "D",
    ].includes(e.key)
  ) {
    if (!selectedCell) return;

    let r = parseInt(selectedCell.dataset.row);
    let c = parseInt(selectedCell.dataset.col);

    switch (e.key.toLowerCase()) {
      case "arrowup":
      case "w":
        r = Math.max(0, r - 1);
        break;
      case "arrowdown":
      case "s":
        r = Math.min(8, r + 1);
        break;
      case "arrowleft":
      case "a":
        c = Math.max(0, c - 1);
        break;
      case "arrowright":
      case "d":
        c = Math.min(8, c + 1);
        break;
    }

    const newCell = document.querySelector(
      `.cell[data-row="${r}"][data-col="${c}"]`,
    );
    if (newCell) {
      newCell.click();
    }
  }
});

// --- TOOLS MENU UPDATES ---
document.getElementById("tool-validate").addEventListener("click", () => {
  document.querySelectorAll(".cell").forEach((cell) => {
    if (cell.dataset.val !== "" && cell.dataset.fixed === "false") {
      const r = cell.dataset.row;
      const c = cell.dataset.col;
      const expectedValue = currentSolution[r][c].toString();
      if (cell.dataset.val !== expectedValue)
        cell.classList.add("error-highlight");
      else cell.classList.remove("error-highlight");
    }
  });
  document.getElementById("tools-modal").classList.add("hidden");
});

// Explain-first hint: rather than instantly filling in the answer, this first
// tries to explain WHY a cell must hold a particular number (naked single /
// hidden single reasoning), and only reveals the number if the player asks for
// it. This teaches solving technique instead of training players to spam hints.
document.getElementById("tool-hint").addEventListener("click", () => {
  document.getElementById("tools-modal").classList.add("hidden");

  let emptyCells = [];
  document.querySelectorAll(".cell").forEach((cell) => {
    if (cell.dataset.val === "") emptyCells.push(cell);
  });

  if (emptyCells.length === 0) {
    alert("The board is full!");
    return;
  }

  // Build a constraint board from clues + only CORRECT entries (same principle
  // as Automatic Notes) so the reasoning we explain is always sound, even if
  // the player has a wrong guess sitting elsewhere on the board.
  let board = Array.from({ length: 9 }, () => Array(9).fill(0));
  document.querySelectorAll(".cell").forEach((cell) => {
    let r = parseInt(cell.dataset.row);
    let c = parseInt(cell.dataset.col);
    if (
      cell.dataset.val !== "" &&
      parseInt(cell.dataset.val) === currentSolution[r][c]
    ) {
      board[r][c] = parseInt(cell.dataset.val);
    }
  });

  function candidatesFor(r, c) {
    let cands = [];
    for (let n = 1; n <= 9; n++) {
      if (isSafe(board, r, c, n)) cands.push(n);
    }
    return cands;
  }

  let chosenCell = null;
  let explanation = "";

  // 1. Look for a "naked single": a cell with only one possible candidate left.
  for (const cell of emptyCells) {
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);
    const cands = candidatesFor(r, c);
    if (cands.length === 1) {
      chosenCell = cell;
      explanation = `This square only has one number left that fits: ${cands[0]}. Every other number 1-9 already appears somewhere in its row, column, or 3x3 box.`;
      break;
    }
  }

  // 2. Otherwise look for a "hidden single": a number that can only go in one
  // square within a given row, column, or box, even if that square has other
  // candidates too.
  if (!chosenCell) {
    searchHiddenSingle: for (const cell of emptyCells) {
      const r = parseInt(cell.dataset.row);
      const c = parseInt(cell.dataset.col);
      const cands = candidatesFor(r, c);

      for (const n of cands) {
        let onlyInRow = true;
        for (let cc = 0; cc < 9 && onlyInRow; cc++) {
          if (cc === c || board[r][cc] !== 0) continue;
          if (candidatesFor(r, cc).includes(n)) onlyInRow = false;
        }
        if (onlyInRow) {
          chosenCell = cell;
          explanation = `Look at this row - ${n} can only fit in this one square. Every other empty square in the row already rules ${n} out.`;
          break searchHiddenSingle;
        }

        let onlyInCol = true;
        for (let rr = 0; rr < 9 && onlyInCol; rr++) {
          if (rr === r || board[rr][c] !== 0) continue;
          if (candidatesFor(rr, c).includes(n)) onlyInCol = false;
        }
        if (onlyInCol) {
          chosenCell = cell;
          explanation = `Look at this column - ${n} can only fit in this one square. Every other empty square in the column already rules ${n} out.`;
          break searchHiddenSingle;
        }

        let br = Math.floor(r / 3) * 3;
        let bc = Math.floor(c / 3) * 3;
        let onlyInBox = true;
        for (let i = 0; i < 3 && onlyInBox; i++) {
          for (let j = 0; j < 3 && onlyInBox; j++) {
            let rr = br + i,
              cc = bc + j;
            if ((rr === r && cc === c) || board[rr][cc] !== 0) continue;
            if (candidatesFor(rr, cc).includes(n)) onlyInBox = false;
          }
        }
        if (onlyInBox) {
          chosenCell = cell;
          explanation = `Look at this 3x3 box - ${n} can only fit in this one square, even though this square has other candidates too.`;
          break searchHiddenSingle;
        }
      }
    }
  }

  // 3. Fallback: pick any empty cell and be upfront that it needs a more
  // advanced technique rather than pretending there's simple logic here.
  if (!chosenCell) {
    chosenCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    explanation =
      "This one needs a more advanced technique to spot by eye. Want me to just fill it in?";
  }

  hintTargetCell = chosenCell;
  hintTargetValue =
    currentSolution[parseInt(chosenCell.dataset.row)][
      parseInt(chosenCell.dataset.col)
    ].toString();

  document
    .querySelectorAll(".cell")
    .forEach((c) => c.classList.remove("selected"));
  chosenCell.classList.add("selected");
  selectedCell = chosenCell;
  chosenCell.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center",
  });

  document.getElementById("hint-explanation").innerText = explanation;
  document.getElementById("hint-modal").classList.remove("hidden");
});

document.getElementById("hint-gotit-btn").addEventListener("click", () => {
  document.getElementById("hint-modal").classList.add("hidden");
});

document.getElementById("hint-reveal-btn").addEventListener("click", () => {
  document.getElementById("hint-modal").classList.add("hidden");
  if (!hintTargetCell) return;

  moveHistory.push(getBoardSnapshot());
  redoStack = [];

  const targetCell = hintTargetCell;
  const correctValue = hintTargetValue;

  targetCell.dataset.val = correctValue;
  targetCell.dataset.notes = "";
  targetCell.classList.remove("error-highlight");
  targetCell.dataset.fixed = "true";
  targetCell.classList.add("fixed");
  updateCellDisplay(targetCell);

  removeNotesFromPeers(
    targetCell.dataset.row,
    targetCell.dataset.col,
    correctValue,
  );

  targetCell.classList.add("hint-flash");
  setTimeout(() => {
    targetCell.classList.remove("hint-flash");
  }, 3000);

  updateCounts();
  checkBoard();

  hintTargetCell = null;
  hintTargetValue = null;
});

// NEW: Auto Notes Logic
document.getElementById("tool-notes").addEventListener("click", () => {
  // 1. Take snapshot for Undo
  moveHistory.push(getBoardSnapshot());
  redoStack = [];

  // 2. Read the current visible board into a 2D Array.
  // IMPORTANT: only cells whose value actually matches the solution are used as
  // constraints. A wrong guess is treated as if that cell were still empty, so it
  // can never wrongly block a valid candidate number from showing up as a note
  // elsewhere on the board. Without this, one incorrect entry anywhere in a row,
  // column, or box could silently erase correct notes for every peer of that cell.
  let currentDomBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
  document.querySelectorAll(".cell").forEach((cell) => {
    let r = parseInt(cell.dataset.row);
    let c = parseInt(cell.dataset.col);
    if (
      cell.dataset.val !== "" &&
      parseInt(cell.dataset.val) === currentSolution[r][c]
    ) {
      currentDomBoard[r][c] = parseInt(cell.dataset.val);
    }
  });

  // 3. Fill notes for all empty cells using our backtracking isSafe function
  document.querySelectorAll(".cell").forEach((cell) => {
    if (cell.dataset.val === "") {
      let validNotes = [];
      let r = parseInt(cell.dataset.row);
      let c = parseInt(cell.dataset.col);

      for (let i = 1; i <= 9; i++) {
        if (isSafe(currentDomBoard, r, c, i)) {
          validNotes.push(i.toString());
        }
      }

      cell.dataset.notes = validNotes.join(",");
      updateCellDisplay(cell);
    }
  });

  // Close the menu
  document.getElementById("tools-modal").classList.add("hidden");
});

loadPersistedSettings();
startNewGame();
