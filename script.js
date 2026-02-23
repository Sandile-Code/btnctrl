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
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeStep(step) {
  if (step.type === 'key') {
    status.textContent = `実行中: ${step.key} を入力`;
    await sleep(350);
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
