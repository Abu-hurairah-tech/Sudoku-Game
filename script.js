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

// --- SHARED HINT LIMIT ---
// Both the classic bulb "Get a Hint" tool and the AI Tutor draw from the same
// per-game pool, so a player can't sidestep the cap by switching tools.
const HINTS_PER_GAME = 5;
let hintsRemaining = HINTS_PER_GAME;

function updateHintCounterDisplay() {
  const text = `Hints left: ${hintsRemaining}/${HINTS_PER_GAME}`;
  const t1 = document.getElementById("tools-hint-counter");
  if (t1) t1.innerText = text;
  const t2 = document.getElementById("ai-hint-counter");
  if (t2) t2.innerText = text;

  const revealBtn = document.getElementById("hint-reveal-btn");
  if (revealBtn) revealBtn.disabled = hintsRemaining <= 0;
}

// Attempts to spend one hint from the shared pool. Returns false (and spends
// nothing) once the pool is empty for this game.
function useHint() {
  if (hintsRemaining <= 0) return false;
  hintsRemaining--;
  const profile = loadAiProfile();
  profile.hintsUsedTotal++;
  saveAiProfile(profile);
  updateHintCounterDisplay();
  return true;
}

function resetHintsForNewGame() {
  hintsRemaining = HINTS_PER_GAME;
  updateHintCounterDisplay();
}

// --- AI TUTOR LEARNING PROFILE (persisted locally, grows with play) ---
// This is what lets the tutor "grow": it's not a live neural net, but a
// small profile stored in the browser that remembers how many times each
// technique has already been taught to this player, how many puzzles
// they've finished, and how many of those needed zero hints. The tutor
// reads this profile every time it explains something and adapts its
// wording accordingly (see getAdaptiveTechniqueMsg below).
const AI_PROFILE_KEY = "sudoku-ai-profile";
const MASTERY_THRESHOLD = 3;

function loadAiProfile() {
  const defaults = {
    gamesCompleted: 0,
    hintsUsedTotal: 0,
    noHintWins: 0,
    techniqueExposure: {
      "Naked Single": 0,
      "Hidden Single": 0,
      "Naked Pair": 0,
    },
  };
  try {
    const raw = JSON.parse(localStorage.getItem(AI_PROFILE_KEY));
    if (!raw) return defaults;
    return {
      ...defaults,
      ...raw,
      techniqueExposure: {
        ...defaults.techniqueExposure,
        ...(raw.techniqueExposure || {}),
      },
    };
  } catch (e) {
    return defaults;
  }
}

