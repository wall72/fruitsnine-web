const { test, expect } = require('@playwright/test');

const emptyBoard = () => Array.from({ length: 9 }, () => Array(9).fill(null));

const savedGame = overrides => JSON.stringify({
    mode: 'normal', board: emptyBoard(), stream: [0, 1, 2, 3], moves: 0, gameStatus: 'playing',
    savedAt: new Date().toISOString(), ...overrides
});

// A 3x3 block around (4,4) holding fruits 1..8 and a gap in the middle; placing fruit 0 there matches.
const ringBoard = (extra = []) => {
    const board = emptyBoard();
    let n = 1;
    for (let r = 3; r <= 5; r++) {
        for (let c = 3; c <= 5; c++) {
            if (r !== 4 || c !== 4) board[r][c] = n++;
        }
    }
    extra.forEach(([r, c, v]) => { board[r][c] = v; });
    return board;
};

const seed = (page, key, value) =>
    page.addInitScript(([k, v]) => {
        if (!sessionStorage.getItem('seeded')) {
            localStorage.setItem(k, v);
            sessionStorage.setItem('seeded', '1');
        }
    }, [key, value]);

test.beforeEach(async ({ page }) => {
    // The shipped config.js may point at the real leaderboard; tests must never read or write it.
    await page.route('**/config.js', route => route.fulfill({
        contentType: 'text/javascript',
        body: "window.FRUITS_CONFIG = { leaderboardApiUrl: '' };"
    }));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => msg.type() === 'error' && errors.push(msg.text()));
    test.info().errors = errors;
});

test.afterEach(() => {
    expect(test.info().errors).toEqual([]);
});

test('starts a new game with a 9x9 board, 49 tiles and a 4-fruit queue', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cell')).toHaveCount(81);
    await expect(page.locator('.cell.filled')).toHaveCount(49);
    await expect(page.locator('.stream-num')).toHaveCount(4);
    await expect(page.locator('.stream-num img')).toHaveCount(4);
    await expect(page.locator('#remaining')).toHaveText('49');
    await expect(page.locator('#best')).toHaveText('-');
});

test('placing a fruit counts a turn and survives a reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('.cell.empty').first().click();
    await expect(page.locator('#moves')).toHaveText('1');
    await expect(page.locator('.cell[aria-disabled="true"].empty')).toHaveCount(0);
    const tiles = await page.locator('#remaining').textContent();
    await page.reload();
    await expect(page.locator('#moves')).toHaveText('1');
    await expect(page.locator('#remaining')).toHaveText(tiles);
});

test('a placement next to eight different fruits removes all nine', async ({ page }) => {
    await seed(page, 'currentGame', savedGame({ board: ringBoard([[0, 0, 5]]), stream: [0, 1, 2, 3] }));
    await page.goto('/');
    await expect(page.locator('#remaining')).toHaveText('9');

    await page.locator('.cell').nth(4 * 9 + 4).click();
    await expect(page.locator('#remaining')).toHaveText('1');
    await expect(page.locator('.cell.filled')).toHaveCount(1);
    await expect(page.locator('#moves')).toHaveText('1');
});

test('a duplicate fruit among the neighbours prevents the match', async ({ page }) => {
    await seed(page, 'currentGame', savedGame({ board: ringBoard(), stream: [1, 0, 2, 3] }));
    await page.goto('/');
    await page.locator('.cell').nth(4 * 9 + 4).click();
    await expect(page.locator('#remaining')).toHaveText('9');
});

test('clearing the board asks for a name and records the turns per mode', async ({ page }) => {
    await seed(page, 'currentGame', savedGame({ board: ringBoard(), stream: [0, 1, 2, 3], moves: 11 }));
    await page.goto('/');
    await page.locator('.cell').nth(4 * 9 + 4).click();

    await expect(page.locator('#leaderboardScreen')).toBeVisible();
    await expect(page.locator('#resultTitle')).toHaveText('Cleared!');
    await expect(page.locator('#finalMoves')).toHaveText('12');
    await expect(page.locator('#nameForm')).toBeVisible();

    await page.locator('#playerName').fill('Tester');
    await page.getByRole('button', { name: 'Save Record' }).click();
    await expect(page.locator('#nameForm')).toBeHidden();
    await expect(page.locator('.entry')).toHaveCount(1);
    await expect(page.locator('.entry-name')).toHaveText('Tester');
    await expect(page.locator('.entry-score')).toHaveText('12 Turns');

    // Records are per mode: the hard board is empty.
    await page.getByRole('button', { name: 'New Game' }).click();
    await expect(page.locator('#best')).toHaveText('12');
    await page.locator('.mode-btn[data-mode="hard"]').click();
    await expect(page.locator('#best')).toHaveText('-');
});

test('filling the board is a game over and is not recorded', async ({ page }) => {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    board[4][4] = null;
    await seed(page, 'currentGame', savedGame({ board, stream: [0, 1, 2, 3], moves: 50 }));
    await page.goto('/');
    await page.locator('.cell').nth(4 * 9 + 4).click();

    await expect(page.locator('#resultTitle')).toHaveText('Game Over');
    await expect(page.locator('#nameForm')).toBeHidden();
    await expect(page.locator('.entries-empty')).toBeVisible();
});

test('switching mode starts a new game and the mode survives a reload', async ({ page }) => {
    await page.goto('/');
    page.on('dialog', dialog => dialog.accept());
    await page.locator('.cell.empty').first().click();
    await expect(page.locator('#moves')).toHaveText('1');
    await expect(page.locator('.cell[aria-disabled="true"].empty')).toHaveCount(0);

    await page.locator('.mode-btn[data-mode="hard"]').click();
    await expect(page.locator('#moves')).toHaveText('0');
    await expect(page.locator('.mode-btn[data-mode="hard"]')).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.locator('.mode-btn[data-mode="hard"]')).toHaveAttribute('aria-pressed', 'true');
});

test('a corrupt saved game is discarded and a new one starts', async ({ page }) => {
    await seed(page, 'currentGame', '{"mode":"normal","board":1}');
    await page.goto('/');
    await expect(page.locator('.cell.filled')).toHaveCount(49);
});

test('i18n: the language toggle switches the UI and is remembered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#restartBtn')).toHaveText('New Game');
    await page.locator('.lang-btn[data-lang="ko"]').first().click();
    await expect(page.locator('#restartBtn')).toHaveText('새 게임');
    await page.reload();
    await expect(page.locator('#restartBtn')).toHaveText('새 게임');
});

test('how to play opens as a dialog and closes', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-action="howToPlay"]').first().click();
    await expect(page.locator('#howToPlayDialog')).toBeVisible();
    await page.locator('#howToPlayClose').click();
    await expect(page.locator('#howToPlayDialog')).toBeHidden();
});
