const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Code.gs is a plain script; load its pure helpers into a sandbox (Apps Script globals are not needed for them).
const source = fs.readFileSync(path.join(__dirname, '..', 'server', 'apps-script', 'Code.gs'), 'utf8');
const sandbox = {};
vm.runInNewContext(source, sandbox);

const valid = { name: ' 민수 ', mode: 'normal', moves: 42 };

test('validateSubmission_ accepts a good record and cleans the name', () => {
    assert.deepEqual({ ...sandbox.validateSubmission_(valid) }, { name: '민수', mode: 'normal', moves: 42 });
    assert.equal(sandbox.validateSubmission_({ ...valid, name: '' }).name, '익명');
    assert.equal(sandbox.validateSubmission_({ ...valid, name: 'x'.repeat(40) }).name.length, 12);
    assert.ok(sandbox.validateSubmission_({ ...valid, mode: 'hard' }));
});

test('validateSubmission_ rejects bad modes and move counts', () => {
    for (const bad of [{ mode: 'easy' }, { mode: undefined }, { moves: 0 }, { moves: -1 }, { moves: 1.5 }, { moves: '42' }, { moves: 1e9 }]) {
        assert.equal(sandbox.validateSubmission_({ ...valid, ...bad }), null, JSON.stringify(bad));
    }
});

test('topEntries_ orders by fewest moves then newest, per mode, and keeps 20 per mode', () => {
    const row = (timestamp, name, mode, moves) => [timestamp, name, mode, moves];
    const rows = [row(1, 'a', 'normal', 50), row(2, 'b', 'normal', 40), row(3, 'c', 'normal', 40),
        row(4, 'h', 'hard', 90), row(5, 'x', 'easy', 1), ['bad']];
    const result = sandbox.topEntries_(rows);
    assert.deepEqual(Array.from(result, e => e.name), ['c', 'b', 'a', 'h']);

    const many = Array.from({ length: 30 }, (_, i) => row(i + 1, `p${i}`, 'normal', i + 1));
    const top = sandbox.topEntries_(many);
    assert.equal(top.length, 20);
    assert.equal(top[0].name, 'p0');
});
