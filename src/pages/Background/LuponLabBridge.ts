/**
 * Lupon Lab Bridge
 * Listens for requests from cdn.luponmedia.com/lab/inspector
 * and relays live pbjs data from the active publisher tab.
 *
 * Flow:
 *   Lab Inspector → chrome.runtime.sendMessage(LUPON_LAB_REQUEST)
 *   Background → chrome.tabs.sendMessage(active tab, GET_PBJS_DATA)
 *   Content/Injected → reads window.pbjs → returns data
 *   Background → responds back to Lab Inspector
 */

export const LUPON_LAB_REQUEST = 'LUPON_LAB_REQUEST';
export const LUPON_LAB_RESPONSE = 'LUPON_LAB_RESPONSE';
export const GET_PBJS_DATA = 'GET_PBJS_DATA';

export interface LuponLabData {
  version: string | null;
  adUnits: any[];
  bidders: string[];
  config: any;
  events: any[];
  errors: string[];
  timestamp: number;
  url: string;
}

/**
 * Register the Lab Bridge listener in the background script.
 * Call this once during background script initialization.
 */
export function registerLuponLabBridge(): void {
  chrome.runtime.onMessageExternal.addListener(
    (message, sender, sendResponse) => {
      if (message?.type === 'LUPON_LAB_PING') {
        sendResponse({ ok: true });
        return true;
      }

      // Only accept messages from Lupon Lab
      if (
        message?.type !== LUPON_LAB_REQUEST ||
        !sender.origin?.includes('luponmedia.com')
      ) {
        return false;
      }

      // Get the currently active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab?.id) {
          sendResponse({ error: 'No active tab found' });
          return;
        }

        // Ask content script on active tab to collect pbjs data
        chrome.tabs.sendMessage(
          activeTab.id,
          { type: GET_PBJS_DATA },
          (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                error: chrome.runtime.lastError.message,
                hint: 'Make sure the extension is active on this tab',
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
