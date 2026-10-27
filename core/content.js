(function () {
  'use strict';

  let autoSanitize = false;

  chrome.storage.sync.get({ autoSanitize: false })
    .then(s => { autoSanitize = !!s.autoSanitize; })
    .catch(() => {});

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.autoSanitize) autoSanitize = !!changes.autoSanitize.newValue;
  });

  const warmed = new WeakSet();
  document.addEventListener('mouseover', (e) => {
    if (!autoSanitize) return;
    const link = e.target?.closest?.('a[href]');
    if (!link || warmed.has(link)) return;
    warmed.add(link);
    chrome.runtime.sendMessage({ type: 'ping' }).catch(() => {});
  }, true);

  document.addEventListener('click', handleClick, true);

  async function handleClick(e) {
    if (!autoSanitize) return;
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (e.defaultPrevented) return;

    const link = e.target?.closest?.('a[href]');
    if (!link) return;

    let url;
    try { url = new URL(link.href); } catch { return; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search) return;

    e.preventDefault();
    e.stopPropagation();

    let target = link.href;
    try {
      const res = await Promise.race([
        chrome.runtime.sendMessage({ type: 'cleanUrl', url: link.href }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 800))
      ]);
      if (res?.success && res.sanitizedUrl) target = res.sanitizedUrl;
    } catch {}

    if (link.target === '_blank') {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = target;
    }
  }
})();