function saveAiProfile(profile) {
  try {
    localStorage.setItem(AI_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    /* localStorage unavailable - the tutor just won't remember this session */
  }
}

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
  resetAiTutorState();
  resetHintsForNewGame();
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

    // Feed the AI Tutor's learning profile so it can greet the player
    // with real progress next time, and notice hint-free wins.
    const aiProfile = loadAiProfile();
    aiProfile.gamesCompleted++;
    if (hintsRemaining === HINTS_PER_GAME) aiProfile.noHintWins++;
    saveAiProfile(aiProfile);

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
    resetAiTutorState();
    resetHintsForNewGame();
    clearAiChatLog();

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
  if (!hintTargetCell) return;

  if (!useHint()) {
    document.getElementById("hint-explanation").innerText =
      "You've used all your hints for this game — you've already got the logic for this one, give it a shot!";
    return;
  }

  document.getElementById("hint-modal").classList.add("hidden");

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
function runAutoNotes() {
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
}

document.getElementById("tool-notes").addEventListener("click", () => {
  runAutoNotes();
  document.getElementById("tools-modal").classList.add("hidden");
});

// =========================================================
// AI TUTOR
// Rule-based coaching engine that reads the live board and walks the
// player through progressively stronger solving techniques - Naked
// Singles, Hidden Singles, then Naked Pairs - via a tiered, chat-style
// panel rather than instantly spoiling the answer.
// =========================================================

const aiChatLog = document.getElementById("ai-chat-log");
const aiActionHintBtn = document.getElementById("ai-action-hint");
const aiActionCheckBtn = document.getElementById("ai-action-check");
const aiChatInput = document.getElementById("ai-chat-input");
const aiChatSendBtn = document.getElementById("ai-chat-send");

// stage: 0 = no active hint, 1 = area shown, 2 = technique shown, 3 = resolved
let aiTutorState = {
  stage: 0,
  technique: null,
  cell: null,
  value: null,
  areaCells: [],
  pairCells: [],
  pairValues: null,
  affected: [],
};

function resetAiTutorState() {
  clearAiAreaHighlights();
  aiTutorState = {
    stage: 0,
    technique: null,
    cell: null,
    value: null,
    areaCells: [],
    pairCells: [],
    pairValues: null,
    affected: [],
  };
  if (aiActionHintBtn) aiActionHintBtn.innerText = "Give me a hint";
}

function clearAiAreaHighlights() {
  document
    .querySelectorAll(".ai-area-highlight")
    .forEach((c) => c.classList.remove("ai-area-highlight"));
  document
    .querySelectorAll(".ai-target-highlight")
    .forEach((c) => c.classList.remove("ai-target-highlight"));
}

function clearAiChatLog() {
  if (aiChatLog) aiChatLog.innerHTML = "";
}

function addAiMessage(text, sender) {
  if (!aiChatLog) return;
  const bubble = document.createElement("div");
  bubble.classList.add("ai-msg", sender === "user" ? "user" : "ai");
  bubble.innerText = text;
  aiChatLog.appendChild(bubble);
  aiChatLog.scrollTop = aiChatLog.scrollHeight;
}

// --- Board helpers for the tutor engine ---
function getCellEl(r, c) {
  return document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
}

function getConstraintBoardAndEmpties() {
  let board = Array.from({ length: 9 }, () => Array(9).fill(0));
  let emptyCells = [];
  document.querySelectorAll(".cell").forEach((cell) => {
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);
    if (
      cell.dataset.val !== "" &&
      parseInt(cell.dataset.val) === currentSolution[r][c]
    ) {
      board[r][c] = parseInt(cell.dataset.val);
    }
    if (cell.dataset.val === "") emptyCells.push(cell);
  });
  return { board, emptyCells };
}

function candidatesForCell(board, r, c) {
  let cands = [];
  for (let n = 1; n <= 9; n++) {
    if (isSafe(board, r, c, n)) cands.push(n);
  }
  return cands;
}

function getRowCells(r) {
  let cells = [];
  for (let c = 0; c < 9; c++) cells.push(getCellEl(r, c));
  return cells;
}
function getColCells(c) {
  let cells = [];
  for (let r = 0; r < 9; r++) cells.push(getCellEl(r, c));
  return cells;
}
function getBoxCells(startRow, startCol) {
  let cells = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      cells.push(getCellEl(startRow + i, startCol + j));
    }
  }
  return cells;
}

function getAllUnits() {
  const units = [];
  for (let r = 0; r < 9; r++)
    units.push({ type: "row", label: `row ${r + 1}`, cells: getRowCells(r) });
  for (let c = 0; c < 9; c++)
    units.push({
      type: "column",
      label: `column ${c + 1}`,
      cells: getColCells(c),
    });
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      units.push({
        type: "box",
        label: "3x3 box",
        cells: getBoxCells(br * 3, bc * 3),
      });
    }
  }
  return units;
}

// --- Level 1: Naked Single ---
function findNakedSingle(board, emptyCells) {
  for (const cell of emptyCells) {
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);
    const cands = candidatesForCell(board, r, c);
    if (cands.length === 1) {
      return {
        technique: "Naked Single",
        cell,
        value: cands[0].toString(),
        areaType: "cell",
        areaLabel: `Row ${r + 1}, Column ${c + 1}`,
        areaCells: [cell],
        techniqueMsg: `This square has only one candidate left: ${cands[0]}. Every other digit 1-9 is already blocked by its row, column, or box.`,
        revealMsg: `Row ${r + 1}, Column ${c + 1} must be ${cands[0]}.`,
      };
    }
  }
  return null;
}

