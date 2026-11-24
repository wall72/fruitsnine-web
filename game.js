const {
    BOARD_SIZE, STREAM_LENGTH, MODES, DEFAULT_MODE, isMode,
    createBoard, createStream, randomFruit, findMatch, countFilled, getStatus, isValidSavedGame,
    DEFAULT_PLAYER_NAME, sanitizePlayerName, normalizeEntries, entriesForMode, addLeaderboardEntry
} = FruitsLogic;

// Keep in sync with the CSS animation durations in styles.css.
const PLACE_DELAY_MS = 300;
const MATCH_DELAY_MS = 500;
const REMOVE_DELAY_MS = 400;
const RESULT_DELAY_MS = 1000;
const REMOTE_TIMEOUT_MS = 10000;

// UI strings. English is the default; the language is stored in localStorage ('language').
// Static markup uses data-i18n / data-i18n-placeholder / data-i18n-aria with these keys.
const I18N = {
    en: {
        turns: 'Turns',
        tiles: 'Tiles',
        best: 'Best',
        mode: 'Mode',
        modeNormal: 'Normal',
        modeHard: 'Hard',
        nextFruit: 'Next',
        newGame: 'New Game',
        records: 'Records',
        leaderboard: 'Leaderboard',
        tilesLeft: 'Tiles Left',
        nameLabel: 'Enter your name to save your record',
        namePlaceholder: 'Name (max 12 characters)',
        saveRecord: 'Save Record',
        saveAnon: 'Save as Anonymous',
        topRecords: modeName => `Top Records — ${modeName}`,
        continue: 'Continue',
        close: 'Close',
        language: 'Language',
        howToPlay: 'How to Play',
        htpBoardTitle: 'Board —',
        htpBoard: 'The board is 9×9. At the start, the outer ring is empty and the inner 7×7 is filled with random fruits.',
        htpQueueTitle: 'Queue —',
        htpQueue: 'You always place the fruit shown first in the four-slot queue on any empty cell. After each placement the queue shifts and a new random fruit appears in the last slot.',
        htpMatchTitle: 'Match —',
        htpMatch: 'If the placed fruit and all the cells around it are filled and every fruit is different, all of them are removed. Cells on the edge have fewer neighbours, so they need fewer different fruits.',
        htpGoalTitle: 'Goal —',
        htpGoal: 'Remove every fruit from the board in as few turns as possible. If the board fills up completely, you lose.',
        htpModeTitle: 'Modes —',
        htpMode: 'Normal uses 9 kinds of fruit, Hard uses 12. Records are kept separately for each mode.',
        cleared: 'Cleared!',
        gameOver: 'Game Over',
        inProgress: 'In Progress',
        noRecords: 'No records yet.',
        confirmNewGame: 'Discard the current game and start a new one?',
        confirmMode: 'Switching mode discards the current game. Continue?',
        status: (moves, remaining, fruit) =>
            `Turns ${moves}, ${remaining} tiles left. Place fruit ${fruit + 1}.`,
        cellLabel: (row, col, value) =>
            `Row ${row + 1}, column ${col + 1}, ${value === null ? 'empty' : `fruit ${value + 1}`}`,
        loading: 'Loading server records…',
        submitting: 'Saving your record…',
        offline: 'Cannot reach the server. Showing records from this device.',
        saveFailed: 'Could not save to the server. Saved on this device only.',
        saved: 'Record saved.'
    },
    ko: {
        turns: '턴',
        tiles: '타일',
        best: '최고',
        mode: '모드',
        modeNormal: '보통',
        modeHard: '어려움',
        nextFruit: '다음',
        newGame: '새 게임',
        records: '기록 보기',
        leaderboard: '리더보드',
        tilesLeft: '남은 타일',
        nameLabel: '이름을 입력해 기록을 저장하세요',
        namePlaceholder: '이름 (최대 12자)',
        saveRecord: '기록 저장',
        saveAnon: '익명으로 저장',
        topRecords: modeName => `상위 기록 — ${modeName}`,
        continue: '계속하기',
        close: '닫기',
        language: '언어',
        howToPlay: '게임 방법',
        htpBoardTitle: '보드 —',
        htpBoard: '보드는 9×9입니다. 시작할 때 바깥 테두리는 비어 있고, 안쪽 7×7 칸에는 랜덤 과일이 채워져 있습니다.',
        htpQueueTitle: '대기열 —',
        htpQueue: '4칸짜리 대기열의 첫 번째 과일을 빈 칸 아무 곳에나 놓습니다. 놓을 때마다 대기열이 한 칸씩 당겨지고 마지막 칸에 새 랜덤 과일이 들어옵니다.',
        htpMatchTitle: '매치 —',
        htpMatch: '놓은 과일과 그 주변 칸이 모두 채워져 있고 과일이 전부 서로 다르면 모두 사라집니다. 가장자리 칸은 주변 칸이 적어서 더 적은 종류만 있으면 됩니다.',
        htpGoalTitle: '목표 —',
        htpGoal: '최소한의 턴으로 보드의 모든 과일을 없애세요. 보드가 전부 가득 차면 패배합니다.',
        htpModeTitle: '모드 —',
        htpMode: '보통은 과일 9종, 어려움은 12종입니다. 기록은 모드별로 따로 저장됩니다.',
        cleared: '클리어!',
        gameOver: '게임 오버',
        inProgress: '진행 중',
        noRecords: '기록이 없습니다.',
        confirmNewGame: '진행 중인 게임을 버리고 새 게임을 시작할까요?',
        confirmMode: '모드를 바꾸면 진행 중인 게임이 사라집니다. 계속할까요?',
        status: (moves, remaining, fruit) =>
            `${moves}턴, 남은 타일 ${remaining}개. 과일 ${fruit + 1}을(를) 놓으세요.`,
        cellLabel: (row, col, value) =>
            `${row + 1}행 ${col + 1}열, ${value === null ? '빈 칸' : `과일 ${value + 1}`}`,
        loading: '서버 기록을 불러오는 중…',
        submitting: '기록을 저장하는 중…',
        offline: '서버에 연결할 수 없어 이 기기의 기록을 표시합니다.',
        saveFailed: '서버에 저장하지 못해 이 기기에만 기록했습니다.',
        saved: '기록을 저장했습니다.'
    }
};
const DEFAULT_LANGUAGE = 'en';
const MODE_KEYS = { normal: 'modeNormal', hard: 'modeHard' };

