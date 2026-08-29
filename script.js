// Remove the old baseSolution array. We don't need it anymore!

let currentSolution = []; // Holds the fully solved board (2D Array)
let currentPuzzle = []; // Holds the board with missing numbers (2D Array)
let selectedCell = null;
let moveHistory = [];

// Settings & State
let isHighlightEnabled = true;
let activeHighlightNumber = null;
let isPencilMode = false; // NEW: Tracks pencil toggle

// Difficulty State
const diffModes = ["Beginner", "Easy", "Hard", "Expert"];
const diffTargets = [50, 40, 30, 22];
let activeDiffIndex = 1;
let selectedDiffIndex = 1;

// Confirmation State
let pendingConfirmAction = null;

// Timer Variables
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
  updateHighlights(activeHighlightNumber);
});

// Pencil Mode Toggle Logic
const pencilBtn = document.getElementById("pencil-btn");
pencilBtn.addEventListener("click", () => {
  isPencilMode = !isPencilMode;
  if (isPencilMode) {
    pencilBtn.classList.add("active");
    pencilBtn.classList.remove("secondary");
    pencilBtn.innerHTML = `<span style="font-size: 20px;"><img src="Icons/pen-solid-full.svg" alt="" height="20px" width="20px" /></span> Pencil Mode: ON`;
  } else {
    pencilBtn.classList.remove("active");
    pencilBtn.classList.add("secondary");
    pencilBtn.innerHTML = `<span style="font-size: 20px;"><img src="Icons/pen-solid-full.svg" alt="" height="20px" width="20px" /></span> Pencil Mode: OFF`;
  }
});

// --- CONFIRMATION MODAL LOGIC ---
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

// --- DIFFICULTY SLIDER LOGIC ---
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

// Sidebar Buttons
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

// --- STATE MANAGEMENT (SNAPSHOTS FOR UNDO) ---
// Takes a picture of all 81 cells so we can restore exact notes and numbers
function getBoardSnapshot() {
  let snapshot = [];
  document.querySelectorAll(".cell").forEach((cell) => {
    snapshot.push({
      val: cell.dataset.val,
      notes: cell.dataset.notes,
    });
  });
  return snapshot;
}

// --- RENDERING ENGINE ---
// Updates a single cell's HTML to show either a big number OR the 3x3 notes grid
function updateCellDisplay(cell) {
  cell.innerHTML = ""; // Clear existing content
  let val = cell.dataset.val;

  if (val && val !== "") {
    // Show Big Number
    const span = document.createElement("span");
    span.classList.add("big-number");
    span.innerText = val;
    cell.appendChild(span);
  } else {
    // Show Notes Grid
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
      cell.style.color = "#333";
      updateCellDisplay(cell);
    }
  });

  moveHistory = [];
  selectedCell = null;
  updateHighlights(null);
  updateCounts();
  message.innerText = "";
  startTimer();
}

function undoLastMove() {
  if (moveHistory.length === 0) return;
  const lastSnapshot = moveHistory.pop();

  // Restore all 81 cells to their exact previous state
  document.querySelectorAll(".cell").forEach((cell, index) => {
    let snap = lastSnapshot[index];
    cell.dataset.val = snap.val;
    cell.dataset.notes = snap.notes;
    cell.classList.remove("error-highlight");
    updateCellDisplay(cell);
  });

  updateCounts();
  updateHighlights(activeHighlightNumber);
  checkBoard();
}

