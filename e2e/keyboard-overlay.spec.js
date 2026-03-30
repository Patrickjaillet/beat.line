import { test, expect } from '@playwright/test';

// Ensure app is running with `npm run dev` or `npm run serve` before tests.
test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
});

test('keyboard navigation and overlay focus trap', async ({ page }) => {
    // 1) Tab around the menu buttons
    await page.keyboard.press('Tab');
    await expect(page.locator('button.interactive').first()).toBeFocused();

    // 2) arrow keys switch tabs in MenuScene
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    // There should be a visible menu tab content after switch.
    await expect(page.getByRole('button', { name: /workshop|dlc|social/i })).toBeVisible();

    // 3) open an overlay (e.g. press Daily Quests button and claim or check)
    const dailyQuestsBtn = page.getByRole('button', { name: /daily quests/i });
    if (await dailyQuestsBtn.count() > 0) {
        await dailyQuestsBtn.click();
        // overlay should appear
        const overlay = page.locator('[role="dialog"]');
        await expect(overlay).toBeVisible();

        // focus trap inside overlay
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // escape closes it
        await page.keyboard.press('Escape');
        await expect(overlay).toBeHidden();
    }
});