// --- Level 2: Hidden Single ---
function findHiddenSingle(board, emptyCells) {
  for (const cell of emptyCells) {
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);
    const cands = candidatesForCell(board, r, c);

    for (const n of cands) {
      // Row
      let onlyInRow = true;
      for (let cc = 0; cc < 9 && onlyInRow; cc++) {
        if (cc === c || board[r][cc] !== 0) continue;
        if (candidatesForCell(board, r, cc).includes(n)) onlyInRow = false;
      }
      if (onlyInRow) {
        return {
          technique: "Hidden Single",
          cell,
          value: n.toString(),
          areaType: "row",
          areaLabel: `Row ${r + 1}`,
          areaCells: getRowCells(r),
          techniqueMsg: `Somewhere in row ${r + 1}, the number ${n} can only go in one square - it's already ruled out everywhere else in the row.`,
          revealMsg: `In row ${r + 1}, ${n} can only fit at Column ${c + 1}.`,
        };
      }

      // Column
      let onlyInCol = true;
      for (let rr = 0; rr < 9 && onlyInCol; rr++) {
        if (rr === r || board[rr][c] !== 0) continue;
        if (candidatesForCell(board, rr, c).includes(n)) onlyInCol = false;
      }
      if (onlyInCol) {
        return {
          technique: "Hidden Single",
          cell,
          value: n.toString(),
          areaType: "column",
          areaLabel: `Column ${c + 1}`,
          areaCells: getColCells(c),
          techniqueMsg: `Somewhere in column ${c + 1}, the number ${n} can only go in one square - it's already ruled out everywhere else in the column.`,
          revealMsg: `In column ${c + 1}, ${n} can only fit at Row ${r + 1}.`,
        };
      }

      // Box
      let br = Math.floor(r / 3) * 3;
      let bc = Math.floor(c / 3) * 3;
      let onlyInBox = true;
      for (let i = 0; i < 3 && onlyInBox; i++) {
        for (let j = 0; j < 3 && onlyInBox; j++) {
          let rr = br + i,
            cc = bc + j;
          if ((rr === r && cc === c) || board[rr][cc] !== 0) continue;
          if (candidatesForCell(board, rr, cc).includes(n)) onlyInBox = false;
        }
      }
      if (onlyInBox) {
        return {
          technique: "Hidden Single",
          cell,
          value: n.toString(),
          areaType: "box",
          areaLabel: "This 3x3 box",
          areaCells: getBoxCells(br, bc),
          techniqueMsg: `Inside this 3x3 box, the number ${n} can only go in one square, even though that square still has other candidates too.`,
          revealMsg: `In this box, ${n} can only fit at Row ${r + 1}, Column ${c + 1}.`,
        };
      }
    }
  }
  return null;
}

// --- Level 3: Naked Pair (elimination technique, doesn't fill a value) ---
function findNakedPair(board, emptyCells) {
  const units = getAllUnits();
  for (const unit of units) {
    const emptyInUnit = unit.cells.filter((c) => c.dataset.val === "");
    const candMap = emptyInUnit.map((c) => ({
      cell: c,
      cands: candidatesForCell(
        board,
        parseInt(c.dataset.row),
        parseInt(c.dataset.col),
      ),
    }));

    for (let i = 0; i < candMap.length; i++) {
      if (candMap[i].cands.length !== 2) continue;
      for (let j = i + 1; j < candMap.length; j++) {
        if (candMap[j].cands.length !== 2) continue;
        if (
          candMap[i].cands[0] === candMap[j].cands[0] &&
          candMap[i].cands[1] === candMap[j].cands[1]
        ) {
          const [a, b] = candMap[i].cands;
          const affected = candMap
            .filter(
              (entry) =>
                entry.cell !== candMap[i].cell &&
                entry.cell !== candMap[j].cell &&
                (entry.cands.includes(a) || entry.cands.includes(b)),
            )
            .map((entry) => entry.cell);

          if (affected.length > 0) {
            return {
              technique: "Naked Pair",
              pairCells: [candMap[i].cell, candMap[j].cell],
              pairValues: [a, b],
              affected,
              areaType: unit.type,
              areaLabel:
                unit.label.charAt(0).toUpperCase() + unit.label.slice(1),
              areaCells: unit.cells,
              techniqueMsg: `Two squares in this ${unit.type} can only be ${a} or ${b}. Since those two digits are locked to those two squares, ${a} and ${b} can be erased from every other square's notes in that ${unit.type}.`,
              revealMsg: `Erasing the pencil marks ${a} and ${b} from the other empty squares in this ${unit.type}.`,
            };
          }
        }
      }
    }
  }
  return null;
}

