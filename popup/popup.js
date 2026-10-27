import {
  cleanLink, batchCleanLinks,
  getSettings, saveSettings,
  addToHistory,
  shortenUrl,
  copyToClipboard, readFromClipboard,
  checkFirstRun, completeOnboarding,
  isValidUrl, showError, flashButton
} from '../core/utils.js';

let el = {};
let settings = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  cache();
  el.versionBadge.textContent = 'v' + chrome.runtime.getManifest().version;
  settings = await getSettings();
  bind();

  if (await checkFirstRun()) {
    populateOnboarding();
    el.onboardingDialog.showModal();
  } else if (settings.autoPaste) {
    handleAutoPaste();
  }
}

function cache() {
  const ids = [
    'versionBadge', 'historyBtn', 'settingsBtn',
    'tabSingle', 'tabBatch', 'panelSingle', 'panelBatch',
    'linkInput', 'sanitizeBtn', 'pasteBtn', 'clearBtn',
    'statusMessage', 'inputHelper', 'emptyState',
    'resultsSection', 'outputUrl', 'statusBadge',
    'copyBtn', 'openBtn', 'shortenBtn',
    'removedCount', 'paramsList',
    'batchInput', 'batchSanitizeBtn', 'batchClearBtn', 'batchStatus',
    'batchResults', 'batchOutput', 'batchCountBadge',
    'copyBatchBtn', 'exportBatchBtn', 'batchProcessed', 'batchParamsRemoved',
    'aboutLink', 'privacyLink', 'keyboardLink',
    'onboardingDialog', 'onboardingProgress',
    'onboardingStep1', 'onboardingStep2',
    'onboardingNext1', 'onboardingBack', 'onboardingComplete',
    'onboardingAutoSanitize', 'onboardingAutoPaste', 'onboardingAutoCopy',
    'errorDialog', 'errorDialogClose'
  ];
  for (const id of ids) el[id] = document.getElementById(id);
}

function populateOnboarding() {
  el.onboardingAutoSanitize.checked = !!settings.autoSanitize;
  el.onboardingAutoPaste.checked = !!settings.autoPaste;
  el.onboardingAutoCopy.checked = !!settings.autoCopy;
}

function bind() {
  [el.tabSingle, el.tabBatch].forEach(t => t.addEventListener('click', switchTab));

  el.linkInput.addEventListener('input', handleInputChange);
  el.linkInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSanitize(); }
  });
  el.sanitizeBtn.addEventListener('click', handleSanitize);
  el.pasteBtn.addEventListener('click', handlePaste);
  el.clearBtn.addEventListener('click', handleClear);
  el.copyBtn.addEventListener('click', () => handleCopy(el.outputUrl.value, el.copyBtn));
  el.openBtn.addEventListener('click', handleOpen);
  el.shortenBtn.addEventListener('click', handleShorten);

  el.batchSanitizeBtn.addEventListener('click', handleBatchSanitize);
  el.batchClearBtn.addEventListener('click', handleBatchClear);
  el.copyBatchBtn.addEventListener('click', () => handleCopy(el.batchOutput.value, el.copyBatchBtn));
  el.exportBatchBtn.addEventListener('click', handleExportBatch);

  el.historyBtn.addEventListener('click', openHistory);
  el.settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

  el.aboutLink.addEventListener('click', e => { e.preventDefault(); infoDialog('About Link Sanitizer', 'A privacy-focused URL cleaning tool that removes tracking parameters from links.\n\nVersion ' + chrome.runtime.getManifest().version + ' · Made with ❤️ for privacy.'); });
  el.privacyLink.addEventListener('click', e => { e.preventDefault(); infoDialog('Privacy', 'Link Sanitizer:\n• Does NOT collect any personal data\n• Does NOT send data to external servers\n• Stores settings and history locally\n• Only connects to TinyURL when you use "Shorten"\n\nYour data stays on your device.'); });
  el.keyboardLink.addEventListener('click', e => { e.preventDefault(); infoDialog('Keyboard Shortcuts', 'In the popup:\n• Enter — Sanitize\n• Escape — Clear / close dialogs\n\nGlobal:\n• Ctrl+Shift+L — Open extension'); });

  el.onboardingNext1.addEventListener('click', () => {
    el.onboardingStep1.classList.add('hidden');
    el.onboardingStep2.classList.remove('hidden');
    el.onboardingProgress.style.width = '100%';
  });
  el.onboardingBack.addEventListener('click', () => {
    el.onboardingStep2.classList.add('hidden');
    el.onboardingStep1.classList.remove('hidden');
    el.onboardingProgress.style.width = '50%';
  });
  el.onboardingComplete.addEventListener('click', finishOnboarding);
  el.onboardingDialog.addEventListener('close', async () => {
    if (settings.firstRun) {
      await completeOnboarding();
      settings = await getSettings();
      if (settings.autoPaste) handleAutoPaste();
    }
  });

  el.errorDialogClose.addEventListener('click', () => el.errorDialog.close());

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.querySelector('dialog[open]')) handleClear();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') loadSettings();
  });
}

