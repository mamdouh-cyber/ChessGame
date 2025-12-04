const boardElement = document.getElementById("chessboard");
const turnSpan = document.getElementById("current-turn");
const statusDiv = document.getElementById("status");
const moveLog = document.getElementById("move-log");
const resetBtn = document.getElementById("reset-btn");
const themeToggleBtn = document.getElementById("theme-toggle-btn");

// Board representation: 8x8 array of piece codes or null
// White pieces uppercase, black pieces lowercase, using FEN-like letters
// r rook, n knight, b bishop, q queen, k king, p pawn
let board = [];
let currentPlayer = "white"; // "white" or "black"
let selectedSquare = null; // {row, col}
let legalMoves = []; // array of {row, col}
let moveHistory = [];

function createBoardSquares() {
    boardElement.innerHTML = "";
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement("div");
            square.classList.add("square");
            const isLight = (row + col) % 2 === 0;
            square.classList.add(isLight ? "light" : "dark");
            square.dataset.row = row;
            square.dataset.col = col;
            square.addEventListener("click", () => onSquareClick(row, col));
            boardElement.appendChild(square);
        }
    }
}

function initialBoard() {
    // Classic chess starting position
    // Rank 8 to 1 (row 0 is top visually)
    return [
        ["r", "n", "b", "q", "k", "b", "n", "r"],
        ["p", "p", "p", "p", "p", "p", "p", "p"],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ["P", "P", "P", "P", "P", "P", "P", "P"],
        ["R", "N", "B", "Q", "K", "B", "N", "R"],
    ];
}

function pieceToUnicode(piece) {
    const map = {
        K: "♔",
        Q: "♕",
        R: "♖",
        B: "♗",
        N: "♘",
        P: "♙",
        k: "♚",
        q: "♛",
        r: "♜",
        b: "♝",
        n: "♞",
        p: "♟",
    };
    return map[piece] || "";
}

function renderBoard() {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const idx = row * 8 + col;
            const square = boardElement.children[idx];
            square.classList.remove(
                "selected",
                "highlight-move",
                "highlight-capture"
            );
            square.innerHTML = "";
            const piece = board[row][col];
            if (piece) {
                const span = document.createElement("span");
                span.classList.add("piece");
                const isWhite = piece === piece.toUpperCase();
                span.classList.add(isWhite ? "white" : "black");
                span.textContent = pieceToUnicode(piece);
                square.appendChild(span);
            }
        }
    }

    // Apply highlights
    if (selectedSquare) {
        const idx = selectedSquare.row * 8 + selectedSquare.col;
        boardElement.children[idx].classList.add("selected");
    }
    for (const move of legalMoves) {
        const piece = board[move.row][move.col];
        const idx = move.row * 8 + move.col;
        const cls = piece ? "highlight-capture" : "highlight-move";
        boardElement.children[idx].classList.add(cls);
    }

    turnSpan.textContent =
        currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
}

function onSquareClick(row, col) {
    const clickedPiece = board[row][col];
    const isWhitePiece = clickedPiece && clickedPiece === clickedPiece.toUpperCase();
    const isBlackPiece = clickedPiece && !isWhitePiece;

    const isCurrentPlayersPiece =
        (currentPlayer === "white" && isWhitePiece) ||
        (currentPlayer === "black" && isBlackPiece);

    // If no selection yet and clicked own piece → select
    if (!selectedSquare) {
        if (isCurrentPlayersPiece) {
            selectedSquare = { row, col };
            legalMoves = generateLegalMoves(row, col, clickedPiece);
        } else {
            // clicking empty or opponent piece when no selection does nothing
            selectedSquare = null;
            legalMoves = [];
        }
        renderBoard();
        return;
    }

    // If clicked same square → deselect
    if (selectedSquare.row === row && selectedSquare.col === col) {
        selectedSquare = null;
        legalMoves = [];
        renderBoard();
        return;
    }

    // If clicked own different piece → change selection
    if (isCurrentPlayersPiece) {
        selectedSquare = { row, col };
        legalMoves = generateLegalMoves(row, col, clickedPiece);
        renderBoard();
        return;
    }

    // Otherwise try to move to that square
    const isLegal = legalMoves.some((m) => m.row === row && m.col === col);
    if (!isLegal) {
        // illegal target, just keep current selection
        return;
    }

    // Perform move
    makeMove(selectedSquare.row, selectedSquare.col, row, col);
}

