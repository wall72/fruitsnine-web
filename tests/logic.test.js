const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');

const emptyBoard = () => L.createEmptyBoard();

// Deterministic rng that walks through the given sequence of [0,1) values.
const seq = values => { let i = 0; return () => values[i++ % values.length]; };

test('createBoard fills the inner 7x7 only, with kinds below the mode size', () => {
    for (const mode of Object.keys(L.MODES)) {
        const board = L.createBoard(mode);
        assert.equal(L.countFilled(board), 49);
        board.forEach((line, row) => line.forEach((value, col) => {
            const inner = row >= 1 && row <= 7 && col >= 1 && col <= 7;
            assert.equal(value !== null, inner);
            if (inner) {
                assert.ok(Number.isInteger(value) && value >= 0 && value < L.MODES[mode]);
            }
        }));
    }
});

test('createStream has 4 fruits of the mode', () => {
    const stream = L.createStream('hard', seq([0.999, 0]));
    assert.deepEqual(stream, [11, 0, 11, 0]);
    assert.equal(L.createStream('normal').length, L.STREAM_LENGTH);
    assert.equal(L.STREAM_LENGTH, 4);
});

test('getNeighbours returns 8 inside, 5 on an edge and 3 in a corner', () => {
    assert.equal(L.getNeighbours(4, 4).length, 8);
    assert.equal(L.getNeighbours(0, 4).length, 5);
    assert.equal(L.getNeighbours(4, 8).length, 5);
    assert.equal(L.getNeighbours(0, 0).length, 3);
    assert.equal(L.getNeighbours(8, 8).length, 3);
});

test('findMatch clears a full 3x3 of different fruits, placed cell first', () => {
    const board = emptyBoard();
    let n = 0;
    for (let r = 3; r <= 5; r++) for (let c = 3; c <= 5; c++) board[r][c] = n++;
    const match = L.findMatch(board, 4, 4);
    assert.equal(match.length, 9);
    assert.deepEqual(match[0], [4, 4]);
});

test('findMatch fails on duplicates or an empty neighbour', () => {
    const board = emptyBoard();
    let n = 0;
    for (let r = 3; r <= 5; r++) for (let c = 3; c <= 5; c++) board[r][c] = n++;
    board[3][3] = board[5][5];
    assert.equal(L.findMatch(board, 4, 4), null);
    board[3][3] = null;
    assert.equal(L.findMatch(board, 4, 4), null);
});

test('edge and corner cells need fewer different fruits (legacy rule)', () => {
    const board = emptyBoard();
    board[0][0] = 0; board[0][1] = 1; board[1][0] = 2; board[1][1] = 3;
    assert.equal(L.findMatch(board, 0, 0).length, 4);
    board[1][1] = 2;
    assert.equal(L.findMatch(board, 0, 0), null);
    // A lone fruit has no neighbours to compare, but an unfilled neighbour still blocks the match.
    const lone = emptyBoard();
    lone[4][4] = 1;
    assert.equal(L.findMatch(lone, 4, 4), null);
});

test('getStatus reports cleared, playing and gameover', () => {
    const board = emptyBoard();
    assert.equal(L.getStatus(board), 'cleared');
    board[0][0] = 1;
    assert.equal(L.getStatus(board), 'playing');
    assert.equal(L.getStatus(board.map(line => line.map(() => 1))), 'gameover');
});

test('isValidSavedGame checks mode, kinds, stream length and status', () => {
    const base = () => ({ mode: 'normal', board: L.createBoard('normal'), stream: [0, 1, 2, 3], moves: 0, gameStatus: 'playing' });
    assert.ok(L.isValidSavedGame(base()));
    assert.ok(!L.isValidSavedGame(null));
    assert.ok(!L.isValidSavedGame({ ...base(), mode: 'easy' }));
    assert.ok(!L.isValidSavedGame({ ...base(), stream: [0, 1, 2] }));
    assert.ok(!L.isValidSavedGame({ ...base(), stream: [0, 1, 2, 9] }), 'kind 9 exists only in hard mode');
    assert.ok(L.isValidSavedGame({ ...base(), mode: 'hard', stream: [0, 1, 2, 11] }));
    assert.ok(!L.isValidSavedGame({ ...base(), gameStatus: 'cleared' }));
    assert.ok(!L.isValidSavedGame({ ...base(), moves: -1 }));
    const bad = base();
    bad.board[0][0] = 99;
    assert.ok(!L.isValidSavedGame(bad));
});

test('sanitizePlayerName strips controls, collapses spaces and caps the length', () => {
    assert.equal(L.sanitizePlayerName('  a\u0000b   c '), 'a b c');
    assert.equal(L.sanitizePlayerName('x'.repeat(40)).length, L.PLAYER_NAME_MAX);
    assert.equal(L.sanitizePlayerName(5), '');
});

const entry = (mode, moves, timestamp, extra) => ({
    name: 'p', mode, moves, remaining: 0, status: 'cleared',
    date: new Date(timestamp).toISOString(), timestamp, ...extra
});

test('normalizeEntries drops invalid items, defaults names and sorts by fewest moves then newest', () => {
    const list = [entry('normal', 30, 1), entry('normal', 20, 2), entry('normal', 20, 3, { name: '' }),
        entry('easy', 10, 4), entry('normal', 0, 5), { bad: true }];
    const result = L.normalizeEntries(list);
    assert.deepEqual(result.map(e => [e.moves, e.timestamp]), [[20, 3], [20, 2], [30, 1]]);
    assert.equal(result[0].name, L.DEFAULT_PLAYER_NAME);
    assert.deepEqual(L.normalizeEntries('nope'), []);
});

test('addLeaderboardEntry keeps the best 20 per mode', () => {
    let entries = [];
    for (let i = 0; i < 25; i++) entries = L.addLeaderboardEntry(entries, entry('normal', 100 - i, i + 1));
    entries = L.addLeaderboardEntry(entries, entry('hard', 200, 99));
    assert.equal(L.entriesForMode(entries, 'normal').length, 20);
    assert.equal(L.entriesForMode(entries, 'normal')[0].moves, 76);
    assert.equal(L.entriesForMode(entries, 'hard').length, 1);
});