async function loadSettings() { settings = await getSettings(); }

function openHistory() {
  chrome.tabs.create({ url: chrome.runtime.getURL('history/history.html') });
}

function switchTab(e) {
  const tab = e.currentTarget.dataset.tab;
  document.querySelectorAll('.tab-btn').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
    t.setAttribute('aria-selected', t.dataset.tab === tab ? 'true' : 'false');
  });
  document.querySelectorAll('.tab-content').forEach(p => {
    p.classList.toggle('active', p.id === 'panel' + tab.charAt(0).toUpperCase() + tab.slice(1));
  });
}

function handleInputChange() {
  const value = el.linkInput.value.trim();
  el.resultsSection.classList.add('hidden');

  if (!value) {
    el.emptyState.classList.remove('hidden');
    el.sanitizeBtn.disabled = true;
    el.inputHelper.textContent = 'Press Ctrl+V to paste';
    el.inputHelper.style.color = '';
    return;
  }
  el.emptyState.classList.add('hidden');
  el.sanitizeBtn.disabled = false;

  if (isValidUrl(value)) {
    const preview = cleanLink(value, settings.customParams, {
      preserveHash: settings.preserveHash,
      caseSensitive: settings.caseSensitive
    });
    if (preview.success && preview.removedCount > 0) {
      el.inputHelper.textContent = `${preview.removedCount} tracking parameter${preview.removedCount === 1 ? '' : 's'} detected`;
      el.inputHelper.style.color = 'var(--success)';
    } else {
      el.inputHelper.textContent = 'No trackers detected';
      el.inputHelper.style.color = 'var(--text-tertiary)';
    }
  } else {
    el.inputHelper.textContent = 'Press Ctrl+V to paste';
    el.inputHelper.style.color = '';
  }
}

async function handleAutoPaste() {
  const result = await readFromClipboard();
  if (!result.success || !result.text) return;
  const text = result.text.trim();
  if (!isValidUrl(text)) return;
  el.linkInput.value = text;
  handleInputChange();
  if (settings.autoCopy) await handleSanitize();
}

async function handlePaste() {
  const result = await readFromClipboard();
  if (!result.success) {
    showError('Clipboard unavailable', 'Link Sanitizer could not read your clipboard. Try pasting manually with Ctrl+V.');
    return;
  }
  if (!result.text?.trim()) {
    showError('Clipboard is empty', 'Copy a URL first, then click Paste again.');
    return;
  }
  el.linkInput.value = result.text.trim();
  handleInputChange();
  el.linkInput.focus();
}

async function handleSanitize() {
  const url = el.linkInput.value.trim();
  if (!url) { flashStatus('Enter a URL first', 'warning'); return; }
  if (!isValidUrl(url)) { showError('Invalid URL', 'That does not look like a valid URL. Please check it and try again.'); return; }

  const result = cleanLink(url, settings.customParams, {
    preserveHash: settings.preserveHash,
    caseSensitive: settings.caseSensitive
  });

  if (!result.success) { showError('Could not clean URL', result.error || 'Unknown error.'); return; }

  el.outputUrl.value = result.sanitizedUrl;
  el.removedCount.textContent = result.removedCount;

  if (result.removedCount > 0) {
    el.statusBadge.textContent = `${result.removedCount} removed`;
    el.statusBadge.className = 'badge badge-success';
  } else {
    el.statusBadge.textContent = 'Already clean';
    el.statusBadge.className = 'badge badge-info';
  }

  renderParams(result.removedParams);
  el.emptyState.classList.add('hidden');
  el.resultsSection.classList.remove('hidden');

  await addToHistory(result);

  if (settings.autoCopy && result.removedCount > 0) {
    const copy = await copyToClipboard(result.sanitizedUrl);
    if (copy.success) flashButton(el.copyBtn, 'Copied');
  }
}

function renderParams(params) {
  el.paramsList.replaceChildren();
  if (!params.length) {
    const li = document.createElement('li');
    li.className = 'param-item';
    li.style.fontStyle = 'italic';
    li.textContent = 'No tracking parameters found';
    el.paramsList.appendChild(li);
    return;
  }
  for (const p of params) {
    const li = document.createElement('li');
    li.className = 'param-item';
    const code = document.createElement('code');
    code.textContent = p;
    const icon = document.createElement('span');
    icon.className = 'icon icon-sm icon-check';
    li.append(code, icon);
    el.paramsList.appendChild(li);
  }
}

