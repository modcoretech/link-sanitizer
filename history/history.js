import {
  getHistory, clearHistory,
  formatTimestamp, truncateText,
  copyToClipboard, showError, flashButton
} from '../core/utils.js';

let allHistory = [];
let filter = '';

const $ = id => document.getElementById(id);
const list = $('historyList');
const emptyState = $('emptyState');
const noResults = $('noResults');
const countMeta = $('countMeta');

document.addEventListener('DOMContentLoaded', init);

async function init() {
  allHistory = await getHistory();
  render();

  $('searchInput').addEventListener('input', e => {
    filter = e.target.value.trim().toLowerCase();
    render();
  });

  $('clearAllBtn').addEventListener('click', async () => {
    if (!allHistory.length) return;
    if (!confirm('Clear all history? This cannot be undone.')) return;
    await clearHistory();
    allHistory = [];
    render();
  });

  $('exportBtn').addEventListener('click', () => {
    if (!allHistory.length) { showError('Nothing to export', 'There is no history to export yet.'); return; }
    const lines = allHistory.map(h => h.sanitizedUrl).join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `link-sanitizer-history-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $('errorDialogClose').addEventListener('click', () => $('errorDialog').close());
}

function render() {
  list.replaceChildren();

  if (!allHistory.length) {
    countMeta.textContent = '';
    emptyState.classList.remove('hidden');
    noResults.classList.add('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const filtered = filter
    ? allHistory.filter(h =>
        h.sanitizedUrl.toLowerCase().includes(filter) ||
        h.originalUrl.toLowerCase().includes(filter))
    : allHistory;

  countMeta.textContent = `${allHistory.length} ${allHistory.length === 1 ? 'entry' : 'entries'}` +
    (filter ? ` · ${filtered.length} match${filtered.length === 1 ? '' : 'es'}` : '');

  if (!filtered.length) {
    noResults.classList.remove('hidden');
    return;
  }
  noResults.classList.add('hidden');

  for (const item of filtered) {
    list.appendChild(renderItem(item));
  }
}

function renderItem(item) {
  const wrap = document.createElement('div');
  wrap.className = 'history-item result-box';

  const cleaned = document.createElement('div');
  cleaned.className = 'history-url';
  cleaned.textContent = item.sanitizedUrl;

  const original = document.createElement('div');
  original.className = 'history-original';
  original.textContent = 'Original: ' + truncateText(item.originalUrl, 100);

  const meta = document.createElement('div');
  meta.className = 'history-meta';
  const time = document.createElement('span');
  time.textContent = formatTimestamp(item.timestamp);
  const removed = document.createElement('span');
  removed.textContent = item.removedCount > 0
    ? `${item.removedCount} param${item.removedCount === 1 ? '' : 's'} removed`
    : 'Already clean';
  meta.append(time, removed);

  const actions = document.createElement('div');
  actions.className = 'history-actions';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn-secondary';
  copyBtn.innerHTML = '<span class="icon icon-sm icon-copy"></span> Copy';
  copyBtn.addEventListener('click', async () => {
    const res = await copyToClipboard(item.sanitizedUrl);
    if (res.success) flashButton(copyBtn, 'Copied');
    else showError('Copy failed', 'The browser blocked clipboard access.');
  });

  const openBtn = document.createElement('button');
  openBtn.className = 'btn-secondary';
  openBtn.textContent = 'Open';
  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: item.sanitizedUrl });
  });

  actions.append(copyBtn, openBtn);
  wrap.append(cleaned, original, meta, actions);
  return wrap;
}
