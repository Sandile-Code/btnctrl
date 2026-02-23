const actionType = document.getElementById('actionType');
const keyInput = document.getElementById('keyInput');
const mouseButton = document.getElementById('mouseButton');
const waitInput = document.getElementById('waitInput');
const addActionBtn = document.getElementById('addActionBtn');

const stepsList = document.getElementById('stepsList');
const emptyMessage = document.getElementById('emptyMessage');

const loopToggle = document.getElementById('loopToggle');
const runBtn = document.getElementById('runBtn');
const cancelBtn = document.getElementById('cancelBtn');
const clearBtn = document.getElementById('clearBtn');
const status = document.getElementById('status');

const steps = [];
let isRunning = false;
let cancelRequested = false;

function renderSteps() {
  stepsList.innerHTML = '';
  emptyMessage.style.display = steps.length === 0 ? 'block' : 'none';

  steps.forEach((step, index) => {
    const li = document.createElement('li');
    li.className = 'step-item';

    const text = document.createElement('span');
    text.textContent = describeStep(step);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '削除';
    removeBtn.disabled = isRunning;
    removeBtn.addEventListener('click', () => {
      steps.splice(index, 1);
      renderSteps();
    });

    li.append(text, removeBtn);
    stepsList.appendChild(li);
  });
}

function describeStep(step) {
  if (step.type === 'key') return `キー入力: ${step.key}`;
  if (step.type === 'mouse') return `マウス: ${step.button} クリック`;
  return `待機: ${step.duration}ms`;
}

