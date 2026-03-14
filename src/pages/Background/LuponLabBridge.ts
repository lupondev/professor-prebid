/**
 * Lupon Lab Bridge
 * Listens for requests from cdn.luponmedia.com/lab/inspector
 * and relays live pbjs data from ANY publisher tab (not the Lab itself).
 */

export const LUPON_LAB_REQUEST = 'LUPON_LAB_REQUEST';
export const GET_PBJS_DATA = 'GET_PBJS_DATA';

export interface LuponLabData {
  version?: string | null;
  adUnits?: any[];
  bidders?: string[];
  config?: any;
  events?: any[];
  errors?: string[];
  timestamp?: number;
  url?: string;
}

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

        chrome.scripting.executeScript(
          {
            target: { tabId: target.id! },
            func: () => {
              const pbjs = (window as any).pbjs;
              if (!pbjs)
                return { error: 'window.pbjs not found', url: location.href };
              return {
                version: pbjs.version,
                adUnits: pbjs.adUnits || [],
                bidders: Array.from(
                  new Set(
                    (pbjs.getEvents?.() || [])
                      .filter((e: any) => e.eventType === 'bidRequested')
                      .map((e: any) => e.args?.bidder)
                      .filter(Boolean)
                  )
                ),
                config: pbjs.getConfig?.() || {},
                events: pbjs.getEvents?.() || [],
                errors: (window as any).__pbjsErrors || [],
                url: location.href,
                timestamp: Date.now(),
              };
            },
          },
          (results) => {
            if (chrome.runtime.lastError) {
              sendResponse({ error: chrome.runtime.lastError.message });
              return;
            }
            sendResponse(results?.[0]?.result ?? { error: 'No result' });
          }
        );
      });

      return true; // Keep channel open for async response
    }
  );
}
