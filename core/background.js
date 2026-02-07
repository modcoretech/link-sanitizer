import { cleanLink, getSettings } from './utils.js';

// Create Context Menus on Install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sanitize-open",
    title: "Open Sanitized Link",
    contexts: ["link"]
  });

  chrome.contextMenus.create({
    id: "sanitize-copy",
    title: "Copy Sanitized Link",
    contexts: ["link"]
  });
});

// Handle Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const settings = await getSettings();
  const result = cleanLink(info.linkUrl, settings.customParams);

  if (info.menuItemId === "sanitize-open") {
    chrome.tabs.create({ url: result.sanitizedUrl });
  } 
  else if (info.menuItemId === "sanitize-copy") {
    // Copying requires a specific pattern in MV3 background scripts
    // or injecting a script into the current tab to perform the copy.
    // We will inject a script into the active tab to copy to clipboard.
    if (tab && tab.id) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (text) => navigator.clipboard.writeText(text),
            args: [result.sanitizedUrl]
        }).catch(err => console.error("Could not copy from background:", err));
    }
  }
});
