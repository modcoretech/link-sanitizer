// utils.js - Enhanced utility functions

// Comprehensive default tracking parameters
export const DEFAULT_TRACKING_PARAMS = [
  // Google Analytics & Ads
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
  'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
  
  // Facebook & Social Media
  'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source',
  'mc_cid', 'mc_eid',
  
  // Microsoft/Bing
  'msclkid', 'msclkid2',
  
  // Other Ad Platforms
  'yclid', 'twclid', 'li_fat_id', 'igshid',
  
  // Email Marketing
  '_hsenc', '_hsmi', '__s', '__hsfp', '__hstc', '__hssc',
  'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad', 'hsa_src',
  'hsa_net', 'hsa_ver', 'hsa_kw', 'hsa_mt', 'hsa_tgt',
  
  // Analytics & Tracking
  'ref', 'referer', 'referrer', 'si', 's_kwcid', 'ad_id', 'adset_id',
  'campaign_id', 'source_id', 'trk_contact', 'trk_module', 'trk_sid',
  '_openstat', '_ke', 'redirect_log_mongo_id',
  
  // E-commerce & Affiliates
  'aff_id', 'affiliate_id', 'offer_id', 'partner_id', 'click_id',
  'sref', 'mkt_tok', 'ncid', 'nr_email_referer',
  
  // Session & Tracking IDs
  'sessionid', 'session_id', 'sid', 'trackid', 'track',
  
  // Other Common Parameters
  'feature', 'share', 'shared', 'at_medium', 'at_campaign'
];

// Social media link shorteners and redirect parameters
export const SOCIAL_REDIRECT_PARAMS = [
  't.co', 'bit.ly', 'tinyurl.com', 'ow.ly', 'buff.ly'
];

/**
 * Retrieves settings from storage with defaults
 */
export async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      {
        customParams: [],
        autoPaste: false,
        autoCopy: false,
        autoSanitize: false,
        keepHistory: true,
        historyLimit: 50,
        autoShorten: false,
        showNotifications: true,
        blockRedirects: true,
        preserveHash: false,
        caseSensitive: false,
        firstRun: true
      },
      (data) => {
        resolve(data);
      }
    );
  });
}

/**
 * Save settings to storage
 */
export async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, resolve);
  });
}

/**
 * Get statistics from storage
 */
export async function getStats() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      {
        totalCleaned: 0,
        totalParamsRemoved: 0,
        lastCleanedDate: null
      },
      resolve
    );
  });
}

/**
 * Update statistics
 */
export async function updateStats(cleaned, paramsRemoved) {
  const stats = await getStats();
  return new Promise((resolve) => {
    chrome.storage.local.set({
      totalCleaned: stats.totalCleaned + cleaned,
      totalParamsRemoved: stats.totalParamsRemoved + paramsRemoved,
      lastCleanedDate: new Date().toISOString()
    }, resolve);
  });
}

/**
 * Get history from storage
 */
export async function getHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ history: [] }, (data) => {
      resolve(data.history);
    });
  });
}

/**
 * Add item to history
 */
export async function addToHistory(item) {
  const settings = await getSettings();
  if (!settings.keepHistory) return;
  
  const history = await getHistory();
  const newItem = {
    id: Date.now(),
    originalUrl: item.originalUrl,
    sanitizedUrl: item.sanitizedUrl,
    removedCount: item.removedCount,
    removedParams: item.removedParams,
    timestamp: new Date().toISOString()
  };
  
  history.unshift(newItem);
  
  // Limit history size
  const limitedHistory = history.slice(0, settings.historyLimit);
  
  return new Promise((resolve) => {
    chrome.storage.local.set({ history: limitedHistory }, resolve);
  });
}

/**
 * Clear history
 */
export async function clearHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ history: [] }, resolve);
  });
}

/**
 * Validate URL
 */
