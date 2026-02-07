import {
  cleanLink,
  batchCleanLinks,
  getSettings,
  saveSettings,
  getStats,
  updateStats,
  getHistory,
  addToHistory,
  clearHistory,
  extractUrls,
  shortenUrl,
  decodeUrl,
  copyToClipboard,
  readFromClipboard,
  showToast,
  formatTimestamp,
  truncateText,
  checkFirstRun,
  completeOnboarding,
  isValidUrl
} from '../core/utils.js';

// DOM Elements
let elements = {};

// State
let currentSettings = {};
let currentStats = {};

/**
 * Initialize the popup
 */
document.addEventListener('DOMContentLoaded', async () => {
  initializeElements();
  await loadSettings();
  await loadStats();
  setupEventListeners();
  
  // Check for first run
  const isFirstRun = await checkFirstRun();
  if (isFirstRun) {
    showOnboarding();
  } else {
    // Auto-paste if enabled
    if (currentSettings.autoPaste) {
      await handleAutoPaste();
    }
  }
  
  updateStatsDisplay();
});

/**
 * Initialize DOM element references
 */
function initializeElements() {
  elements = {
    // Header
    historyBtn: document.getElementById('historyBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    
    // Tabs
    tabSingle: document.getElementById('tabSingle'),
    tabBatch: document.getElementById('tabBatch'),
    tabStats: document.getElementById('tabStats'),
    panelSingle: document.getElementById('panelSingle'),
    panelBatch: document.getElementById('panelBatch'),
    panelStats: document.getElementById('panelStats'),
    
    // Single Tab
    linkInput: document.getElementById('linkInput'),
    sanitizeBtn: document.getElementById('sanitizeBtn'),
    pasteBtn: document.getElementById('pasteBtn'),
    clearBtn: document.getElementById('clearBtn'),
    statusMessage: document.getElementById('statusMessage'),
    emptyState: document.getElementById('emptyState'),
    emptyPasteBtn: document.getElementById('emptyPasteBtn'),
    emptySettingsBtn: document.getElementById('emptySettingsBtn'),
    resultsSection: document.getElementById('resultsSection'),
    outputUrl: document.getElementById('outputUrl'),
    statusBadge: document.getElementById('statusBadge'),
    copyBtn: document.getElementById('copyBtn'),
    openBtn: document.getElementById('openBtn'),
    trackingDetails: document.getElementById('trackingDetails'),
    removedCount: document.getElementById('removedCount'),
    paramsList: document.getElementById('paramsList'),
    toolsDetails: document.getElementById('toolsDetails'),
    decodeBtn: document.getElementById('decodeBtn'),
    shortenBtn: document.getElementById('shortenBtn'),
    toolResultSection: document.getElementById('toolResultSection'),
    toolResultOutput: document.getElementById('toolResultOutput'),
    copyToolResultBtn: document.getElementById('copyToolResultBtn'),
    
    // Batch Tab
    batchInput: document.getElementById('batchInput'),
    batchSanitizeBtn: document.getElementById('batchSanitizeBtn'),
    batchClearBtn: document.getElementById('batchClearBtn'),
    batchStatus: document.getElementById('batchStatus'),
    batchResults: document.getElementById('batchResults'),
    batchOutput: document.getElementById('batchOutput'),
    batchCountBadge: document.getElementById('batchCountBadge'),
    copyBatchBtn: document.getElementById('copyBatchBtn'),
    exportBatchBtn: document.getElementById('exportBatchBtn'),
    batchProcessed: document.getElementById('batchProcessed'),
    batchParamsRemoved: document.getElementById('batchParamsRemoved'),
    
    // Stats Tab
    totalCleaned: document.getElementById('totalCleaned'),
    totalParams: document.getElementById('totalParams'),
    statsParamsText: document.getElementById('statsParamsText'),
    statsLinksText: document.getElementById('statsLinksText'),
    resetStatsBtn: document.getElementById('resetStatsBtn'),
    
    // Footer
    aboutLink: document.getElementById('aboutLink'),
    privacyLink: document.getElementById('privacyLink'),
    keyboardLink: document.getElementById('keyboardLink'),
    
    // Onboarding
    onboardingOverlay: document.getElementById('onboardingOverlay'),
    onboardingProgress: document.getElementById('onboardingProgress'),
    onboardingStep1: document.getElementById('onboardingStep1'),
    onboardingStep2: document.getElementById('onboardingStep2'),
    onboardingNext1: document.getElementById('onboardingNext1'),
    onboardingBack: document.getElementById('onboardingBack'),
    onboardingComplete: document.getElementById('onboardingComplete'),
    onboardingAutoSanitize: document.getElementById('onboardingAutoSanitize'),
    onboardingAutoPaste: document.getElementById('onboardingAutoPaste'),
    onboardingAutoCopy: document.getElementById('onboardingAutoCopy')
  };
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  currentSettings = await getSettings();
}

/**
 * Load statistics from storage
 */
async function loadStats() {
  currentStats = await getStats();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Tab switching
  [elements.tabSingle, elements.tabBatch, elements.tabStats].forEach(tab => {
    tab.addEventListener('click', handleTabSwitch);
  });
  
  // Single tab
  elements.linkInput.addEventListener('input', handleInputChange);
  elements.sanitizeBtn.addEventListener('click', handleSanitize);
  elements.pasteBtn.addEventListener('click', handlePaste);
  elements.clearBtn.addEventListener('click', handleClear);
  elements.emptyPasteBtn.addEventListener('click', handlePaste);
  elements.emptySettingsBtn.addEventListener('click', openSettings);
  elements.copyBtn.addEventListener('click', () => handleCopy(elements.outputUrl.value));
  elements.openBtn.addEventListener('click', handleOpen);
  elements.decodeBtn.addEventListener('click', handleDecode);
  elements.shortenBtn.addEventListener('click', handleShorten);
  elements.copyToolResultBtn.addEventListener('click', () => handleCopy(elements.toolResultOutput.value));
  
  // Batch tab
  elements.batchSanitizeBtn.addEventListener('click', handleBatchSanitize);
  elements.batchClearBtn.addEventListener('click', handleBatchClear);
  elements.copyBatchBtn.addEventListener('click', () => handleCopy(elements.batchOutput.value));
  elements.exportBatchBtn.addEventListener('click', handleExportBatch);
  
  // Stats tab
  elements.resetStatsBtn.addEventListener('click', handleResetStats);
  
  // Header
  elements.historyBtn.addEventListener('click', showHistory);
  elements.settingsBtn.addEventListener('click', openSettings);
  
  // Footer
  elements.aboutLink.addEventListener('click', (e) => {
    e.preventDefault();
    showAbout();
  });
  elements.privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    showPrivacy();
  });
  elements.keyboardLink.addEventListener('click', (e) => {
    e.preventDefault();
    showKeyboardShortcuts();
  });
  
  // Onboarding
  elements.onboardingNext1.addEventListener('click', showOnboardingStep2);
  elements.onboardingBack.addEventListener('click', showOnboardingStep1);
  elements.onboardingComplete.addEventListener('click', finishOnboarding);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcut);
}