function updateHighlights(num) {
  activeHighlightNumber = num;

  // Clear all highlights
  document
    .querySelectorAll(".cell")
    .forEach((cell) => cell.classList.remove("highlight-circle"));
  document
    .querySelectorAll(".note")
    .forEach((note) => note.classList.remove("highlight-circle"));

  if (!isHighlightEnabled || !num || num === "X") return;

  // Highlight big cells
  document.querySelectorAll(".cell").forEach((cell) => {
    if (cell.dataset.val === num) cell.classList.add("highlight-circle");
  });

  // Highlight tiny notes
  document.querySelectorAll(".note").forEach((note) => {
    if (note.dataset.noteVal === num) note.classList.add("highlight-circle");
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

    if (cell.dataset.val === "") {
      isComplete = false;
    } else if (cell.dataset.val !== expectedValue) {
      isCorrect = false;
    }
  });

  if (isComplete && isCorrect) {
    message.innerText = `Congratulations! You solved ${diffModes[activeDiffIndex]} Mode!`;
    message.style.color = "#2e7d32";
    stopTimer();
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
    updateHighlights(null);
    generateNewPuzzle(activeDiffIndex);
    startTimer();
    message.innerText = "";

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const wrapper = document.createElement("div");
        wrapper.classList.add("cell-wrapper");

        // CHANGED: From <input> to <div> container
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

        // Draw initial display (Big Number or Empty)
        updateCellDisplay(cell);

        cell.addEventListener("click", function () {
          document
            .querySelectorAll(".cell")
            .forEach((c) => c.classList.remove("selected"));
          if (this.dataset.fixed === "false") {
            this.classList.add("selected");
            selectedCell = this;
          } else {
            selectedCell = null;
          }

          // Highlight the big number if it exists
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

    // Check if cell is in the same row, col, or 3x3 box
    let sameRow = r === row;
    let sameCol = c === col;
    let sameBox =
      Math.floor(r / 3) === Math.floor(row / 3) &&
      Math.floor(c / 3) === Math.floor(col / 3);

    // Apply only to peers (not the cell itself)
    if ((sameRow || sameCol || sameBox) && !(r === row && c === col)) {
      if (cell.dataset.notes) {
        let notesArray = cell.dataset.notes.split(",");
        if (notesArray.includes(numStr)) {
          // Filter the number out and save
          notesArray = notesArray.filter((n) => n !== numStr);
          cell.dataset.notes = notesArray.join(",");
          updateCellDisplay(cell);
        }
      }
    }
  });
}

// --- INPUT HANDLING (Updated for Divs & Pencil Mode) ---
function enterNumber(val) {
  if (!selectedCell) return;

  // Save board snapshot for Undo
  const snapshotBeforeMove = getBoardSnapshot();
  let stateChanged = false;

  if (val === "X") {
    // Eraser clears everything (big number and notes)
    if (selectedCell.dataset.val !== "" || selectedCell.dataset.notes !== "") {
      selectedCell.dataset.val = "";
      selectedCell.dataset.notes = "";
      stateChanged = true;
    }
  } else {
    if (isPencilMode) {
      // Pencil Mode: Toggle Notes (ONLY if cell is empty of big numbers)
      if (selectedCell.dataset.val === "") {
        let notesArray = selectedCell.dataset.notes
          ? selectedCell.dataset.notes.split(",")
          : [];
        if (notesArray.includes(val)) {
          notesArray = notesArray.filter((n) => n !== val); // Remove note
        } else {
          notesArray.push(val); // Add note
          notesArray.sort(); // Keep them in 1-9 order
        }
        selectedCell.dataset.notes = notesArray.join(",");
        stateChanged = true;
      }
    } else {
      // Normal Mode: Place Big Number
      if (selectedCell.dataset.val !== val) {
        selectedCell.dataset.val = val;
        selectedCell.dataset.notes = ""; // Clear notes in this cell
        selectedCell.style.color = "#333";

        // Auto-remove this number from surrounding notes
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
    selectedCell.classList.remove("error-highlight");
    updateCellDisplay(selectedCell);
    checkBoard();
    updateCounts();
  }

  updateHighlights(val === "X" ? null : val);
}

document.querySelectorAll(".numpad-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    enterNumber(this.getAttribute("data-val"));
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "9") enterNumber(e.key);
  else if (e.key === "Backspace" || e.key === "Delete") enterNumber("X");
  else if ((e.ctrlKey || e.metaKey) && e.key === "z") undoLastMove();
});

// --- TOOLS MENU UPDATES ---
document.getElementById("tool-validate").addEventListener("click", () => {
  document.querySelectorAll(".cell").forEach((cell) => {
    if (cell.dataset.val !== "" && cell.dataset.fixed === "false") {
      const r = cell.dataset.row;
      const c = cell.dataset.col;
      const expectedValue = currentSolution[r][c].toString();
      if (cell.dataset.val !== expectedValue) {
        cell.classList.add("error-highlight");
      } else {
        cell.classList.remove("error-highlight");
      }
    }
  });
  document.getElementById("tools-modal").classList.add("hidden");
});

document.getElementById("tool-hint").addEventListener("click", () => {
  let emptyCells = [];
  document.querySelectorAll(".cell").forEach((cell) => {
    if (cell.dataset.val === "") emptyCells.push(cell);
  });

  if (emptyCells.length === 0) {
    alert("The board is full!");
    document.getElementById("tools-modal").classList.add("hidden");
    return;
  }

  // Save snapshot so hints can be undone!
  moveHistory.push(getBoardSnapshot());

  const targetCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const r = targetCell.dataset.row;
  const c = targetCell.dataset.col;
  const correctValue = currentSolution[r][c].toString();

  targetCell.dataset.val = correctValue;
  targetCell.dataset.notes = ""; // Overwrite any notes
  targetCell.style.color = "#333";
  targetCell.classList.remove("error-highlight");
  targetCell.dataset.fixed = "true";
  targetCell.classList.add("fixed");
  updateCellDisplay(targetCell);

  // Auto-remove notes around the hint!
  removeNotesFromPeers(r, c, correctValue);

  targetCell.classList.add("hint-flash");
  setTimeout(() => {
    targetCell.classList.remove("hint-flash");
  }, 3000);

  updateCounts();
  checkBoard();
  document.getElementById("tools-modal").classList.add("hidden");
});

document.getElementById("tool-notes").addEventListener("click", () => {
  alert("Auto notes logic will go here!");
  document.getElementById("tools-modal").classList.add("hidden");
});

// Initialize First Game
startNewGame();