export function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    // Try adding protocol
    try {
      new URL('https://' + string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

/**
 * Normalize URL - add protocol if missing
 */
export function normalizeUrl(url) {
  url = url.trim();
  
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
  }
  
  return url;
}

/**
 * Check if parameter should be removed
 */
export function isTrackingParameter(paramKey, customParams = []) {
  const allParams = [...DEFAULT_TRACKING_PARAMS, ...customParams];
  const lowerKey = paramKey.toLowerCase();
  
  return allParams.some(param => {
    const lowerParam = param.toLowerCase();
    // Exact match or starts with (for patterns)
    return lowerKey === lowerParam || lowerKey.startsWith(lowerParam);
  });
}

/**
 * Core function to clean a link with advanced options
 */
export function cleanLink(url, customParams = [], options = {}) {
  const {
    preserveHash = false,
    caseSensitive = false,
    blockRedirects = true
  } = options;
  
  try {
    // Normalize URL
    const normalizedUrl = normalizeUrl(url);
    const urlObj = new URL(normalizedUrl);
    
    const params = new URLSearchParams(urlObj.search);
    const paramsToRemove = [];
    const fullBlockList = [...DEFAULT_TRACKING_PARAMS, ...customParams];
    
    // Identify parameters to delete
    for (const [key] of params.entries()) {
      const checkKey = caseSensitive ? key : key.toLowerCase();
      const shouldRemove = fullBlockList.some(block => {
        const checkBlock = caseSensitive ? block : block.toLowerCase();
        return checkKey === checkBlock || checkKey.startsWith(checkBlock);
      });
      
      if (shouldRemove) {
        paramsToRemove.push(key);
      }
    }
    
    // Delete tracking parameters
    paramsToRemove.forEach(key => params.delete(key));
    
    // Update URL
    urlObj.search = params.toString();
    
    // Handle hash parameters if not preserving
    if (!preserveHash && urlObj.hash && urlObj.hash.includes('=')) {
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      const hashParamsToRemove = [];
      
      for (const [key] of hashParams.entries()) {
        const checkKey = caseSensitive ? key : key.toLowerCase();
        const shouldRemove = fullBlockList.some(block => {
          const checkBlock = caseSensitive ? block : block.toLowerCase();
          return checkKey === checkBlock || checkKey.startsWith(checkBlock);
        });
        
        if (shouldRemove) {
          hashParamsToRemove.push(key);
        }
      }
      
      hashParamsToRemove.forEach(key => hashParams.delete(key));
      
      const cleanedHash = hashParams.toString();
      urlObj.hash = cleanedHash ? '#' + cleanedHash : '';
    }
    
    return {
      success: true,
      sanitizedUrl: urlObj.toString(),
      originalUrl: url,
      removedCount: paramsToRemove.length,
      removedParams: paramsToRemove
    };
    
  } catch (e) {
    return {
      success: false,
      sanitizedUrl: url,
      originalUrl: url,
      removedCount: 0,
      removedParams: [],
      error: e.message
    };
  }
}

/**
 * Batch clean multiple URLs
 */
export function batchCleanLinks(urls, customParams = [], options = {}) {
  const results = [];
  
  for (const url of urls) {
    const trimmedUrl = url.trim();
    if (trimmedUrl && isValidUrl(trimmedUrl)) {
      results.push(cleanLink(trimmedUrl, customParams, options));
    }
  }
  
  return results;
}

/**
 * Extract URLs from text
 */
export function extractUrls(text) {
  const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  return text.match(urlPattern) || [];
}

/**
 * Shorten URL using TinyURL API
 */
export async function shortenUrl(url) {
  try {
    const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const shortUrl = await response.text();
    
    if (shortUrl.startsWith('http')) {
      return { success: true, shortUrl };
    } else {
      throw new Error('Invalid response');
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Decode URL components
 */
export function decodeUrl(url) {
  try {
    return decodeURIComponent(url);
  } catch (e) {
    return url;
  }
}

/**
 * Copy text to clipboard (must be called in user context)
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Read from clipboard (must be called in user context)
 */
export async function readFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    return { success: true, text };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Truncate text for display
 */
export function truncateText(text, maxLength = 60) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Create toast notification element
 */
export function createToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  
  const icon = document.createElement('span');
  icon.className = 'icon icon-sm';
  
  switch (type) {
    case 'success':
      icon.classList.add('icon-check');
      break;
    case 'error':
      icon.classList.add('icon-close');
      break;
    case 'warning':
      icon.classList.add('icon-info');
      break;
    default:
      icon.classList.add('icon-info');
  }
  
  const textNode = document.createTextNode(message);
  
  toast.appendChild(icon);
  toast.appendChild(textNode);
  
  return toast;
}

/**
 * Show toast notification
 */
export function showToast(message, type = 'info', duration = 3000) {
  let container = document.querySelector('.toast-container');
  
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = createToast(message, type, duration);
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      container.removeChild(toast);
      if (container.children.length === 0) {
        document.body.removeChild(container);
      }
    }, 300);
  }, duration);
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Check if first run
 */
export async function checkFirstRun() {
  const settings = await getSettings();
  return settings.firstRun;
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding() {
  return saveSettings({ firstRun: false });
}