function addAction() {
  const type = actionType.value;

  if (type === 'key') {
    const key = keyInput.value.trim();
    if (!key) {
      alert('キー入力内容を指定してください。');
      return;
    }
    steps.push({ type, key });
  }

  if (type === 'mouse') {
    steps.push({ type, button: mouseButton.value });
  }

  if (type === 'wait') {
    const duration = Number(waitInput.value);
    if (Number.isNaN(duration) || duration < 0) {
      alert('待機時間は0以上の数値を指定してください。');
      return;
    }
    steps.push({ type, duration });
  }

  renderSteps();

  if (type === 'key') {
    keyInput.focus();
    keyInput.select();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeKeyName(rawKey) {
  const keyMap = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    arrowup: 'ArrowUp',
    arrowdown: 'ArrowDown',
    arrowleft: 'ArrowLeft',
    arrowright: 'ArrowRight',
    '↑': 'ArrowUp',
    '↓': 'ArrowDown',
    '←': 'ArrowLeft',
    '→': 'ArrowRight',
    esc: 'Escape',
    del: 'Delete',
    space: ' ',
  };

  const trimmed = rawKey.trim();
  if (!trimmed) return '';
  const mapped = keyMap[trimmed.toLowerCase()];
  if (mapped) return mapped;
  if (trimmed.length === 1) return trimmed;
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}


function formatShortcut(parts) {
  const segments = [];
  if (parts.ctrlKey) segments.push('Ctrl');
  if (parts.shiftKey) segments.push('Shift');
  if (parts.altKey) segments.push('Alt');
  if (parts.metaKey) segments.push('Meta');
  segments.push(parts.key === ' ' ? 'Space' : parts.key);
  return segments.join('+');
}

function parseKeyEventToShortcut(event) {
  const parts = {
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
    key: normalizeKeyName(event.key),
  };

  if (['Control', 'Shift', 'Alt', 'Meta'].includes(parts.key)) {
    return '';
  }

  if (!parts.key) return '';
  return formatShortcut(parts);
}

function parseShortcut(rawShortcut) {
  const tokens = rawShortcut
    .split('+')
    .map((token) => token.trim())
    .filter(Boolean);

  const parts = {
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    key: '',
  };

  tokens.forEach((token) => {
    const lower = token.toLowerCase();

    if (lower === 'ctrl' || lower === 'control') {
      parts.ctrlKey = true;
      return;
    }

    if (lower === 'shift') {
      parts.shiftKey = true;
      return;
    }

    if (lower === 'alt' || lower === 'option') {
      parts.altKey = true;
      return;
    }

    if (lower === 'meta' || lower === 'cmd' || lower === 'command' || lower === 'win') {
      parts.metaKey = true;
      return;
    }

    parts.key = normalizeKeyName(token);
  });

  if (!parts.key && tokens.length > 0) {
    parts.key = normalizeKeyName(tokens[tokens.length - 1]);
  }

  return parts;
}

function getEventTarget() {
  if (document.activeElement && document.activeElement !== document.body) {
    return document.activeElement;
  }
  return document.body;
}

function isEditableElement(element) {
  if (!(element instanceof HTMLElement)) return false;

  return (
    element.isContentEditable ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  );
}

function moveCaretInTextControl(control, direction) {
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return;
  if (typeof control.selectionStart !== 'number' || typeof control.selectionEnd !== 'number') return;

  const current = control.selectionEnd;
  const max = control.value.length;

  if (direction === 'ArrowLeft') {
    const next = Math.max(0, current - 1);
    control.setSelectionRange(next, next);
    return;
  }

  if (direction === 'ArrowRight') {
    const next = Math.min(max, current + 1);
    control.setSelectionRange(next, next);
    return;
  }

  if (!(control instanceof HTMLTextAreaElement)) return;

  const value = control.value;
  const lineStart = value.lastIndexOf('\n', current - 1) + 1;
  const lineEndCandidate = value.indexOf('\n', current);
  const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;
  const column = current - lineStart;

  if (direction === 'ArrowUp') {
    if (lineStart === 0) return;
    const prevLineEnd = lineStart - 1;
    const prevLineStart = value.lastIndexOf('\n', prevLineEnd - 1) + 1;
    const prevLineLength = prevLineEnd - prevLineStart;
    const next = prevLineStart + Math.min(column, prevLineLength);
    control.setSelectionRange(next, next);
    return;
  }

  if (direction === 'ArrowDown') {
    if (lineEnd >= value.length) return;
    const nextLineStart = lineEnd + 1;
    const nextLineEndCandidate = value.indexOf('\n', nextLineStart);
    const nextLineEnd = nextLineEndCandidate === -1 ? value.length : nextLineEndCandidate;
    const nextLineLength = nextLineEnd - nextLineStart;
    const next = nextLineStart + Math.min(column, nextLineLength);
    control.setSelectionRange(next, next);
  }
}

function applyDefaultKeyBehavior(target, shortcut) {
  if (shortcut.key.startsWith('Arrow')) {
    if (isEditableElement(target)) {
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        moveCaretInTextControl(target, shortcut.key);
      }
      return;
    }

    const amount = 50;
    if (shortcut.key === 'ArrowUp') window.scrollBy({ top: -amount, behavior: 'smooth' });
    if (shortcut.key === 'ArrowDown') window.scrollBy({ top: amount, behavior: 'smooth' });
    if (shortcut.key === 'ArrowLeft') window.scrollBy({ left: -amount, behavior: 'smooth' });
    if (shortcut.key === 'ArrowRight') window.scrollBy({ left: amount, behavior: 'smooth' });
    return;
  }

  if (shortcut.key.length === 1 && isEditableElement(target)) {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      const nextValue = `${target.value.slice(0, start)}${shortcut.key}${target.value.slice(end)}`;
      target.value = nextValue;
      const nextCursor = start + shortcut.key.length;
      target.setSelectionRange(nextCursor, nextCursor);
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

async function executeKeyStep(rawShortcut) {
  const shortcut = parseShortcut(rawShortcut);

  if (!shortcut.key) {
    status.textContent = `実行失敗: ${rawShortcut} は無効なキー指定です`;
    await sleep(350);
    return;
  }

  const target = getEventTarget();
  const eventInit = {
    key: shortcut.key,
    ctrlKey: shortcut.ctrlKey,
    shiftKey: shortcut.shiftKey,
    altKey: shortcut.altKey,
    metaKey: shortcut.metaKey,
    bubbles: true,
    cancelable: true,
  };

  status.textContent = `実行中: ${rawShortcut} を入力`;

  const keydownEvent = new KeyboardEvent('keydown', eventInit);
  const keydownHandled = target.dispatchEvent(keydownEvent);

  if (keydownHandled) {
    applyDefaultKeyBehavior(target, shortcut);
  }

  await sleep(80);
  target.dispatchEvent(new KeyboardEvent('keyup', eventInit));
  await sleep(180);
}

async function executeStep(step) {
  if (step.type === 'key') {
    await executeKeyStep(step.key);
    return;
  }

  if (step.type === 'mouse') {
    status.textContent = `実行中: ${step.button} クリック`;
    await sleep(350);
    return;
  }

  status.textContent = `実行中: ${step.duration}ms 待機`;
  await sleep(step.duration);
}

function setRunningUI(running) {
  isRunning = running;
  runBtn.disabled = running;
  cancelBtn.disabled = !running;
  clearBtn.disabled = running;
  addActionBtn.disabled = running;
  renderSteps();
}

async function runSequence() {
  if (steps.length === 0) {
    alert('手順を1つ以上追加してください。');
    return;
  }

  cancelRequested = false;
  setRunningUI(true);

  let round = 1;

  while (!cancelRequested) {
    status.textContent = `実行中: ${round} 周目`;

    for (const step of steps) {
      if (cancelRequested) break;
      await executeStep(step);
    }

    if (!loopToggle.checked) break;
    round += 1;
  }

  status.textContent = cancelRequested ? 'キャンセルされました。' : '完了しました。';
  setRunningUI(false);
}

actionType.addEventListener('change', () => {
  if (actionType.value === 'key') {
    keyInput.focus();
    keyInput.select();
  }
});

keyInput.addEventListener('keydown', (event) => {
  const shortcut = parseKeyEventToShortcut(event);
  if (!shortcut) return;

  event.preventDefault();
  keyInput.value = shortcut;
  keyInput.focus();
  keyInput.select();
});

addActionBtn.addEventListener('click', addAction);
runBtn.addEventListener('click', runSequence);
cancelBtn.addEventListener('click', () => {
  cancelRequested = true;
  status.textContent = 'キャンセル要求を受け付けました...';
});
clearBtn.addEventListener('click', () => {
  steps.length = 0;
  renderSteps();
  status.textContent = '待機中';
});

renderSteps();