let language = DEFAULT_LANGUAGE;
const t = (key, ...args) => {
    const value = I18N[language][key];
    return typeof value === 'function' ? value(...args) : value;
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function fruitImage(value) {
    const img = document.createElement('img');
    img.src = `assets/f${String(value).padStart(2, '0')}.png`;
    img.alt = '';
    img.draggable = false;
    return img;
}

function readStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn(`Failed to read "${key}". Resetting saved data.`, error);
        try {
            localStorage.removeItem(key);
        } catch (removeError) {
            // storage unavailable
        }
        return null;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Failed to save "${key}".`, error);
    }
}

// Talks to the Google Apps Script web app (server/apps-script). Disabled when no URL is configured.
class RemoteLeaderboard {
    constructor(url) {
        this.url = typeof url === 'string' ? url.trim() : '';
    }

    get enabled() {
        return this.url !== '';
    }

    async request(url, options = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal, redirect: 'follow' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            if (!data || data.ok !== true) {
                throw new Error('Unexpected leaderboard response');
            }
            return normalizeEntries(data.entries);
        } finally {
            clearTimeout(timer);
        }
    }

    list() {
        const url = new URL(this.url);
        url.searchParams.set('action', 'list');
        return this.request(url.toString());
    }

    // Sent as text/plain so the browser does not make a CORS preflight request (Apps Script cannot answer one).
    submit({ name, mode, moves }) {
        return this.request(this.url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'submit', name, mode, moves })
        });
    }
}

// Local records are always kept (offline fallback); server records, when loaded, are shown instead.
class LeaderboardManager {
    constructor() {
        this.entries = this.load();
        this.remoteEntries = null;
    }

    load() {
        return normalizeEntries(readStorage('leaderboard'));
    }

    addEntry(name, mode, moves) {
        const entry = {
            name: sanitizePlayerName(name) || DEFAULT_PLAYER_NAME,
            mode,
            moves,
            remaining: 0,
            status: 'cleared',
            date: new Date().toISOString(),
            timestamp: Date.now()
        };
        // Re-read first so records saved by another tab are not overwritten.
        this.entries = addLeaderboardEntry(this.load(), entry);
        writeStorage('leaderboard', this.entries);
    }

    getTopEntries(mode, count = 10) {
        return entriesForMode(this.remoteEntries || this.entries, mode).slice(0, count);
    }
}

class FruitsGame {
    constructor() {
        this.mode = DEFAULT_MODE;
        this.board = [];
        this.stream = [];
        this.moves = 0;
        this.gameStatus = 'playing';
        this.isResolvingMove = false;
        this.generation = 0;
        this.statusPrefix = '';
        // A cleared game waits for a player name (submitted === false); other games count as submitted.
        this.submitted = true;
        this.leaderboard = new LeaderboardManager();
        this.remote = new RemoteLeaderboard((window.FRUITS_CONFIG || {}).leaderboardApiUrl);
        // Lets a newer server request win over an older one that is still in flight.
        this.remoteToken = 0;

        this.leaderboardStatusKey = '';
        this.initElements();
        this.initLanguage();
        this.buildBoard();
        this.loadOrStartGame();
    }

    initElements() {
        this.gameScreen = document.getElementById('gameScreen');
        this.leaderboardScreen = document.getElementById('leaderboardScreen');

        this.boardElement = document.getElementById('board');
        this.movesElement = document.getElementById('moves');
        this.remainingElement = document.getElementById('remaining');
        this.bestElement = document.getElementById('best');
        this.streamElement = document.getElementById('streamNumbers');
        this.statusElement = document.getElementById('status');
        this.modeButtons = [...document.querySelectorAll('.mode-btn')];

        this.resultTitle = document.getElementById('resultTitle');
        this.finalMode = document.getElementById('finalMode');
        this.finalMoves = document.getElementById('finalMoves');
        this.finalRemaining = document.getElementById('finalRemaining');
        this.topRecordsTitle = document.getElementById('topRecordsTitle');
        this.leaderboardEntries = document.getElementById('leaderboardEntries');
        this.leaderboardStatus = document.getElementById('leaderboardStatus');
        this.nameForm = document.getElementById('nameForm');
        this.playerNameInput = document.getElementById('playerName');
        this.skipScoreBtn = document.getElementById('skipScoreBtn');

        this.newGameBtn = document.getElementById('newGameBtn');
        this.continueBtn = document.getElementById('continueBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.recordsBtn = document.getElementById('recordsBtn');

        this.newGameBtn.addEventListener('click', () => this.startNewGame());
        this.continueBtn.addEventListener('click', () => this.showGameScreen());
        this.restartBtn.addEventListener('click', () => this.confirmNewGame());
        this.recordsBtn.addEventListener('click', () => this.showResult());
        this.modeButtons.forEach(button => {
            button.addEventListener('click', () => this.changeMode(button.dataset.mode));
        });
        this.nameForm.addEventListener('submit', event => {
            event.preventDefault();
            this.submitScore(this.playerNameInput.value);
        });
        this.skipScoreBtn.addEventListener('click', () => this.submitScore(''));
    }

    initLanguage() {
        const saved = readStorage('language');
        language = I18N[saved] ? saved : DEFAULT_LANGUAGE;
        this.howToPlayDialog = document.getElementById('howToPlayDialog');

        document.addEventListener('click', event => {
            const langBtn = event.target.closest('.lang-btn');
            if (langBtn) {
                this.setLanguage(langBtn.dataset.lang);
            } else if (event.target.closest('[data-action="howToPlay"]')) {
                this.howToPlayDialog.showModal();
            }
        });
        document.getElementById('howToPlayClose').addEventListener('click', () => this.howToPlayDialog.close());
        // A click on the backdrop targets the dialog element itself.
        this.howToPlayDialog.addEventListener('click', event => {
            if (event.target === this.howToPlayDialog) {
                this.howToPlayDialog.close();
            }
        });
        this.applyLanguage();
    }

    setLanguage(lang) {
        if (!I18N[lang] || lang === language) {
            return;
        }
        language = lang;
        writeStorage('language', lang);
        this.applyLanguage();
    }

    // Translates the static markup, then everything the game renders itself.
    applyLanguage() {
        document.documentElement.lang = language;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.dataset.i18n);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = t(el.dataset.i18nPlaceholder);
        });
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            el.setAttribute('aria-label', t(el.dataset.i18nAria));
        });
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.setAttribute('aria-pressed', String(btn.dataset.lang === language));
        });

        if (!this.cells) {
            return; // first call, before the board exists
        }
        this.cells.forEach((cell, index) => {
            const value = this.shown[index].value;
            if (value !== undefined) {
                cell.setAttribute('aria-label', t('cellLabel', Math.floor(index / BOARD_SIZE), index % BOARD_SIZE, value));
            }
        });
        this.renderResultTitle();
        this.renderLeaderboard();
        this.setLeaderboardStatus(this.leaderboardStatusKey);
    }

    // Build the 81 cells once; render() only updates them. One delegated listener handles input.
    buildBoard() {
        this.cells = [];
        // What each cell currently shows, so render() only touches cells that changed.
        this.shown = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => ({ value: undefined, locked: undefined }));
        this.shownStream = Array(STREAM_LENGTH).fill(undefined);
        this.animatedCells = [];
        this.streamSlots = Array.from({ length: STREAM_LENGTH }, (_, i) => {
            const slot = document.createElement('span');
            slot.className = i === 0 ? 'stream-num current' : 'stream-num';
            return slot;
        });
        this.streamElement.replaceChildren(...this.streamSlots);
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const cell = document.createElement('button');
                cell.type = 'button';
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                this.boardElement.appendChild(cell);
                this.cells.push(cell);
            }
        }

        this.boardElement.addEventListener('click', event => {
            const cell = event.target.closest('.cell');
            if (cell) {
                this.placeFruit(Number(cell.dataset.row), Number(cell.dataset.col));
            }
        });
    }

    loadOrStartGame() {
        const saved = readStorage('currentGame');

        if (isValidSavedGame(saved)) {
            this.mode = saved.mode;
            this.board = saved.board;
            this.stream = saved.stream;
            this.moves = saved.moves;
            this.gameStatus = saved.gameStatus;
            // Only a cleared game can be waiting for a name.
            this.submitted = saved.gameStatus !== 'cleared' || saved.submitted !== false;
            this.render();

            if (this.gameStatus === 'playing') {
                this.showGameScreen();
            } else {
                this.showResult();
            }
            return;
        }

        this.startNewGame();
    }

    startNewGame(mode = this.mode) {
        // A cleared game whose name was never entered is still recorded, anonymously and only on this device.
        if (this.gameStatus === 'cleared' && !this.submitted) {
            this.leaderboard.addEntry('', this.mode, this.moves);
        }
        // Invalidates any move animation still running for the previous game.
        this.generation += 1;
        this.mode = mode;
        this.submitted = true;
        this.board = createBoard(mode);
        this.stream = createStream(mode);
        this.moves = 0;
        this.gameStatus = 'playing';
        this.isResolvingMove = false;
        this.showGameScreen();
        this.render();
        this.saveGameState();
    }

    isInProgress() {
        return this.gameStatus === 'playing' && this.moves > 0;
    }

    confirmNewGame() {
        if (this.isResolvingMove || (this.isInProgress() && !window.confirm(t('confirmNewGame')))) {
            return;
        }
        this.startNewGame();
    }

    changeMode(mode) {
        if (!isMode(mode) || mode === this.mode || this.isResolvingMove) {
            return;
        }
        if (this.isInProgress() && !window.confirm(t('confirmMode'))) {
            return;
        }
        this.startNewGame(mode);
    }

    // Applies the whole move to the game state immediately (so it is saved right away),
    // then plays the animation from a snapshot of the board before the clear.
    async placeFruit(row, col) {
        if (this.gameStatus !== 'playing' || this.isResolvingMove || this.board[row][col] !== null) {
            return;
        }

        this.isResolvingMove = true;
        const generation = this.generation;

        this.board[row][col] = this.stream[0];
        const matchedCells = findMatch(this.board, row, col);
        const boardBeforeClear = this.board.map(line => [...line]);

        this.moves += 1;
        this.stream.shift();
        this.stream.push(randomFruit(this.mode));

        if (matchedCells) {
            matchedCells.forEach(([r, c]) => {
                this.board[r][c] = null;
            });
        }

        this.gameStatus = getStatus(this.board);
        // A cleared game's record is added once the player enters a name (submitScore).
        this.submitted = this.gameStatus !== 'cleared';
        this.saveGameState();

        this.render(boardBeforeClear);
        this.animate([[row, col]], 'new-tile');

        if (matchedCells) {
            await delay(PLACE_DELAY_MS);
            if (generation !== this.generation) {
                return;
            }
            this.animate(matchedCells, 'matched');
            await delay(MATCH_DELAY_MS);
            if (generation !== this.generation) {
                return;
            }
            this.animate(matchedCells, 'removing');
            await delay(REMOVE_DELAY_MS);
            if (generation !== this.generation) {
                return;
            }
        }

        this.isResolvingMove = false;
        this.render();

        if (this.gameStatus !== 'playing') {
            await delay(RESULT_DELAY_MS);
            if (generation === this.generation) {
                this.showResult();
            }
        }
    }

    animate(positions, className) {
        positions.forEach(([r, c]) => {
            const cell = this.getCellElement(r, c);
            cell.classList.add(className);
            this.animatedCells.push(cell);
        });
    }

    getCellElement(row, col) {
        return this.cells[row * BOARD_SIZE + col];
    }

    showResult() {
        this.renderResultTitle();
        this.finalMode.textContent = t(MODE_KEYS[this.mode]);
        this.finalMoves.textContent = this.moves;
        this.finalRemaining.textContent = countFilled(this.board);
        this.renderLeaderboard();

        const awaitingName = this.gameStatus === 'cleared' && !this.submitted;
        this.nameForm.classList.toggle('hidden', !awaitingName);
        if (awaitingName) {
            const remembered = readStorage('playerName');
            this.playerNameInput.value = typeof remembered === 'string' ? remembered : '';
        }

        this.gameScreen.classList.add('hidden');
        this.leaderboardScreen.classList.remove('hidden');
        // During a game the records screen can be closed; after the game ends only a new game is offered.
        this.continueBtn.classList.toggle('hidden', this.gameStatus !== 'playing');
        if (awaitingName) {
            this.playerNameInput.focus();
        } else {
            (this.gameStatus === 'playing' ? this.continueBtn : this.newGameBtn).focus();
        }
        this.refreshRemote();
    }

    renderResultTitle() {
        const keys = { cleared: 'cleared', gameover: 'gameOver', playing: 'inProgress' };
        this.resultTitle.textContent = t(keys[this.gameStatus]);
        this.finalMode.textContent = t(MODE_KEYS[this.mode]);
    }

    // Takes a translation key (or '' to clear) so the text can be re-translated when the language changes.
    setLeaderboardStatus(key) {
        this.leaderboardStatusKey = key;
        const text = key ? t(key) : '';
        if (this.leaderboardStatus.textContent !== text) {
            this.leaderboardStatus.textContent = text;
        }
    }

    // Loads the server leaderboard; on failure the local records stay on screen.
    async refreshRemote() {
        if (!this.remote.enabled) {
            return;
        }
        const token = ++this.remoteToken;
        this.setLeaderboardStatus('loading');
        try {
            const entries = await this.remote.list();
            if (token !== this.remoteToken) {
                return;
            }
            this.leaderboard.remoteEntries = entries;
            this.setLeaderboardStatus('');
        } catch (error) {
            if (token !== this.remoteToken) {
                return;
            }
            console.warn('Failed to load the server leaderboard.', error);
            this.leaderboard.remoteEntries = null;
            this.setLeaderboardStatus('offline');
        }
        this.renderLeaderboard();
        this.renderBest();
    }

    // Records the cleared game under the entered name: always locally, and on the server when configured.
    async submitScore(rawName) {
        if (this.gameStatus !== 'cleared' || this.submitted) {
            return;
        }
        const name = sanitizePlayerName(rawName) || DEFAULT_PLAYER_NAME;
        const result = { name, mode: this.mode, moves: this.moves };
        if (name !== DEFAULT_PLAYER_NAME) {
            writeStorage('playerName', name);
        }

        this.submitted = true;
        this.leaderboard.addEntry(result.name, result.mode, result.moves);
        this.saveGameState();
        this.nameForm.classList.add('hidden');
        this.newGameBtn.focus();
        this.renderLeaderboard();
        this.renderBest();

        if (!this.remote.enabled) {
            return;
        }
        const token = ++this.remoteToken;
        this.setLeaderboardStatus('submitting');
        try {
            const entries = await this.remote.submit(result);
            if (token === this.remoteToken) {
                this.leaderboard.remoteEntries = entries;
                this.setLeaderboardStatus('saved');
            }
        } catch (error) {
            if (token === this.remoteToken) {
                console.warn('Failed to submit to the server leaderboard.', error);
                this.leaderboard.remoteEntries = null;
                this.setLeaderboardStatus('saveFailed');
            }
        }
        if (token === this.remoteToken) {
            this.renderLeaderboard();
            this.renderBest();
        }
    }

    // Best (fewest) turns recorded for the current mode, or '-'.
    renderBest() {
        const [topEntry] = this.leaderboard.getTopEntries(this.mode, 1);
        this.bestElement.textContent = topEntry ? topEntry.moves : '-';
    }

    renderLeaderboard() {
        const entries = this.leaderboard.getTopEntries(this.mode);
        this.topRecordsTitle.textContent = t('topRecords', t(MODE_KEYS[this.mode]));
        this.leaderboardEntries.replaceChildren();

        if (entries.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'entries-empty';
            empty.textContent = t('noRecords');
            this.leaderboardEntries.appendChild(empty);
            return;
        }

        entries.forEach((entry, index) => {
            const date = new Date(entry.date);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

            const item = document.createElement('div');
            item.className = `entry rank-${index + 1}`;

            const rank = document.createElement('div');
            rank.className = 'entry-rank';
            rank.textContent = index + 1;

            const details = document.createElement('div');
            details.className = 'entry-details';

            const name = document.createElement('div');
            name.className = 'entry-name';
            name.textContent = entry.name;

            const score = document.createElement('div');
            score.className = 'entry-score';
            score.textContent = `${entry.moves} ${t('turns')}`;

            const info = document.createElement('div');
            info.className = 'entry-info';
            info.textContent = dateStr;

            details.append(name, score, info);
            item.append(rank, details);
            this.leaderboardEntries.appendChild(item);
        });
    }

    showGameScreen() {
        this.gameScreen.classList.remove('hidden');
        this.leaderboardScreen.classList.add('hidden');
    }

    // `displayBoard` lets a move animation show the board before tiles are cleared.
    render(displayBoard = this.board) {
        const locked = this.isResolvingMove || this.gameStatus !== 'playing';

        this.animatedCells.forEach(cell => cell.classList.remove('new-tile', 'matched', 'removing'));
        this.animatedCells.length = 0;

        this.cells.forEach((cell, index) => {
            const row = Math.floor(index / BOARD_SIZE);
            const col = index % BOARD_SIZE;
            const value = displayBoard[row][col];
            const shown = this.shown[index];
            if (shown.value === value && shown.locked === locked) {
                return;
            }

            const filled = value !== null;
            if (shown.value !== value) {
                cell.className = `cell ${filled ? 'filled' : 'empty'}`;
                cell.replaceChildren(...(filled ? [fruitImage(value)] : []));
                cell.tabIndex = filled ? -1 : 0;
                cell.setAttribute('aria-label', t('cellLabel', row, col, value));
            }
            cell.setAttribute('aria-disabled', String(filled || locked));
            shown.value = value;
            shown.locked = locked;
        });

        this.stream.forEach((value, i) => {
            if (this.shownStream[i] !== value) {
                this.streamSlots[i].replaceChildren(fruitImage(value));
                this.shownStream[i] = value;
            }
        });

        const remaining = countFilled(this.board);
        this.movesElement.textContent = this.moves;
        this.remainingElement.textContent = remaining;
        this.renderBest();
        this.modeButtons.forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.mode === this.mode));
        });

        // Announce once per move: skip the intermediate render that shows the pre-clear board.
        if (displayBoard === this.board) {
            const status = this.statusPrefix + t('status', this.moves, remaining, this.stream[0]);
            this.statusPrefix = '';
            if (this.statusElement.textContent !== status) {
                this.statusElement.textContent = status;
            }
        }
    }

    saveGameState() {
        writeStorage('currentGame', {
            mode: this.mode,
            board: this.board,
            stream: this.stream,
            moves: this.moves,
            gameStatus: this.gameStatus,
            submitted: this.submitted,
            savedAt: new Date().toISOString()
        });
    }
}

let game;
if (document.getElementById('board')) {
    document.addEventListener('DOMContentLoaded', () => {
        game = new FruitsGame();
    });
}

if ('serviceWorker' in navigator && /^https:|^http:\/\/localhost/.test(location.href)) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(error => console.warn('Service worker failed.', error));
    });
}
