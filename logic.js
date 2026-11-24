(function (root) {
    const BOARD_SIZE = 9;
    const INITIAL_GRID_SIZE = 7;
    const STREAM_LENGTH = 4;
    // Number of fruit kinds per mode. Normal = 9 (the 3x3 neighbourhood can hold all kinds once), Hard = 12.
    const MODES = { normal: 9, hard: 12 };
    const DEFAULT_MODE = 'normal';
    const LEADERBOARD_LIMIT = 20;
    const PLAYER_NAME_MAX = 12;
    const DEFAULT_PLAYER_NAME = '익명';

    const DIRECTIONS = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];

    function isMode(mode) {
        return Object.prototype.hasOwnProperty.call(MODES, mode);
    }

    function randomFruit(mode, rng = Math.random) {
        return Math.floor(rng() * MODES[mode]);
    }

    function createEmptyBoard() {
        return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    }

    function createBoard(mode, rng = Math.random) {
        const board = createEmptyBoard();
        const start = (BOARD_SIZE - INITIAL_GRID_SIZE) / 2;
        for (let row = start; row < start + INITIAL_GRID_SIZE; row++) {
            for (let col = start; col < start + INITIAL_GRID_SIZE; col++) {
                board[row][col] = randomFruit(mode, rng);
            }
        }
        return board;
    }

    function createStream(mode, rng = Math.random) {
        return Array.from({ length: STREAM_LENGTH }, () => randomFruit(mode, rng));
    }

    function getNeighbours(row, col) {
        const neighbours = [];
        for (const [dRow, dCol] of DIRECTIONS) {
            const r = row + dRow;
            const c = col + dCol;
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                neighbours.push([r, c]);
            }
        }
        return neighbours;
    }

    // Legacy rule: the placed fruit and its in-board neighbours all clear when every one of them is
    // filled and no two show the same fruit. Returns the cells (placed cell first) or null.
    // Expects the placed fruit to already be on the board.
    function findMatch(board, row, col) {
        const cells = [[row, col], ...getNeighbours(row, col)];
        const seen = new Set();
        for (const [r, c] of cells) {
            const value = board[r][c];
            if (value === null || seen.has(value)) {
                return null;
            }
            seen.add(value);
        }
        return cells;
    }

    function countFilled(board) {
        return board.reduce((total, line) => total + line.filter(v => v !== null).length, 0);
    }

    function getStatus(board) {
        const filled = countFilled(board);
        if (filled === 0) {
            return 'cleared';
        }
        return filled === BOARD_SIZE * BOARD_SIZE ? 'gameover' : 'playing';
    }

    function isFruit(value, mode) {
        return Number.isInteger(value) && value >= 0 && value < MODES[mode];
    }

    function isValidSavedGame(game) {
        if (!game || typeof game !== 'object' || !isMode(game.mode)) {
            return false;
        }
        const { board, stream, moves, mode } = game;
        return Array.isArray(board)
            && board.length === BOARD_SIZE
            && board.every(line => Array.isArray(line) && line.length === BOARD_SIZE
                && line.every(v => v === null || isFruit(v, mode)))
            && Array.isArray(stream)
            && stream.length === STREAM_LENGTH
            && stream.every(v => isFruit(v, mode))
            && Number.isInteger(moves) && moves >= 0
            && ['playing', 'cleared', 'gameover'].includes(game.gameStatus)
            && getStatus(board) === game.gameStatus;
    }

    // Strips control characters, collapses whitespace and caps the length. May return ''.
    function sanitizePlayerName(raw) {
        if (typeof raw !== 'string') {
            return '';
        }
        return raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
            .slice(0, PLAYER_NAME_MAX).trim();
    }

    // Only cleared games are recorded (as in the original game); `moves` is the score, lower is better.
    // `name` is optional so records without a name stay valid.
    function isValidLeaderboardEntry(entry) {
        return Boolean(entry) && typeof entry === 'object'
            && isMode(entry.mode)
            && Number.isInteger(entry.moves) && entry.moves > 0
            && Number.isFinite(entry.timestamp)
            && (entry.name === undefined || typeof entry.name === 'string')
            && typeof entry.date === 'string'
            && Number.isFinite(Date.parse(entry.date));
    }

    function withPlayerName(entry) {
        return { ...entry, name: sanitizePlayerName(entry.name) || DEFAULT_PLAYER_NAME };
    }

    // Fewest moves first, then newest.
    function compareEntries(a, b) {
        return (a.moves - b.moves) || (b.timestamp - a.timestamp);
    }

    // Validates and orders a list received from the server (or storage): invalid items are dropped.
    // The list holds every mode; callers pick one with `entriesForMode`.
    function normalizeEntries(list) {
        if (!Array.isArray(list)) {
            return [];
        }
        return list.filter(isValidLeaderboardEntry).map(withPlayerName).sort(compareEntries);
    }

    function entriesForMode(entries, mode) {
        return entries.filter(entry => entry.mode === mode).slice(0, LEADERBOARD_LIMIT);
    }

    // Keeps the best LEADERBOARD_LIMIT entries of each mode.
    function addLeaderboardEntry(entries, entry) {
        const all = [...entries, entry];
        return Object.keys(MODES).flatMap(mode => entriesForMode(all.sort(compareEntries), mode));
    }

    const api = {
        BOARD_SIZE, INITIAL_GRID_SIZE, STREAM_LENGTH, MODES, DEFAULT_MODE, LEADERBOARD_LIMIT,
        isMode, createEmptyBoard, createBoard, createStream, randomFruit, getNeighbours, findMatch,
        countFilled, getStatus, isValidSavedGame,
        PLAYER_NAME_MAX, DEFAULT_PLAYER_NAME, sanitizePlayerName, normalizeEntries, entriesForMode,
        isValidLeaderboardEntry, compareEntries, addLeaderboardEntry
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.FruitsLogic = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
