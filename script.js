// Remove the old baseSolution array. We don't need it anymore!

let currentSolution = []; // Holds the fully solved board (2D Array)
let currentPuzzle = [];   // Holds the board with missing numbers (2D Array)
let selectedCell = null;
let moveHistory = [];

// Settings & State
let isHighlightEnabled = true;
let activeHighlightNumber = null;

// Difficulty State 
// Target clues left: Beginner: 50, Easy: 40, Hard: 30, Expert: 22
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

// Helper: Shuffles an array (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Helper: Checks if it's legal to place 'num' at board[row][col]
function isSafe(board, row, col, num) {
    // Check row and column
    for (let x = 0; x < 9; x++) {
        if (board[row][x] === num || board[x][col] === num) return false;
    }
    // Check 3x3 subgrid
    let startRow = row - (row % 3);
    let startCol = col - (col % 3);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[i + startRow][j + startCol] === num) return false;
        }
    }
    return true;
}

// Helper: Finds the first empty (0) cell
function findEmpty(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) return [r, c];
        }
    }
    return null;
}

// Core DFS Algorithm to completely solve a board
function solveBoard(board) {
    let emptyPos = findEmpty(board);
    if (!emptyPos) return true; // Base case: Board is full
    
    let [row, col] = emptyPos;
    // Shuffle 1-9 so every generated board is uniquely randomized
    let nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    for (let num of nums) {
        if (isSafe(board, row, col, num)) {
            board[row][col] = num;
            if (solveBoard(board)) return true; // Recursive step
            board[row][col] = 0; // Backtrack
        }
    }
    return false;
}

// Verifies if a board has exactly one unique solution
function countSolutions(board) {
    let emptyPos = findEmpty(board);
    if (!emptyPos) return 1;
    
    let [row, col] = emptyPos;
    let count = 0;

    for (let num = 1; num <= 9; num++) {
        if (isSafe(board, row, col, num)) {
            board[row][col] = num;
            count += countSolutions(board);
            board[row][col] = 0; // Backtrack
            if (count > 1) return count; // Optimization: Stop early if > 1
        }
    }
    return count;
}

// The Main Generation Pipeline
function generateNewPuzzle(difficultyIndex) {
    // 1. Create empty 9x9 board
    let board = Array.from({ length: 9 }, () => Array(9).fill(0));
    
    // 2. Fill it completely using randomized backtracking
    solveBoard(board);
    
    // 3. Save the full solution
    currentSolution = board.map(row => [...row]);
    
    // 4. Determine how many clues we want to keep
    let targetClues = diffTargets[difficultyIndex];
    let cellsToHide = 81 - targetClues;
    
    // 5. Create a list of all 81 coordinates and shuffle them
    let coords = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            coords.push([r, c]);
        }
    }
    coords = shuffleArray(coords);
    
    // 6. Attempt to remove numbers while ensuring unique solution
    for (let i = 0; i < coords.length; i++) {
        if (cellsToHide <= 0) break;
        
        let [r, c] = coords[i];
        let backup = board[r][c];
        board[r][c] = 0;
        
        // Deep copy the board to test for multiple solutions
        let boardCopy = board.map(row => [...row]);
        
        if (countSolutions(boardCopy) !== 1) {
            // If removing it breaks the uniqueness, put it back
            board[r][c] = backup;
        } else {
            // Successfully removed
            cellsToHide--;
        }
    }
    
    currentPuzzle = board;
}


// --- MODALS UI LOGIC ---
const modals = document.querySelectorAll(".modal");

document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", function () {
        const targetId = this.getAttribute("data-target");
        document.getElementById(targetId).classList.add("hidden");
    });
});

document.getElementById("settings-btn").addEventListener("click", () => document.getElementById("settings-modal").classList.remove("hidden"));
document.getElementById("nav-bulb-btn").addEventListener("click", () => document.getElementById("tools-modal").classList.remove("hidden"));
document.getElementById("nav-difficulty-btn").addEventListener("click", () => {
    selectedDiffIndex = activeDiffIndex; 
    updateDiffDisplay();
    document.getElementById("difficulty-modal").classList.remove("hidden");
});