/**
 * Handle tab switching
 */
function handleTabSwitch(e) {
  const clickedTab = e.currentTarget;
  const tabName = clickedTab.dataset.tab;
  
  // Update tabs
  document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });
  clickedTab.classList.add('active');
  clickedTab.setAttribute('aria-selected', 'true');
  
  // Update panels
  document.querySelectorAll('.tab-content').forEach(panel => {
    panel.classList.remove('active');
  });
  document.getElementById(`panel${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
}

/**
 * Handle input change
 */
function handleInputChange() {
  const value = elements.linkInput.value.trim();
  
  if (value) {
    elements.emptyState.classList.add('hidden');
    elements.sanitizeBtn.disabled = false;
  } else {
    elements.resultsSection.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
    elements.sanitizeBtn.disabled = true;
  }
}

/**
 * Handle auto-paste on load
 */
async function handleAutoPaste() {
  const result = await readFromClipboard();
  
  if (result.success && result.text) {
    const text = result.text.trim();
    
    // Check if it looks like a URL
    if (isValidUrl(text)) {
      elements.linkInput.value = text;
      handleInputChange();
      
      // Auto-sanitize if enabled
      if (currentSettings.autoCopy) {
        await handleSanitize();
      }
    }
  }
}

/**
 * Handle paste button
 */
async function handlePaste() {
  const result = await readFromClipboard();
  
  if (result.success && result.text) {
    elements.linkInput.value = result.text.trim();
    handleInputChange();
    showStatusMessage('Pasted from clipboard', 'info');
  } else {
    showStatusMessage('Could not read clipboard', 'error');
  }
}

/**
 * Handle sanitize
 */
async function handleSanitize() {
  const url = elements.linkInput.value.trim();
  
  if (!url) {
    showStatusMessage('Please enter a URL', 'warning');
    return;
  }
  
  if (!isValidUrl(url)) {
    showStatusMessage('Please enter a valid URL', 'error');
    return;
  }
  
  // Clean the link
  const result = cleanLink(url, currentSettings.customParams, {
    preserveHash: currentSettings.preserveHash,
    caseSensitive: currentSettings.caseSensitive
  });
  
  if (result.success) {
    // Update UI
    elements.outputUrl.value = result.sanitizedUrl;
    elements.removedCount.textContent = result.removedCount;
    
    // Update status badge
    if (result.removedCount > 0) {
      elements.statusBadge.textContent = `${result.removedCount} removed`;
      elements.statusBadge.className = 'badge badge-success';
    } else {
      elements.statusBadge.textContent = 'Already clean';
      elements.statusBadge.className = 'badge badge-info';
    }
    
    // Update parameters list
    updateParametersList(result.removedParams);
    
    // Show results
    elements.emptyState.classList.add('hidden');
    elements.resultsSection.classList.remove('hidden');
    
    // Update stats
    await updateStats(1, result.removedCount);
    currentStats = await getStats();
    updateStatsDisplay();
    
    // Add to history
    await addToHistory(result);
    
    // Auto-copy if enabled
    if (currentSettings.autoCopy && result.removedCount > 0) {
      await handleCopy(result.sanitizedUrl, true);
    } else {
      showStatusMessage(
        result.removedCount > 0 
          ? `Removed ${result.removedCount} tracking parameter${result.removedCount > 1 ? 's' : ''}` 
          : 'URL is already clean',
        result.removedCount > 0 ? 'success' : 'info'
      );
    }
  } else {
    showStatusMessage('Error cleaning URL: ' + result.error, 'error');
  }
}

/**
 * Update parameters list
 */
function updateParametersList(params) {
  // Clear existing list
  elements.paramsList.replaceChildren();
  
  if (params.length === 0) {
    const li = document.createElement('li');
    li.className = 'param-item';
    li.style.fontStyle = 'italic';
    li.style.color = 'var(--text-tertiary)';
    li.textContent = 'No tracking parameters found';
    elements.paramsList.appendChild(li);
  } else {
    params.forEach(param => {
      const li = document.createElement('li');
      li.className = 'param-item';
      
      const code = document.createElement('code');
      code.textContent = param;
      
      const icon = document.createElement('span');
      icon.className = 'icon icon-sm icon-check';
      
      li.appendChild(code);
      li.appendChild(icon);
      elements.paramsList.appendChild(li);
    });
  }
}

/**
 * Handle copy
 */
async function handleCopy(text, isAuto = false) {
  const result = await copyToClipboard(text);
  
  if (result.success) {
    showToast(
      isAuto ? 'Cleaned & Copied!' : 'Copied to clipboard!',
      'success'
    );
  } else {
    showStatusMessage('Failed to copy', 'error');
  }
}

/**
 * Handle open in new tab
 */
function handleOpen() {
  const url = elements.outputUrl.value;
  if (url) {
    chrome.tabs.create({ url });
  }
}

/**
 * Handle clear
 */
function handleClear() {
  elements.linkInput.value = '';
  elements.outputUrl.value = '';
  elements.toolResultOutput.value = '';
  elements.resultsSection.classList.add('hidden');
  elements.toolResultSection.classList.add('hidden');
  elements.emptyState.classList.remove('hidden');
  elements.sanitizeBtn.disabled = true;
  showStatusMessage('Cleared', 'info');
}

/**
 * Handle decode
 */
function handleDecode() {
  const url = elements.outputUrl.value || elements.linkInput.value;
  
  if (!url) {
    showStatusMessage('No URL to decode', 'warning');
    return;
  }
  
  const decoded = decodeUrl(url);
  elements.toolResultOutput.value = decoded;
  elements.toolResultSection.classList.remove('hidden');
  showStatusMessage('URL decoded', 'success');
}

/**
 * Handle shorten
 */
async function handleShorten() {
  const url = elements.outputUrl.value || elements.linkInput.value;
  
  if (!url) {
    showStatusMessage('No URL to shorten', 'warning');
    return;
  }
  
  showStatusMessage('Shortening...', 'info');
  
  const result = await shortenUrl(url);
  
  if (result.success) {
    elements.toolResultOutput.value = result.shortUrl;
    elements.toolResultSection.classList.remove('hidden');
    showStatusMessage('URL shortened!', 'success');
    
    // Auto-copy shortened URL
    await copyToClipboard(result.shortUrl);
  } else {
    showStatusMessage('Failed to shorten URL', 'error');
  }
}

/**
 * Handle batch sanitize
 */
async function handleBatchSanitize() {
  const input = elements.batchInput.value.trim();
  
  if (!input) {
    showBatchStatus('Please enter URLs to clean', 'warning');
    return;
  }
  
  // Extract URLs from input
  const urls = input.split('\n').map(line => line.trim()).filter(line => line);
  
  if (urls.length === 0) {
    showBatchStatus('No valid URLs found', 'warning');
    return;
  }
  
  showBatchStatus(`Processing ${urls.length} URL(s)...`, 'info');
  
  // Batch clean
  const results = batchCleanLinks(urls, currentSettings.customParams, {
    preserveHash: currentSettings.preserveHash,
    caseSensitive: currentSettings.caseSensitive
  });
  
  // Calculate totals
  const totalProcessed = results.length;
  const totalParamsRemoved = results.reduce((sum, r) => sum + r.removedCount, 0);
  
  // Update UI
  const cleanedUrls = results.map(r => r.sanitizedUrl).join('\n');
  elements.batchOutput.value = cleanedUrls;
  elements.batchCountBadge.textContent = `${totalProcessed} cleaned`;
  elements.batchProcessed.textContent = totalProcessed;
  elements.batchParamsRemoved.textContent = totalParamsRemoved;
  
  // Show results
  elements.batchResults.classList.remove('hidden');
  
  // Update stats
  await updateStats(totalProcessed, totalParamsRemoved);
  currentStats = await getStats();
  updateStatsDisplay();
  
  // Add to history
  for (const result of results) {
    await addToHistory(result);
  }
  
  showBatchStatus(
    `Cleaned ${totalProcessed} URL(s), removed ${totalParamsRemoved} parameter(s)`,
    'success'
  );
}

/**
 * Handle batch clear
 */
function handleBatchClear() {
  elements.batchInput.value = '';
  elements.batchOutput.value = '';
  elements.batchResults.classList.add('hidden');
  showBatchStatus('Cleared', 'info');
}

/**
 * Handle export batch
 */
function handleExportBatch() {
  const content = elements.batchOutput.value;
  
  if (!content) {
    showBatchStatus('No URLs to export', 'warning');
    return;
  }
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cleaned-urls-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  
  showBatchStatus('Exported to file', 'success');
}

/**
 * Handle reset stats
 */
async function handleResetStats() {
  if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
    await chrome.storage.local.set({
      totalCleaned: 0,
      totalParamsRemoved: 0,
      lastCleanedDate: null
    });
    
    currentStats = await getStats();
    updateStatsDisplay();
    showToast('Statistics reset', 'success');
  }
}

/**
 * Update stats display
 */
function updateStatsDisplay() {
  elements.totalCleaned.textContent = currentStats.totalCleaned || 0;
  elements.totalParams.textContent = currentStats.totalParamsRemoved || 0;
  elements.statsParamsText.textContent = currentStats.totalParamsRemoved || 0;
  elements.statsLinksText.textContent = currentStats.totalCleaned || 0;
}

/**
 * Show status message
 */
function showStatusMessage(message, type = 'info') {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-msg ${type}`;
  elements.statusMessage.classList.remove('hidden');
  
  setTimeout(() => {
    elements.statusMessage.classList.add('hidden');
  }, 3000);
}

