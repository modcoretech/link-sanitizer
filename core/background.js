import { cleanLink, getSettings } from './utils.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'sanitize-open', title: 'Open Cleaned Link', contexts: ['link'] });
  chrome.contextMenus.create({ id: 'sanitize-copy', title: 'Copy Cleaned Link', contexts: ['link'] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.linkUrl) return;
  const settings = await getSettings();
  const result = cleanLink(info.linkUrl, settings.customParams, {
    preserveHash: settings.preserveHash,
    caseSensitive: settings.caseSensitive
  });

  if (info.menuItemId === 'sanitize-open') {
    chrome.tabs.create({ url: result.sanitizedUrl });
  } else if (info.menuItemId === 'sanitize-copy' && tab?.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: text => navigator.clipboard.writeText(text),
      args: [result.sanitizedUrl]
    }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'ping') { sendResponse({ ok: true }); return false; }
  if (msg?.type === 'cleanUrl' && typeof msg.url === 'string') {
    getSettings().then(s => {
      sendResponse(cleanLink(msg.url, s.customParams, {
        preserveHash: s.preserveHash,
        caseSensitive: s.caseSensitive
      }));
    });
    return true;
  }
});
