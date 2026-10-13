import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

/**
 * Create a small DOM implementation sufficient to execute the page's inline app script.
 * @param {string} tagName Element tag name.
 * @returns {object} A DOM-like element with event and child behavior.
 */
function createElement(tagName) {
  const listeners = new Map();
  const attributes = new Map();
  const element = {
    tagName: tagName.toUpperCase(),
    children: [],
    dataset: {},
    className: '',
    textContent: '',
    value: '',
    checked: false,
    hidden: false,
    type: '',
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren(...children) { this.children = [...children]; },
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    addEventListener(name, callback) {
      const callbacks = listeners.get(name) ?? [];
      callbacks.push(callback);
      listeners.set(name, callbacks);
    },
    dispatch(name, event = {}) {
      for (const callback of listeners.get(name) ?? []) callback({ ...event, preventDefault() {}, target: this });
    },
    get innerHTML() { return this.children.map((child) => child.outerHTML).join(''); },
    get outerHTML() {
      const testId = this.dataset.testid ? ` data-testid="${this.dataset.testid}"` : '';
      const checked = this.checked ? ' checked' : '';
      const hidden = this.hidden ? ' hidden' : '';
      const className = this.className ? ` class="${this.className}"` : '';
      const content = this.children.length ? this.innerHTML : this.textContent;
      return `<${this.tagName.toLowerCase()}${testId}${className}${checked}${hidden}>${content}</${this.tagName.toLowerCase()}>`;
    },
  };
  return element;
}

/**
 * Load the inline application script into a fresh deterministic DOM harness.
 * @returns {Promise<object>} The page elements and script execution context.
 */
async function loadApp() {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'index.html contains an inline application script');

  const elements = new Map([
    ['todo-form', createElement('form')],
    ['todo-input', createElement('input')],
    ['empty-state', createElement('p')],
    ['todo-list', createElement('ul')],
    ['task-count', createElement('span')],
  ]);
  elements.get('empty-state').textContent = 'No tasks yet.';
  const document = {
    getElementById(id) { return elements.get(id) ?? null; },
    createElement,
  };
  vm.runInNewContext(script, { document });
  return { elements, document };
}

/**
 * Find a rendered task element by its stable test selector.
 * @param {object} list Rendered todo list.
 * @param {string} testId Expected task selector.
 * @returns {object | undefined} Matching task element.
 */
function findByTestId(list, testId) {
  return list.children.find((child) => child.dataset.testid === testId);
}

test('initial render exposes the exact empty state and an empty list', async () => {
  const { elements } = await loadApp();
  assert.equal(elements.get('empty-state').textContent, 'No tasks yet.');
  assert.equal(elements.get('empty-state').hidden, false);
  assert.equal(elements.get('todo-list').innerHTML, '');
  assert.equal(elements.get('task-count').textContent, '0 tasks');
});

test('adding trims the title, assigns sequential IDs, preserves order, and clears input', async () => {
  const { elements } = await loadApp();
  const input = elements.get('todo-input');
  input.value = '  Buy milk  ';
  elements.get('todo-form').dispatch('submit');
  input.value = 'Walk dog';
  elements.get('todo-form').dispatch('submit');

  const list = elements.get('todo-list');
  assert.deepEqual(list.children.map((item) => item.dataset.testid), ['todo-item-1', 'todo-item-2']);
  assert.equal(findByTestId(list, 'todo-item-1').children[1].textContent, 'Buy milk');
  assert.equal(findByTestId(list, 'todo-item-2').children[1].textContent, 'Walk dog');
  assert.equal(input.value, '');
  assert.equal(elements.get('empty-state').hidden, true);
  assert.equal(elements.get('task-count').textContent, '2 tasks');
});

test('empty and whitespace-only submissions create no task and preserve input', async () => {
  const { elements } = await loadApp();
  const input = elements.get('todo-input');
  for (const value of ['', '   \t  ']) {
    input.value = value;
    elements.get('todo-form').dispatch('submit');
    assert.equal(elements.get('todo-list').children.length, 0);
    assert.equal(input.value, value);
  }
  assert.equal(elements.get('empty-state').hidden, false);
});

test('completion toggles only the selected task and updates its accessible label', async () => {
  const { elements } = await loadApp();
  const input = elements.get('todo-input');
  input.value = 'Buy milk';
  elements.get('todo-form').dispatch('submit');
  input.value = 'Walk dog';
  elements.get('todo-form').dispatch('submit');

  const list = elements.get('todo-list');
  const first = findByTestId(list, 'todo-item-1');
  const checkbox = first.children[0];
  checkbox.checked = true;
  checkbox.dispatch('change');

  const completed = findByTestId(elements.get('todo-list'), 'todo-item-1');
  const untouched = findByTestId(elements.get('todo-list'), 'todo-item-2');
  assert.equal(completed.children[0].checked, true);
  assert.equal(completed.children[1].className, 'todo-title completed');
  assert.equal(completed.children[0].getAttribute('aria-label'), 'Mark Buy milk incomplete');
  assert.equal(untouched.children[0].checked, false);
  assert.equal(untouched.children[1].className, 'todo-title');

  completed.children[0].checked = false;
  completed.children[0].dispatch('change');
  assert.equal(findByTestId(elements.get('todo-list'), 'todo-item-1').children[1].className, 'todo-title');
});

test('deleting removes only the selected task and restores empty state after the last task', async () => {
  const { elements } = await loadApp();
  const input = elements.get('todo-input');
  input.value = 'Buy milk';
  elements.get('todo-form').dispatch('submit');
  input.value = 'Walk dog';
  elements.get('todo-form').dispatch('submit');

  findByTestId(elements.get('todo-list'), 'todo-item-1').children[2].dispatch('click');
  assert.deepEqual(elements.get('todo-list').children.map((item) => item.dataset.testid), ['todo-item-2']);
  assert.equal(elements.get('empty-state').hidden, true);

  findByTestId(elements.get('todo-list'), 'todo-item-2').children[2].dispatch('click');
  assert.equal(elements.get('todo-list').innerHTML, '');
  assert.equal(elements.get('empty-state').hidden, false);
  assert.equal(elements.get('empty-state').textContent, 'No tasks yet.');
});

test('page markup preserves the required selector contract and has no external dependencies', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<h1>Todo App<\/h1>/);
  assert.match(html, /<input id="todo-input" data-testid="todo-input" type="text"/);
  assert.match(html, /<button id="add-button" data-testid="add-button" type="submit">Add<\/button>/);
  assert.match(html, /<p id="empty-state" data-testid="empty-state">No tasks yet\.<\/p>/);
  assert.match(html, /<ul id="todo-list" data-testid="todo-list"><\/ul>/);
  assert.doesNotMatch(html, /<script\s+[^>]*src=/i);
  assert.doesNotMatch(html, /<link\s+[^>]*rel=["']stylesheet/i);
  assert.doesNotMatch(html, /localStorage|Date\.now|Math\.random/);
});
