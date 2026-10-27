export const EXACT_TRACKERS = [
  // Google
  'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'gad_source', 'srsltid',
  // Meta / Facebook
  'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source', 'fb_comment_id',
  // Mailchimp
  'mc_cid', 'mc_eid',
  // Microsoft Ads
  'msclkid',
  // TikTok Ads
  'ttclid',
  // Twitter / X
  'twclid',
  // LinkedIn
  'li_fat_id',
  // Instagram
  'igshid', 'igsh',
  // Yandex
  'yclid',
  // Pinterest
  'epik',
  // Snapchat
  'sccid',
  // Adobe
  'ef_id', 's_cid', 's_kwcid',
  // HubSpot
  '_hsenc', '_hsmi', '_hsfp', '_hssc', '_hstc', 'hsctatracking',
  // Marketo
  'mkt_tok',
  // Vero
  'vero_id', 'vero_conv',
  // Omeda
  'oly_anon_id', 'oly_enc_id',
  // Advertising IDs
  'ad_id', 'adset_id', 'adgroup_id', 'campaign_id', 'source_id',
  // Contact / module tracking
  'trk_contact', 'trk_module', 'trk_sid',
  // Openstat / adservers
  '_openstat', '_ke', 'redirect_log_mongo_id',
  // Amazon
  '_encoding', 'pf_rd_p', 'pf_rd_r', 'pf_rd_i', 'pf_rd_m', 'pf_rd_s', 'pf_rd_t',
  'pd_rd_r', 'pd_rd_w', 'pd_rd_wg', 'pd_rd_i',
  'camp', 'creativeasin', 'ascsubtag',
  // Affiliate
  'aff_id', 'affiliate_id', 'offer_id', 'partner_id', 'click_id',
  'sref', 'ncid', 'nr_email_referer',
  // Misc
  'at_medium', 'at_campaign', '_ga', '_gl', '__s', 'wickedid'
];

export const TRACKER_PREFIXES = ['utm_', 'hsa_', 'pk_', 'mtm_', '_pk.'];

const EXACT_LOWER = new Set(EXACT_TRACKERS.map(p => p.toLowerCase()));

/* ------------------------------------------------------------------ */

export async function getSettings() {
  return chrome.storage.sync.get({
    customParams: [],
    autoPaste: false,
    autoCopy: false,
    autoSanitize: false,
    keepHistory: true,
    historyLimit: 50,
    preserveHash: false,
    caseSensitive: false,
    firstRun: true
  });
}

export async function saveSettings(settings) {
  return chrome.storage.sync.set(settings);
}

export async function getHistory() {
  const { history = [] } = await chrome.storage.local.get({ history: [] });
  return history;
}

export async function addToHistory(items) {
  const { keepHistory, historyLimit } = await getSettings();
  if (!keepHistory) return;
  const list = Array.isArray(items) ? items : [items];
  const now = Date.now();
  const entries = list.map((it, i) => ({
    id: now + i,
    originalUrl: it.originalUrl,
    sanitizedUrl: it.sanitizedUrl,
    removedCount: it.removedCount,
    removedParams: it.removedParams || [],
    timestamp: new Date().toISOString()
  }));
  const history = await getHistory();
  const merged = [...entries, ...history].slice(0, historyLimit);
  await chrome.storage.local.set({ history: merged });
}

export async function clearHistory() {
  await chrome.storage.local.set({ history: [] });
}

/* ------------------------------------------------------------------ */

export function isValidUrl(string) {
  try { new URL(string); return true; } catch {}
  try { new URL('https://' + string); return true; } catch {}
  return false;
}

function normalizeUrl(url) {
  url = url.trim();
  return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}

function isTracker(key, customParams, caseSensitive) {
  const lower = key.toLowerCase();
  for (const prefix of TRACKER_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }
  if (caseSensitive) {
    return EXACT_TRACKERS.includes(key) || customParams.includes(key);
  }
  if (EXACT_LOWER.has(lower)) return true;
  return customParams.some(p => p.toLowerCase() === lower);
}

export function cleanLink(url, customParams = [], options = {}) {
  const { preserveHash = false, caseSensitive = false } = options;
  try {
    const obj = new URL(normalizeUrl(url));
    const params = obj.searchParams;
    const removed = [];

    for (const key of [...params.keys()]) {
      if (isTracker(key, customParams, caseSensitive)) {
        removed.push(key);
        params.delete(key);
      }
    }
    obj.search = params.toString();

    if (!preserveHash && obj.hash.includes('=')) {
      const hashParams = new URLSearchParams(obj.hash.slice(1));
      const hashRemoved = [];
      for (const key of [...hashParams.keys()]) {
        if (isTracker(key, customParams, caseSensitive)) {
          hashRemoved.push(key);
          hashParams.delete(key);
        }
      }
      if (hashRemoved.length) {
        const cleaned = hashParams.toString();
        obj.hash = cleaned ? '#' + cleaned : '';
        removed.push(...hashRemoved);
      }
    }

    return {
      success: true,
      sanitizedUrl: obj.toString(),
      originalUrl: url,
      removedCount: removed.length,
      removedParams: removed
    };
  } catch (e) {
    return { success: false, sanitizedUrl: url, originalUrl: url, removedCount: 0, removedParams: [], error: e.message };
  }
}

export function batchCleanLinks(urls, customParams = [], options = {}) {
  return urls
    .map(u => u.trim())
    .filter(u => u && isValidUrl(u))
    .map(u => cleanLink(u, customParams, options));
}

/* ------------------------------------------------------------------ */

export async function shortenUrl(url) {
  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    const shortUrl = (await res.text()).trim();
    if (!shortUrl.startsWith('http')) throw new Error('Invalid response');
    return { success: true, shortUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); return { success: true }; }
  catch (e) { return { success: false, error: e.message }; }
}

export async function readFromClipboard() {
  try { const text = await navigator.clipboard.readText(); return { success: true, text }; }
  catch (e) { return { success: false, error: e.message }; }
}

/* ------------------------------------------------------------------ */

export function formatTimestamp(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function truncateText(text, maxLength = 60) {
  return text.length <= maxLength ? text : text.slice(0, maxLength - 1) + '…';
}

export function showError(title, message) {
  const dialog = document.getElementById('errorDialog');
  if (!dialog) return;
  const h = dialog.querySelector('h2');
  const p = dialog.querySelector('p');
  if (h) h.textContent = title;
  if (p) p.textContent = message;
  dialog.showModal();
}

export function flashButton(btn, text) {
  if (!btn) return;
  const original = btn.innerHTML;
  btn.innerHTML = `<span class="icon icon-sm icon-check"></span> ${text}`;
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = original;
    btn.disabled = false;
  }, 1500);
}

export async function checkFirstRun() {
  return (await getSettings()).firstRun;
}

export function completeOnboarding() {
  return saveSettings({ firstRun: false });
}
