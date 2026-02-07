import { 
  getSettings, 
  saveSettings,
  clearHistory,
  DEFAULT_TRACKING_PARAMS,
  showToast
} from '../core/utils.js';

// DOM Elements
let elements = {};

/**
 * Initialize options page
 */
document.addEventListener('DOMContentLoaded', async () => {
  initializeElements();
  await loadSettings();
  populateDefaultParams();
  setupEventListeners();
});

/**
 * Initialize DOM element references
 */
function initializeElements() {
  elements = {
    // Automation
    autoSanitize: document.getElementById('autoSanitize'),
    autoPaste: document.getElementById('autoPaste'),
    autoCopy: document.getElementById('autoCopy'),
    
    // History & Privacy
    keepHistory: document.getElementById('keepHistory'),
    historyLimit: document.getElementById('historyLimit'),
    showNotifications: document.getElementById('showNotifications'),
    
    // Advanced
    preserveHash: document.getElementById('preserveHash'),
    caseSensitive: document.getElementById('caseSensitive'),
    blockRedirects: document.getElementById('blockRedirects'),
    
    // Custom Parameters
    customParams: document.getElementById('customParams'),
    defaultParamsList: document.getElementById('defaultParamsList'),
    
    // Data Management
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    resetStatsBtn: document.getElementById('resetStatsBtn'),
    resetAllBtn: document.getElementById('resetAllBtn'),
    
    // Save
    saveBtn: document.getElementById('saveBtn'),
    saveStatus: document.getElementById('saveStatus'),
    saveStatusText: document.getElementById('saveStatusText')
  };
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  const settings = await getSettings();
  
  // Automation
  elements.autoSanitize.checked = settings.autoSanitize || false;
  elements.autoPaste.checked = settings.autoPaste || false;
  elements.autoCopy.checked = settings.autoCopy || false;
  
  // History & Privacy
  elements.keepHistory.checked = settings.keepHistory !== false;
  elements.historyLimit.value = settings.historyLimit || 50;
  elements.showNotifications.checked = settings.showNotifications !== false;
  
  // Advanced
  elements.preserveHash.checked = settings.preserveHash || false;
  elements.caseSensitive.checked = settings.caseSensitive || false;
  elements.blockRedirects.checked = settings.blockRedirects !== false;
  
  // Custom Parameters
  elements.customParams.value = (settings.customParams || []).join(', ');
}

/**
 * Populate default parameters list
 */
function populateDefaultParams() {
  elements.defaultParamsList.replaceChildren();
  
  DEFAULT_TRACKING_PARAMS.forEach(param => {
    const code = document.createElement('code');
    code.textContent = param;
    elements.defaultParamsList.appendChild(code);
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Track changes
  const allInputs = [
    elements.autoSanitize,
    elements.autoPaste,
    elements.autoCopy,
    elements.keepHistory,
    elements.historyLimit,
    elements.showNotifications,
    elements.preserveHash,
    elements.caseSensitive,
    elements.blockRedirects,
    elements.customParams
  ];
  
  allInputs.forEach(input => {
    input.addEventListener('change', handleChange);
    if (input.tagName === 'TEXTAREA' || input.type === 'number') {
      input.addEventListener('input', handleChange);
    }
  });
  
  // Save button
  elements.saveBtn.addEventListener('click', handleSave);
  
  // Data management
  elements.clearHistoryBtn.addEventListener('click', handleClearHistory);
  elements.resetStatsBtn.addEventListener('click', handleResetStats);
  elements.resetAllBtn.addEventListener('click', handleResetAll);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  });
}

/**
 * Handle input change
 */
function handleChange() {
  updateSaveStatus('Unsaved changes', 'warning');
  elements.saveBtn.disabled = false;
}

/**
 * Handle save
 */
async function handleSave() {
  // Parse custom parameters
  const customParamsString = elements.customParams.value;
  const customParamsArray = customParamsString
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // Validate history limit
  let historyLimit = parseInt(elements.historyLimit.value);
  if (isNaN(historyLimit) || historyLimit < 1) {
    historyLimit = 1;
  } else if (historyLimit > 500) {
    historyLimit = 500;
  }
  elements.historyLimit.value = historyLimit;
  
  // Prepare settings object
  const settings = {
    autoSanitize: elements.autoSanitize.checked,
    autoPaste: elements.autoPaste.checked,
    autoCopy: elements.autoCopy.checked,
    keepHistory: elements.keepHistory.checked,
    historyLimit: historyLimit,
    showNotifications: elements.showNotifications.checked,
    preserveHash: elements.preserveHash.checked,
    caseSensitive: elements.caseSensitive.checked,
    blockRedirects: elements.blockRedirects.checked,
    customParams: customParamsArray
  };
  
  // Save to storage
  await saveSettings(settings);
  
  // Update UI
  updateSaveStatus('Settings saved successfully!', 'success');
  elements.saveBtn.disabled = true;
  
  // Show toast
  showToast('Settings saved!', 'success');
  
  // Update background script if auto-sanitize changed
  chrome.runtime.sendMessage({
    type: 'settingsUpdated',
    settings: settings
  });
  
  // Reset status after 3 seconds
  setTimeout(() => {
    updateSaveStatus('All changes saved', 'info');
  }, 3000);
}

/**
 * Update save status
 */
function updateSaveStatus(message, type) {
  elements.saveStatusText.textContent = message;
  elements.saveStatus.className = 'save-status';
  
  if (type === 'success') {
    elements.saveStatus.classList.add('success');
  }
}

/**
 * Handle clear history
 */
async function handleClearHistory() {
  if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
    await clearHistory();
    showToast('History cleared', 'success');
  }
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
    showToast('Statistics reset', 'success');
  }
}

/**
 * Handle reset all
 */
async function handleResetAll() {
  const confirmed = confirm(
    'Are you sure you want to reset ALL settings, history, and statistics?\n\n' +
    'This will:\n' +
    '• Reset all settings to defaults\n' +
    '• Clear all history\n' +
    '• Reset all statistics\n\n' +
    'This cannot be undone!'
  );
  
  if (!confirmed) return;
  
  // Clear everything
  await chrome.storage.sync.clear();
  await chrome.storage.local.clear();
  
  // Reload settings
  await loadSettings();
  
  showToast('All data reset to defaults', 'success');
  
  // Reload page after a delay
  setTimeout(() => {
    location.reload();
  }, 1500);
}
