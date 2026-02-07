// Content script for Link Sanitizer
// This script runs on all pages to support auto-sanitization features

(function() {
  'use strict';
  
  // Settings cache
  let settings = {
    autoSanitize: false
  };
  
  /**
   * Load settings from storage
   */
  async function loadSettings() {
    const result = await chrome.storage.sync.get({
      autoSanitize: false,
      customParams: [],
      preserveHash: false,
      caseSensitive: false,
      blockRedirects: true
    });
    settings = result;
  }
  
  /**
   * Initialize content script
   */
  async function init() {
    await loadSettings();
    
    // Listen for settings updates
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync') {
        loadSettings();
      }
    });
  }
  
  // Initialize
  init();
  
})();