// Chooses between the full explanation and a shorter, more confident version
// once the player's local profile shows they've been taught this technique
// several times already. This is the "growing" behavior: the same puzzle
// state produces a different explanation depending on play history.
function getAdaptiveTechniqueMsg(result, profile) {
  const exposure = profile.techniqueExposure[result.technique] || 0;
  if (exposure < MASTERY_THRESHOLD) return result.techniqueMsg;

  if (result.technique === "Naked Pair") {
    return `Another Naked Pair — you know this one: two squares in this ${result.areaType} share the same two candidates, so those digits can be crossed off every other square's notes in that ${result.areaType}.`;
  }
  return `You've spotted a ${result.technique} before — ${result.areaLabel} only leaves room for one number in one particular square. See it?`;
}

function runAiAnalysis() {
  const { board, emptyCells } = getConstraintBoardAndEmpties();
  if (emptyCells.length === 0) return { technique: "Complete" };

  return (
    findNakedSingle(board, emptyCells) ||
    findHiddenSingle(board, emptyCells) ||
    findNakedPair(board, emptyCells) || {
      technique: "Advanced",
      cell: emptyCells[Math.floor(Math.random() * emptyCells.length)],
      areaType: "cell",
    }
  );
}

function applyAiAreaHighlight(result) {
  clearAiAreaHighlights();
  const cells =
    result.areaType === "cell" ? result.areaCells : result.areaCells;
  cells.forEach((c) => c && c.classList.add("ai-area-highlight"));
}

function applyAiTargetHighlight(result) {
  clearAiAreaHighlights();
  if (result.technique === "Naked Pair") {
    result.pairCells.forEach((c) => c.classList.add("ai-target-highlight"));
    result.affected.forEach((c) => c.classList.add("ai-area-highlight"));
  } else if (result.cell) {
    result.cell.classList.add("ai-target-highlight");
  }
}

function scrollToAiCell(result) {
  const target =
    result.technique === "Naked Pair" ? result.pairCells[0] : result.cell;
  if (target) {
    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }
}