async function handleCopy(text, btn) {
  if (!text) return;
  const result = await copyToClipboard(text);
  if (result.success) {
    flashButton(btn, 'Copied');
  } else {
    showError('Copy failed', 'The browser blocked clipboard access. Select and copy the URL manually instead.');
  }
}

function handleOpen() {
  const url = el.outputUrl.value;
  if (url) chrome.tabs.create({ url });
}

function handleClear() {
  el.linkInput.value = '';
  el.outputUrl.value = '';
  el.resultsSection.classList.add('hidden');
  el.emptyState.classList.remove('hidden');
  el.sanitizeBtn.disabled = true;
  el.inputHelper.textContent = 'Press Ctrl+V to paste';
  el.inputHelper.style.color = '';
}

async function handleShorten() {
  const url = el.outputUrl.value || el.linkInput.value;
  if (!url) { showError('No URL to shorten', 'Enter or sanitize a URL first.'); return; }
  el.shortenBtn.disabled = true;
  const result = await shortenUrl(url);
  el.shortenBtn.disabled = false;
  if (result.success) {
    const copy = await copyToClipboard(result.shortUrl);
    if (copy.success) flashButton(el.shortenBtn, 'Copied');
    else showError('Copy failed', 'The short URL was generated, but copying failed. Here it is:\n' + result.shortUrl);
  } else {
    showError('Shortening failed', 'Could not reach TinyURL. Check your connection and try again.');
  }
}

async function handleBatchSanitize() {
  const input = el.batchInput.value.trim();
  if (!input) { flashBatch('Enter URLs first', 'warning'); return; }

  const urls = input.split('\n').map(l => l.trim()).filter(Boolean);
  if (!urls.length) { flashBatch('No valid URLs found', 'warning'); return; }

  const results = batchCleanLinks(urls, settings.customParams, {
    preserveHash: settings.preserveHash,
    caseSensitive: settings.caseSensitive
  });
  if (!results.length) { flashBatch('None of those look like URLs', 'warning'); return; }

  const totalParams = results.reduce((s, r) => s + r.removedCount, 0);

  el.batchOutput.value = results.map(r => r.sanitizedUrl).join('\n');
  el.batchCountBadge.textContent = `${results.length} cleaned`;
  el.batchProcessed.textContent = results.length;
  el.batchParamsRemoved.textContent = totalParams;
  el.batchResults.classList.remove('hidden');
  flashBatch(`Cleaned ${results.length} URL${results.length === 1 ? '' : 's'}`, 'success');

  await addToHistory(results);
}

function handleBatchClear() {
  el.batchInput.value = '';
  el.batchOutput.value = '';
  el.batchResults.classList.add('hidden');
}

function handleExportBatch() {
  const content = el.batchOutput.value;
  if (!content) { flashBatch('Nothing to export', 'warning'); return; }
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cleaned-urls-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function flashStatus(message, type = 'info') {
  el.statusMessage.textContent = message;
  el.statusMessage.className = `status-msg ${type}`;
  clearTimeout(flashStatus._t);
  flashStatus._t = setTimeout(() => el.statusMessage.classList.add('hidden'), 2500);
}

function flashBatch(message, type = 'info') {
  el.batchStatus.textContent = message;
  el.batchStatus.className = `status-msg ${type}`;
  clearTimeout(flashBatch._t);
  flashBatch._t = setTimeout(() => el.batchStatus.classList.add('hidden'), 2500);
}

function infoDialog(title, body) {
  const d = document.createElement('dialog');
  const h = document.createElement('h2'); h.textContent = title;
  const p = document.createElement('p'); p.style.whiteSpace = 'pre-line'; p.textContent = body;
  const wrap = document.createElement('div'); wrap.className = 'button-group mt-2';
  const ok = document.createElement('button'); ok.className = 'btn-primary'; ok.textContent = 'OK'; ok.autofocus = true;
  ok.addEventListener('click', () => d.close());
  wrap.appendChild(ok);
  d.append(h, p, wrap);
  d.addEventListener('close', () => d.remove());
  document.body.appendChild(d);
  d.showModal();
}

async function finishOnboarding() {
  await saveSettings({
    autoSanitize: el.onboardingAutoSanitize.checked,
    autoPaste: el.onboardingAutoPaste.checked,
    autoCopy: el.onboardingAutoCopy.checked,
    firstRun: false
  });
  settings = await getSettings();
  el.onboardingDialog.close();
}