/**
 * Show batch status message
 */
function showBatchStatus(message, type = 'info') {
  elements.batchStatus.textContent = message;
  elements.batchStatus.className = `status-msg ${type}`;
  elements.batchStatus.classList.remove('hidden');
  
  setTimeout(() => {
    elements.batchStatus.classList.add('hidden');
  }, 3000);
}

/**
 * Show history modal
 */
async function showHistory() {
  const history = await getHistory();
  
  if (history.length === 0) {
    showToast('No history yet', 'info');
    return;
  }
  
  // Create history modal
  const modal = createHistoryModal(history);
  document.body.appendChild(modal);
}

/**
 * Create history modal
 */
function createHistoryModal(history) {
  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.style.display = 'flex';
  
  const card = document.createElement('div');
  card.className = 'onboarding-card';
  card.style.maxWidth = '500px';
  
  const header = document.createElement('div');
  header.className = 'onboarding-header';
  
  const title = document.createElement('h2');
  title.textContent = 'Cleaning History';
  title.style.marginBottom = '8px';
  
  const subtitle = document.createElement('p');
  subtitle.textContent = `${history.length} URL(s) cleaned`;
  subtitle.style.margin = '0';
  
  header.appendChild(title);
  header.appendChild(subtitle);
  
  const historyList = document.createElement('div');
  historyList.className = 'history-list';
  historyList.style.marginBottom = '16px';
  
  history.forEach(item => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    const urlDiv = document.createElement('div');
    urlDiv.className = 'history-url';
    urlDiv.textContent = truncateText(item.sanitizedUrl, 60);
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'history-meta';
    
    const timeSpan = document.createElement('span');
    timeSpan.textContent = formatTimestamp(item.timestamp);
    
    const countSpan = document.createElement('span');
    countSpan.textContent = `${item.removedCount} removed`;
    
    metaDiv.appendChild(timeSpan);
    metaDiv.appendChild(countSpan);
    
    historyItem.appendChild(urlDiv);
    historyItem.appendChild(metaDiv);
    
    historyItem.addEventListener('click', () => {
      elements.linkInput.value = item.originalUrl;
      handleInputChange();
      document.body.removeChild(overlay);
      elements.tabSingle.click();
    });
    
    historyList.appendChild(historyItem);
  });
  
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'button-group';
  
  const clearHistoryBtn = document.createElement('button');
  clearHistoryBtn.className = 'btn-danger';
  clearHistoryBtn.textContent = 'Clear History';
  clearHistoryBtn.addEventListener('click', async () => {
    if (confirm('Clear all history?')) {
      await clearHistory();
      document.body.removeChild(overlay);
      showToast('History cleared', 'success');
    }
  });
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-secondary';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  
  buttonGroup.appendChild(clearHistoryBtn);
  buttonGroup.appendChild(closeBtn);
  
  card.appendChild(header);
  card.appendChild(historyList);
  card.appendChild(buttonGroup);
  overlay.appendChild(card);
  
  return overlay;
}