// Advances the tiered hint: area nudge -> technique nudge -> full reveal.
function advanceAiHint() {
  // If we have an active, still-valid hint in progress, advance it.
  const stillValid =
    aiTutorState.stage > 0 &&
    aiTutorState.stage < 3 &&
    (aiTutorState.technique === "Naked Pair"
      ? aiTutorState.pairCells.every((c) => c.dataset.val === "")
      : aiTutorState.cell && aiTutorState.cell.dataset.val === "");

  if (!stillValid && aiTutorState.stage !== 0) {
    resetAiTutorState();
  }

  if (aiTutorState.stage === 0) {
    const result = runAiAnalysis();

    if (result.technique === "Complete") {
      addAiMessage("The board is already full - nice work! 🎉", "ai");
      return;
    }

    if (result.technique === "Advanced") {
      addAiMessage(
        "This position needs a more advanced technique than I can explain simply. Want me to just fill in a square for you?",
        "ai",
      );
      aiTutorState = {
        ...aiTutorState,
        stage: 2,
        technique: "Advanced",
        cell: result.cell,
      };
      applyAiTargetHighlight({ technique: "Advanced", cell: result.cell });
      scrollToAiCell({ technique: "Advanced", cell: result.cell });
      aiActionHintBtn.innerText = "Just fill it in";
      return;
    }

    aiTutorState = { stage: 1, ...result };
    applyAiAreaHighlight(result);
    scrollToAiCell(result);
    addAiMessage(
      `Let's take a closer look at ${result.areaLabel.toLowerCase()}.`,
      "ai",
    );
    aiActionHintBtn.innerText =
      result.technique === "Naked Pair" ? "What's the trick?" : "Tell me more";
    return;
  }

  if (aiTutorState.stage === 1) {
    // This is a teaching step, not an answer - it never spends a hint, no
    // matter how many times the player asks to hear it again.
    const profile = loadAiProfile();
    profile.techniqueExposure[aiTutorState.technique] =
      (profile.techniqueExposure[aiTutorState.technique] || 0) + 1;
    saveAiProfile(profile);

    addAiMessage(getAdaptiveTechniqueMsg(aiTutorState, profile), "ai");
    aiTutorState.stage = 2;
    aiActionHintBtn.innerText =
      aiTutorState.technique === "Naked Pair"
        ? "Apply it for me"
        : "Just tell me the answer";
    return;
  }

  if (aiTutorState.stage === 2) {
    // Only now - after the area and the technique have both been shown, and
    // the player has explicitly asked for it - does the AI actually hand
    // over the answer, and only if the shared hint pool still has room.
    if (!useHint()) {
      addAiMessage(
        `You've used all ${HINTS_PER_GAME} hints for this game — but you've already got the logic for this one. Give it a shot!`,
        "ai",
      );
      resetAiTutorState();
      return;
    }

    if (aiTutorState.technique === "Advanced") {
      revealFallbackCell(aiTutorState.cell);
    } else if (aiTutorState.technique === "Naked Pair") {
      applyNakedPairElimination(aiTutorState);
    } else {
      revealAiFill(aiTutorState.cell, aiTutorState.value);
    }
    addAiMessage(aiTutorState.revealMsg || "Done!", "ai");
    resetAiTutorState();
  }
}

function revealAiFill(cell, value) {
  moveHistory.push(getBoardSnapshot());
  redoStack = [];

  cell.dataset.val = value;
  cell.dataset.notes = "";
  cell.classList.remove("error-highlight");
  cell.dataset.fixed = "true";
  cell.classList.add("fixed");
  updateCellDisplay(cell);

  removeNotesFromPeers(cell.dataset.row, cell.dataset.col, value);

  cell.classList.add("ai-reveal-flash");
  setTimeout(() => cell.classList.remove("ai-reveal-flash"), 3000);

  updateCounts();
  checkBoard();
}

function revealFallbackCell(cell) {
  const r = parseInt(cell.dataset.row);
  const c = parseInt(cell.dataset.col);
  const value = currentSolution[r][c].toString();
  revealAiFill(cell, value);
}

function applyNakedPairElimination(state) {
  const [a, b] = state.pairValues.map((n) => n.toString());
  let anyChanged = false;
  moveHistory.push(getBoardSnapshot());
  redoStack = [];

  state.affected.forEach((cell) => {
    if (!cell.dataset.notes) return;
    let notesArray = cell.dataset.notes.split(",").filter((n) => n !== "");
    const before = notesArray.length;
    notesArray = notesArray.filter((n) => n !== a && n !== b);
    if (notesArray.length !== before) {
      anyChanged = true;
      cell.dataset.notes = notesArray.join(",");
      updateCellDisplay(cell);
    }
  });

  if (!anyChanged) {
    // No pencil marks were present to clean up - just leave the reasoning
    // on screen without editing the board.
    redoStack = [];
    moveHistory.pop();
  }

  state.affected.forEach((c) => c.classList.add("ai-reveal-flash"));
  setTimeout(() => {
    state.affected.forEach((c) => c.classList.remove("ai-reveal-flash"));
  }, 3000);
}

