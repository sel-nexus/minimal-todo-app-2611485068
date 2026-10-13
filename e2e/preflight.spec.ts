import { test, expect } from '@playwright/test';

test('captures accessibility, computed styles, HTML, and screenshots for empty and populated states', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.getByTestId('empty-state')).toBeVisible();

  const emptyAccessibility = await page.locator('body').ariaSnapshot();
  const emptyStyles = await page.evaluate(() => ({
    bodyFont: getComputedStyle(document.body).fontFamily,
    pageBackground: getComputedStyle(document.documentElement).backgroundColor,
    headingSize: getComputedStyle(document.querySelector('h1')!).fontSize,
    inputFocusStyle: getComputedStyle(document.querySelector('#todo-input')!).outlineStyle,
  }));
  const emptyHtml = await page.content();
  await page.screenshot({ path: 'test-results/preflight-empty.png', fullPage: true });

  await page.getByTestId('todo-input').fill('Review the test fixture');
  await page.getByTestId('add-button').click();
  await expect(page.getByTestId('todo-item-1')).toBeVisible();

  const populatedAccessibility = await page.locator('body').ariaSnapshot();
  const populatedStyles = await page.evaluate(() => ({
    titleDecoration: getComputedStyle(document.querySelector('[data-testid="todo-title-1"]')!).textDecorationLine,
    taskRowDisplay: getComputedStyle(document.querySelector('[data-testid="todo-item-1"]')!).display,
  }));
  const populatedHtml = await page.content();
  await page.screenshot({ path: 'test-results/preflight-populated.png', fullPage: true });

  expect(emptyAccessibility).toContain('No tasks yet.');
  expect(emptyStyles.bodyFont).toContain('Helvetica Neue');
  expect(emptyStyles.pageBackground).toBe('rgb(247, 246, 242)');
  expect(emptyStyles.headingSize).not.toBe('');
  expect(emptyHtml).toContain('data-testid="todo-list"');
  expect(populatedAccessibility).toContain('Review the test fixture');
  expect(populatedStyles.titleDecoration).toBe('none');
  expect(populatedStyles.taskRowDisplay).toBe('flex');
  expect(populatedHtml).toContain('data-testid="todo-item-1"');
});
