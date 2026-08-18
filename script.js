const baseSolution = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

let currentSolution = [];
let selectedCell = null;

// Settings State
let isHighlightEnabled = true;
let activeHighlightNumber = null;

// --- TIMER VARIABLES ---
let timerInterval;
let secondsElapsed = 0;
const timerElement = document.getElementById("timer");

const boardElement = document.getElementById("board");
const message = document.getElementById("message");

// --- MODAL & SETTINGS LOGIC ---
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const closeModal = document.getElementById("close-modal");
const highlightToggle = document.getElementById("highlight-toggle");

settingsBtn.addEventListener("click", () =>
  settingsModal.classList.remove("hidden"),
);
closeModal.addEventListener("click", () =>
  settingsModal.classList.add("hidden"),
);

highlightToggle.addEventListener("change", (e) => {
  isHighlightEnabled = e.target.checked;
  updateHighlights(activeHighlightNumber); // Refresh board highlights
});

// Updates the board highlighting based on the selected number
function updateHighlights(num) {
  activeHighlightNumber = num;

  // First, clear all existing highlights
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.remove("highlight-circle");
  });

  // If turned off, or eraser chosen, or empty cell clicked, stop here
  if (!isHighlightEnabled || !num || num === "X") return;

  // Loop through board and highlight matching numbers
  document.querySelectorAll(".cell").forEach((cell) => {
    if (cell.value === num) {
      cell.classList.add("highlight-circle");
    }
  });
}

// --- TIMER FUNCTIONS ---
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

// --- SUDOKU LOGIC & BUILDER ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generateShuffledSolution() {
  let newNumbers = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  let newBoard = [];
  for (let row = 0; row < 9; row++) {
    let newRow = [];
    for (let col = 0; col < 9; col++) {
      let oldNumber = baseSolution[row][col];
      newRow.push(newNumbers[oldNumber - 1]);
    }
    newBoard.push(newRow);
  }
  return newBoard;
}

function updateCounts() {
  const counts = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9 };

  const cells = document.querySelectorAll(".cell");
  cells.forEach((cell) => {
    if (cell.value >= "1" && cell.value <= "9") {
      counts[cell.value]--;
    }
  });

  for (let i = 1; i <= 9; i++) {
    const countSpan = document.getElementById(`count-${i}`);
    if (countSpan) {
      countSpan.innerText = Math.max(0, counts[i]);
    }
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

    if (cell.value === "") {
      isComplete = false;
    } else if (cell.value !== expectedValue) {
      isCorrect = false;
    }
  });

  if (isComplete && isCorrect) {
    message.innerText = "Congratulations! You solved it!";
    message.style.color = "#2e7d32";
    stopTimer();
  } else {
    message.innerText = "";
  }
}

function startNewGame() {
  boardElement.innerHTML = "";
  message.innerText = "";
  selectedCell = null;
  updateHighlights(null); // Clear any old highlights
  currentSolution = generateShuffledSolution();

  startTimer();

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const wrapper = document.createElement("div");
      wrapper.classList.add("cell-wrapper");

      const input = document.createElement("input");
      input.type = "text";
      input.readOnly = true;
      input.classList.add("cell");

      input.dataset.row = row;
      input.dataset.col = col;

      if (Math.random() > 0.6) {
        input.value = currentSolution[row][col];
        input.classList.add("fixed");
      }

      input.addEventListener("click", function () {
        document
          .querySelectorAll(".cell")
          .forEach((c) => c.classList.remove("selected"));

        if (!this.classList.contains("fixed")) {
          this.classList.add("selected");
          selectedCell = this;
        } else {
          selectedCell = null;
        }

        // If the user clicks a cell that has a number, highlight all instances of it!
        if (this.value) {
          updateHighlights(this.value);
        } else {
          updateHighlights(null);
        }
      });

      wrapper.appendChild(input);
      boardElement.appendChild(wrapper);
    }
  }

  updateCounts();
}

// --- INPUT HANDLING ---
function enterNumber(val) {
  if (selectedCell) {
    if (val === "X") {
      selectedCell.value = "";
    } else {
      selectedCell.value = val;
      selectedCell.style.color = "#333";
    }
    checkBoard();
    updateCounts();
  }
  // Update highlights globally whenever a numpad key is pressed
  updateHighlights(val);
}

document.querySelectorAll(".numpad-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    const val = this.getAttribute("data-val");
    enterNumber(val);
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "9") {
    enterNumber(e.key);
  } else if (e.key === "Backspace" || e.key === "Delete") {
    enterNumber("X");
  }
});

// --- INITIALIZE ---
startNewGame();
document.getElementById("reset-btn").addEventListener("click", startNewGame);