function runAiCheckBoard() {
  let errorCount = 0;
  let filledCount = 0;
  document.querySelectorAll(".cell").forEach((cell) => {
    if (cell.dataset.val !== "" && cell.dataset.fixed === "false") {
      filledCount++;
      const r = cell.dataset.row;
      const c = cell.dataset.col;
      const expectedValue = currentSolution[r][c].toString();
      if (cell.dataset.val !== expectedValue) {
        cell.classList.add("error-highlight");
        errorCount++;
      } else {
        cell.classList.remove("error-highlight");
      }
    }
  });

  if (filledCount === 0) {
    addAiMessage(
      "You haven't filled anything in yet - go ahead and place a few numbers, then I'll check them.",
      "ai",
    );
  } else if (errorCount === 0) {
    addAiMessage(
      "Everything you've filled in so far is correct. Keep going! ✅",
      "ai",
    );
  } else {
    addAiMessage(
      `I found ${errorCount} incorrect square${errorCount === 1 ? "" : "s"} - highlighted in red on the board.`,
      "ai",
    );
  }
}

function handleAiChatInput(rawText) {
  const text = rawText.trim();
  if (!text) return;
  addAiMessage(text, "user");

  const lower = text.toLowerCase();

  if (
    /(hint|stuck|help|clue|next step|answer|reveal|trick|explain)/.test(lower)
  ) {
    // advanceAiHint only ever moves the tutor forward one tier per call, so
    // even a message like "just tell me the answer" can't skip straight to
    // the reveal - it still has to pass through the area and technique
    // explanations first, exactly like the buttons do.
    advanceAiHint();
  } else if (/(check|valid|correct|mistake|error)/.test(lower)) {
    runAiCheckBoard();
  } else if (/(note|pencil|candidate)/.test(lower)) {
    runAutoNotes();
    addAiMessage(
      "Done - I've filled in the pencil-mark candidates for every empty square.",
      "ai",
    );
  } else if (/(thank|thanks)/.test(lower)) {
    addAiMessage("Anytime - good luck with the rest of the board!", "ai");
  } else {
    addAiMessage(
      "I can give you a hint, check your board for mistakes, or fill in pencil marks. Just ask, or use the buttons below.",
      "ai",
    );
  }
}

if (aiActionHintBtn) {
  aiActionHintBtn.addEventListener("click", advanceAiHint);
}
if (aiActionCheckBtn) {
  aiActionCheckBtn.addEventListener("click", () => {
    addAiMessage("Check my board", "user");
    runAiCheckBoard();
  });
}
if (aiChatSendBtn) {
  aiChatSendBtn.addEventListener("click", () => {
    handleAiChatInput(aiChatInput.value);
    aiChatInput.value = "";
  });
}
if (aiChatInput) {
  aiChatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleAiChatInput(aiChatInput.value);
      aiChatInput.value = "";
    }
  });
}

document.getElementById("nav-ai-btn").addEventListener("click", () => {
  document.getElementById("ai-tutor-modal").classList.remove("hidden");
  if (aiChatLog && aiChatLog.children.length === 0) {
    const profile = loadAiProfile();
    if (profile.gamesCompleted > 0 || profile.hintsUsedTotal > 0) {
      const hintFreeNote =
        profile.noHintWins > 0
          ? `, ${profile.noHintWins} of them without a single hint`
          : "";
      addAiMessage(
        `Welcome back! We've finished ${profile.gamesCompleted} puzzle${profile.gamesCompleted === 1 ? "" : "s"} together so far${hintFreeNote}. Grab a hint any time, or ask me to check your board.`,
        "ai",
      );
    } else {
      addAiMessage(
        "Hi! I'm your AI Sudoku tutor. Grab a hint and I'll walk you through the logic step by step - area first, then the technique, and I'll only give you the actual number if you ask for it after that. You can also ask me to check your board for mistakes.",
        "ai",
      );
    }
  }
});

loadPersistedSettings();
updateHintCounterDisplay();
startNewGame();