function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const target = board[toRow][toCol];

    // Basic move
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;

    // Pawn promotion (simple: auto-queen)
    if (piece === "P" && toRow === 0) board[toRow][toCol] = "Q";
    if (piece === "p" && toRow === 7) board[toRow][toCol] = "q";

    // Log move (simple algebraic-ish)
    const files = "abcdefgh";
    const ranks = "87654321";
    const fromSquare = files[fromCol] + ranks[fromRow];
    const toSquare = files[toCol] + ranks[toRow];
    let notation = piece.toUpperCase() !== "P" ? piece.toUpperCase() : "";
    if (target) notation += "x";
    notation += fromSquare + "-" + toSquare;
    moveHistory.push(notation);
    const li = document.createElement("li");
    li.textContent = notation;
    moveLog.appendChild(li);
    moveLog.scrollTop = moveLog.scrollHeight;

    // Switch player
    currentPlayer = currentPlayer === "white" ? "black" : "white";
    statusDiv.textContent = "";

    // Reset selection
    selectedSquare = null;
    legalMoves = [];

    renderBoard();
}

function generateLegalMoves(row, col, piece) {
    if (!piece) return [];
    const isWhite = piece === piece.toUpperCase();
    const moves = [];

    const addIfValid = (r, c) => {
        if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;
        const target = board[r][c];
        if (!target) {
            moves.push({ row: r, col: c });
            return true;
        }
        const isTargetWhite = target === target.toUpperCase();
        if (isWhite !== isTargetWhite) {
            moves.push({ row: r, col: c });
        }
        return false; // stop in this direction
    };

    const slide = (dr, dc) => {
        let r = row + dr;
        let c = col + dc;
        while (true) {
            if (!addIfValid(r, c)) break;
            r += dr;
            c += dc;
        }
    };

    const type = piece.toLowerCase();
    if (type === "p") {
        const dir = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        // forward one
        if (board[row + dir] && board[row + dir][col] === null) {
            moves.push({ row: row + dir, col });
            // forward two from start
            if (row === startRow && board[row + 2 * dir][col] === null) {
                moves.push({ row: row + 2 * dir, col });
            }
        }
        // captures
        for (const dc of [-1, 1]) {
            const r = row + dir;
            const c = col + dc;
            if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;
            const target = board[r][c];
            if (target) {
                const isTargetWhite = target === target.toUpperCase();
                if (isWhite !== isTargetWhite) {
                    moves.push({ row: r, col: c });
                }
            }
        }
        return moves;
    }

    if (type === "n") {
        const knightMoves = [
            [2, 1],
            [2, -1],
            [-2, 1],
            [-2, -1],
            [1, 2],
            [1, -2],
            [-1, 2],
            [-1, -2],
        ];
        for (const [dr, dc] of knightMoves) {
            addIfValid(row + dr, col + dc);
        }
        return moves;
    }

    if (type === "b" || type === "q") {
        slide(1, 1);
        slide(1, -1);
        slide(-1, 1);
        slide(-1, -1);
    }

    if (type === "r" || type === "q") {
        slide(1, 0);
        slide(-1, 0);
        slide(0, 1);
        slide(0, -1);
    }

    if (type === "k") {
        const kingMoves = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
        ];
        for (const [dr, dc] of kingMoves) {
            addIfValid(row + dr, col + dc);
        }
        return moves;
    }

    return moves;
}

function resetGame() {
    board = initialBoard();
    currentPlayer = "white";
    selectedSquare = null;
    legalMoves = [];
    moveHistory = [];
    moveLog.innerHTML = "";
    statusDiv.textContent = "";
    renderBoard();
}

function applyTheme(theme) {
    const body = document.body;
    if (theme === "light") {
        body.setAttribute("data-theme", "light");
        themeToggleBtn.textContent = "Switch to Dark Mode";
    } else {
        body.setAttribute("data-theme", "dark");
        themeToggleBtn.textContent = "Switch to Light Mode";
    }
}

function initTheme() {
    const saved = localStorage.getItem("chess-theme");
    const prefersDark = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "dark");
    applyTheme(theme);
}

resetBtn.addEventListener("click", resetGame);

themeToggleBtn.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("chess-theme", next);
});

// Initialize
board = initialBoard();
createBoardSquares();
renderBoard();
initTheme();