document.getElementById("highlight-toggle").addEventListener("change", (e) => {
    isHighlightEnabled = e.target.checked;
    updateHighlights(activeHighlightNumber);
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
    document.getElementById("diff-display").innerText = diffModes[selectedDiffIndex];
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

// Sidebar Buttons triggering Confirmations
document.getElementById("nav-new-btn").addEventListener("click", () => {
    showConfirmModal("Are you sure you want to start a completely new game?", startNewGame);
});
document.getElementById("nav-restart-btn").addEventListener("click", () => {
    showConfirmModal("Are you sure you want to restart the current board?", restartCurrentGame);
});
document.getElementById("nav-undo-btn").addEventListener("click", undoLastMove);

// --- CORE GAME ACTIONS ---
function undoLastMove() {
    if (moveHistory.length === 0) return;
    const lastMove = moveHistory.pop();
    lastMove.cell.value = lastMove.prevValue;
    updateCounts();
    updateHighlights(activeHighlightNumber);
    checkBoard();
}

function restartCurrentGame() {
    document.querySelectorAll(".cell").forEach((cell) => {
        if (cell.dataset.fixed === "false") {
            cell.value = "";
            cell.style.color = "#333";
        }
    });
    moveHistory = [];
    selectedCell = null;
    updateHighlights(null);
    updateCounts();
    message.innerText = "";
    startTimer();
}

function updateHighlights(num) {
    activeHighlightNumber = num;
    document.querySelectorAll(".cell").forEach((cell) => cell.classList.remove("highlight-circle"));
    if (!isHighlightEnabled || !num || num === "X") return;

    document.querySelectorAll(".cell").forEach((cell) => {
        if (cell.value === num) cell.classList.add("highlight-circle");
    });
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
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
function stopTimer() { clearInterval(timerInterval); }

function updateCounts() {
    const counts = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9 };
    document.querySelectorAll(".cell").forEach((cell) => {
        if (cell.value >= "1" && cell.value <= "9") counts[cell.value]--;
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

        if (cell.value === "") {
            isComplete = false;
        } else if (cell.value !== expectedValue && cell.value !== "") {
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
    message.innerText = "Generating Board..."; // Brief UI feedback
    
    // Allow the browser to render the loading message before freezing to do the heavy math
    setTimeout(() => {
        selectedCell = null;
        moveHistory = [];
        updateHighlights(null);
        
        // Trigger the new algorithm
        generateNewPuzzle(activeDiffIndex);
        
        startTimer();
        message.innerText = ""; // Clear loading message

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

                // Load from our newly generated puzzle array instead of checking probabilities
                let val = currentPuzzle[row][col];
                if (val !== 0) {
                    input.value = val;
                    input.classList.add("fixed");
                    input.dataset.fixed = "true";
                } else {
                    input.dataset.fixed = "false";
                }

                input.addEventListener("click", function () {
                    document.querySelectorAll(".cell").forEach((c) => c.classList.remove("selected"));

                    if (this.dataset.fixed === "false") {
                        this.classList.add("selected");
                        selectedCell = this;
                    } else {
                        selectedCell = null;
                    }

                    if (this.value) updateHighlights(this.value);
                    else updateHighlights(null);
                });

                wrapper.appendChild(input);
                boardElement.appendChild(wrapper);
            }
        }
        updateCounts();
    }, 50); // 50ms delay is just enough for DOM repaint
}

// --- INPUT HANDLING ---
function enterNumber(val) {
    if (selectedCell) {
        const prevValue = selectedCell.value;
        const newValue = val === "X" ? "" : val;

        if (prevValue !== newValue) {
            moveHistory.push({ cell: selectedCell, prevValue: prevValue });
            selectedCell.value = newValue;
            selectedCell.style.color = "#333";
            checkBoard();
            updateCounts();
        }
    }
    updateHighlights(val === "X" ? null : val);
}

document.querySelectorAll(".numpad-btn").forEach((btn) => {
    btn.addEventListener("click", function () { enterNumber(this.getAttribute("data-val")); });
});

document.addEventListener("keydown", (e) => {
    if (e.key >= "1" && e.key <= "9") enterNumber(e.key);
    else if (e.key === "Backspace" || e.key === "Delete") enterNumber("X");
    else if ((e.ctrlKey || e.metaKey) && e.key === "z") undoLastMove();
});

// Stubs for Tools Menu
document.getElementById("tool-validate").addEventListener("click", () => {
    alert("Validation tool logic will go here!");
    document.getElementById("tools-modal").classList.add("hidden");
});
document.getElementById("tool-hint").addEventListener("click", () => {
    alert("Hint tool logic will go here!");
    document.getElementById("tools-modal").classList.add("hidden");
});
document.getElementById("tool-notes").addEventListener("click", () => {
    alert("Auto notes logic will go here!");
    document.getElementById("tools-modal").classList.add("hidden");
});

// Initialize First Game
startNewGame();