/**
 * Open settings page
 */
function openSettings() {
  chrome.runtime.openOptionsPage();
}

/**
 * Show about dialog
 */
function showAbout() {
  const message = `Link Sanitizer v3.0\n\nA privacy-focused URL cleaning tool that removes tracking parameters from links.\n\nKeyboard Shortcuts:\n• Ctrl+Shift+L - Open extension\n• Ctrl+Shift+S - Quick sanitize\n\nMade with ❤️ for privacy`;
  alert(message);
}

/**
 * Show privacy dialog
 */
function showPrivacy() {
  const message = `Privacy Policy\n\nLink Sanitizer:\n• Does NOT collect any personal data\n• Does NOT send data to external servers\n• Stores settings and history locally in your browser\n• Only connects to TinyURL when you use the shorten feature\n\nYour data stays on your device.`;
  alert(message);
}

/**
 * Show keyboard shortcuts
 */
function showKeyboardShortcuts() {
  const message = `Keyboard Shortcuts\n\nGlobal:\n• Ctrl+Shift+L (Cmd+Shift+L on Mac) - Open extension\n• Ctrl+Shift+S (Cmd+Shift+S on Mac) - Quick sanitize clipboard\n\nIn Extension:\n• Ctrl+V - Paste URL\n• Enter - Sanitize (when input focused)\n• Escape - Clear/Close`;
  alert(message);
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcut(e) {
  // Enter to sanitize
  if (e.key === 'Enter' && e.target === elements.linkInput) {
    e.preventDefault();
    handleSanitize();
  }
  
  // Escape to clear
  if (e.key === 'Escape') {
    handleClear();
  }
}

/**
 * Show onboarding overlay
 */
function showOnboarding() {
  elements.onboardingOverlay.classList.remove('hidden');
  elements.onboardingProgress.style.width = '50%';
}

/**
 * Show onboarding step 2
 */
function showOnboardingStep2() {
  elements.onboardingStep1.classList.add('hidden');
  elements.onboardingStep2.classList.remove('hidden');
  elements.onboardingProgress.style.width = '100%';
}

/**
 * Show onboarding step 1
 */
function showOnboardingStep1() {
  elements.onboardingStep2.classList.add('hidden');
  elements.onboardingStep1.classList.remove('hidden');
  elements.onboardingProgress.style.width = '50%';
}

/**
 * Finish onboarding
 */
async function finishOnboarding() {
  // Save selected settings
  await saveSettings({
    autoSanitize: elements.onboardingAutoSanitize.checked,
    autoPaste: elements.onboardingAutoPaste.checked,
    autoCopy: elements.onboardingAutoCopy.checked,
    firstRun: false
  });
  
  await completeOnboarding();
  
  // Reload settings
  currentSettings = await getSettings();
  
  // Hide onboarding
  elements.onboardingOverlay.classList.add('hidden');
  
  // Show welcome message
  showToast('Welcome! Link Sanitizer is ready to use.', 'success', 4000);
  
  // Auto-paste if enabled
  if (currentSettings.autoPaste) {
    await handleAutoPaste();
  }
}
