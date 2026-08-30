// =========================================================
// SUDOKU GENERATION WORKER
// Runs the recursive backtracking solver + puzzle "carving" step off the
// main thread. On low-clue difficulties (Expert = 22 clues) the carving
// step calls countSolutions() dozens of times, which is what used to
// cause a visible freeze right on the main UI thread. Moving it here
// means the "Generating Board..." message stays responsive and the page
// never locks up, even on slower devices.
// =========================================================

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
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
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
  const emptyPos = findEmpty(board);
  if (!emptyPos) return true;
  const [row, col] = emptyPos;
  const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const num of nums) {
    if (isSafe(board, row, col, num)) {
      board[row][col] = num;
      if (solveBoard(board)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}

function countSolutions(board) {
  const emptyPos = findEmpty(board);
  if (!emptyPos) return 1;
  const [row, col] = emptyPos;
  let count = 0;
  for (let num = 1; num <= 9; num++) {
    if (isSafe(board, row, col, num)) {
      board[row][col] = num;
      count += countSolutions(board);
      board[row][col] = 0;
      if (count > 1) return count; // early exit: we only care about uniqueness
    }
  }
  return count;
}

function generatePuzzle(difficultyIndex, diffTargets) {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  solveBoard(board);
  const solution = board.map((row) => [...row]);

  const targetClues = diffTargets[difficultyIndex];
  let cellsToHide = 81 - targetClues;

  let coords = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) coords.push([r, c]);
  }
  coords = shuffleArray(coords);

  for (let i = 0; i < coords.length; i++) {
    if (cellsToHide <= 0) break;
    const [r, c] = coords[i];
    const backup = board[r][c];
    board[r][c] = 0;
    const boardCopy = board.map((row) => [...row]);
    if (countSolutions(boardCopy) !== 1) {
      board[r][c] = backup;
    } else {
      cellsToHide--;
    }
  }

  return { puzzle: board, solution };
}

self.onmessage = function (e) {
  const { difficultyIndex, diffTargets, requestId } = e.data;
  try {
    const { puzzle, solution } = generatePuzzle(difficultyIndex, diffTargets);
    self.postMessage({ puzzle, solution, requestId });
  } catch (err) {
    self.postMessage({
      error: String(err && err.message ? err.message : err),
      requestId,
    });
  }
};
