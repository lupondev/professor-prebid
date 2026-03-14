/**
 * Lupon Lab Bridge
 * Listens for requests from cdn.luponmedia.com/lab/inspector
 * and relays live pbjs data from ANY publisher tab (not the Lab itself).
 */

export const LUPON_LAB_REQUEST = 'LUPON_LAB_REQUEST';
export const GET_PBJS_DATA = 'GET_PBJS_DATA';

export function registerLuponLabBridge(): void {
  chrome.runtime.onMessageExternal.addListener(
    (message, sender, sendResponse) => {

      // PING — connection test
      if (message?.type === 'LUPON_LAB_PING') {
        sendResponse({ ok: true, version: '2.0.0' });
        return true;
      }

      // Only LUPON_LAB_REQUEST from luponmedia.com
      if (
        message?.type !== LUPON_LAB_REQUEST ||
        !sender.origin?.includes('luponmedia.com')
      ) {
        return false;
      }

      // Find publisher tab = any tab that is NOT luponmedia.com
      // Try last focused window first, then all windows
      chrome.tabs.query({}, (allTabs) => {
        const publisherTabs = allTabs.filter(tab => {
          if (!tab.url) return false;
          // Exclude Lab/luponmedia tabs and chrome internal pages
          if (tab.url.includes('luponmedia.com')) return false;
          if (tab.url.startsWith('chrome://')) return false;
          if (tab.url.startsWith('chrome-extension://')) return false;
          return true;
        });

        if (!publisherTabs.length) {
          sendResponse({
            error: 'No publisher tab found — open novi.ba or another publisher in a tab first',
          });
          return;
        }

        // Pick the most recently active publisher tab
        const target = publisherTabs[publisherTabs.length - 1];

        chrome.tabs.sendMessage(
          target.id!,
          { type: GET_PBJS_DATA },
          (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                error: chrome.runtime.lastError.message + ' — try reloading the publisher page',
                url: target.url,
              });
              return;
            }
            sendResponse(response);
          }
        );
      });

      return true; // Keep channel open for async response
    }
  );
}
