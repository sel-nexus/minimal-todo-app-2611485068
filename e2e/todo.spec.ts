import { test, expect } from '@playwright/test';

function captureBrowserErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      errors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

test('adds tasks by button and Enter with trimmed titles and sequential IDs', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/index.html');
  await expect(page.getByRole('heading', { name: 'Todo App' })).toBeVisible();
  await expect(page.getByTestId('empty-state')).toHaveText('No tasks yet.');
  await expect(page.getByTestId('todo-list')).toBeEmpty();

  await page.getByTestId('todo-input').fill('  Buy milk  ');
  await page.getByTestId('add-button').click();
  await expect(page.getByTestId('todo-item-1')).toBeVisible();
  await expect(page.getByTestId('todo-title-1')).toHaveText('Buy milk');
  await expect(page.getByTestId('todo-input')).toHaveValue('');
  await expect(page.getByTestId('empty-state')).toBeHidden();

  await page.getByTestId('todo-input').fill('Walk dog');
  await page.getByTestId('todo-input').press('Enter');
  await expect(page.getByTestId('todo-item-2')).toBeVisible();
  await expect(page.getByTestId('todo-title-2')).toHaveText('Walk dog');
  await expect(page.getByTestId('todo-list').locator('li')).toHaveCount(2);
  expect(browserErrors).toEqual([]);
});

test('blank submissions are silent no-ops and preserve the empty state', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/index.html');
  for (const value of ['', '   ']) {
    await page.getByTestId('todo-input').fill(value);
    await page.getByTestId('add-button').click();
    await expect(page.getByTestId('todo-list')).toBeEmpty();
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByTestId('empty-state')).toHaveText('No tasks yet.');
  }
  expect(browserErrors).toEqual([]);
});

test('completion toggles only the selected task and updates its title styling', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/index.html');
  await page.getByTestId('todo-input').fill('Buy milk');
  await page.getByTestId('add-button').click();
  await page.getByTestId('todo-input').fill('Walk dog');
  await page.getByTestId('add-button').click();

  await page.getByTestId('todo-checkbox-1').check();
  await expect(page.getByTestId('todo-title-1')).toHaveCSS('text-decoration-line', 'line-through');
  await expect(page.getByTestId('todo-checkbox-2')).not.toBeChecked();
  await page.getByTestId('todo-checkbox-1').uncheck();
  await expect(page.getByTestId('todo-title-1')).not.toHaveCSS('text-decoration-line', 'line-through');
  expect(browserErrors).toEqual([]);
});

test('deletion removes only the selected task and restores the empty state', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/index.html');
  await page.getByTestId('todo-input').fill('Buy milk');
  await page.getByTestId('add-button').click();
  await page.getByTestId('todo-input').fill('Walk dog');
  await page.getByTestId('add-button').click();

  await page.getByTestId('todo-delete-1').click();
  await expect(page.getByTestId('todo-item-1')).toHaveCount(0);
  await expect(page.getByTestId('todo-item-2')).toBeVisible();
  await page.getByTestId('todo-delete-2').click();
  await expect(page.getByTestId('todo-list')).toBeEmpty();
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByTestId('empty-state')).toHaveText('No tasks yet.');
  expect(browserErrors).toEqual([]);
});

test('task controls have accessible names and in-memory state resets on reload', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/index.html');
  await page.getByTestId('todo-input').fill('Read a book');
  await page.getByTestId('add-button').click();
  await expect(page.getByRole('checkbox', { name: 'Mark Read a book complete' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete Read a book' })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByTestId('todo-list')).toBeEmpty();
  expect(browserErrors).toEqual([]);
});
