import {
  getSettings, saveSettings, clearHistory,
  EXACT_TRACKERS, TRACKER_PREFIXES
} from '../core/utils.js';

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await load();
  populateDefaults();
  bind();
}

async function load() {
  const s = await getSettings();
  $('autoSanitize').checked  = !!s.autoSanitize;
  $('autoPaste').checked     = !!s.autoPaste;
  $('autoCopy').checked      = !!s.autoCopy;
  $('keepHistory').checked   = s.keepHistory !== false;
  $('historyLimit').value    = s.historyLimit || 50;
  $('preserveHash').checked  = !!s.preserveHash;
  $('caseSensitive').checked = !!s.caseSensitive;
  $('customParams').value    = (s.customParams || []).join(', ');
}

function populateDefaults() {
  const wrap = $('defaultParamsList');
  wrap.replaceChildren();
  for (const p of EXACT_TRACKERS) {
    const code = document.createElement('code');
    code.textContent = p;
    wrap.appendChild(code);
  }
  for (const p of TRACKER_PREFIXES) {
    const code = document.createElement('code');
    code.textContent = p + '*';
    wrap.appendChild(code);
  }
}

function bind() {
  const inputs = ['autoSanitize', 'autoPaste', 'autoCopy', 'keepHistory',
                  'historyLimit', 'preserveHash', 'caseSensitive', 'customParams'];
  for (const id of inputs) {
    const el = $(id);
    el.addEventListener('change', markDirty);
    if (el.tagName === 'TEXTAREA' || el.type === 'number') el.addEventListener('input', markDirty);
  }

  $('saveBtn').addEventListener('click', save);

  $('clearHistoryBtn').addEventListener('click', async () => {
    if (!confirm('Clear all history? This cannot be undone.')) return;
    await clearHistory();
    $('saveStatusText').textContent = 'History cleared';
    $('saveStatus').className = 'save-status success';
    setTimeout(() => $('saveStatusText').textContent = 'All changes saved', 2500);
  });

  $('resetAllBtn').addEventListener('click', async () => {
    if (!confirm('Reset ALL settings and history?\n\nThis cannot be undone.')) return;
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    await load();
    $('saveStatusText').textContent = 'All data reset';
    $('saveStatus').className = 'save-status success';
  });

  $('errorDialogClose').addEventListener('click', () => $('errorDialog').close());

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
  });
}

function markDirty() {
  $('saveStatus').className = 'save-status';
  $('saveStatusText').textContent = 'Unsaved changes';
  $('saveBtn').disabled = false;
}

async function save() {
  let limit = parseInt($('historyLimit').value, 10);
  if (isNaN(limit) || limit < 1) limit = 1;
  if (limit > 500) limit = 500;
  $('historyLimit').value = limit;

  const customParams = $('customParams').value.split(',').map(s => s.trim()).filter(Boolean);

  await saveSettings({
    autoSanitize: $('autoSanitize').checked,
    autoPaste: $('autoPaste').checked,
    autoCopy: $('autoCopy').checked,
    keepHistory: $('keepHistory').checked,
    historyLimit: limit,
    preserveHash: $('preserveHash').checked,
    caseSensitive: $('caseSensitive').checked,
    customParams
  });

  $('saveStatus').className = 'save-status success';
  $('saveStatusText').textContent = 'Settings saved';
  $('saveBtn').disabled = true;
  setTimeout(() => $('saveStatusText').textContent = 'All changes saved', 2500);
}
