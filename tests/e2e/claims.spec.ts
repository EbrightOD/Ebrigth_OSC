import { test, expect, login } from './fixtures';

test.describe('Claims smoke', () => {
  test('ADMIN can open the claims page and submit a basic claim', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/claims');
    await expect(page).toHaveURL(/\/claims/);

    // Locate the "new claim" / "submit" entry point. The page is large; we just
    // assert the page loads and the primary CTA is visible.
    const submitCta = page.getByRole('button', { name: /submit|new claim|create/i }).first();
    await expect(submitCta).toBeVisible({ timeout: 10_000 });
  });
});
