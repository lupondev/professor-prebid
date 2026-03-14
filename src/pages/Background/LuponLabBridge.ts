export const LUPON_LAB_REQUEST = 'LUPON_LAB_REQUEST';
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

export function registerLuponLabBridge(): void {
  chrome.runtime.onMessageExternal.addListener(
    (message, sender, sendResponse) => {

      if (message?.type === 'LUPON_LAB_PING') {
        sendResponse({ ok: true, version: '2.0.0' });
        return true;
      }

      if (
        message?.type !== LUPON_LAB_REQUEST ||
        !sender.origin?.includes('luponmedia.com')
      ) {
        return false;
      }

      chrome.tabs.query({}, (allTabs) => {
        // Sort by lastAccessed descending, pick most recently used publisher tab
        const publisherTabs = allTabs
          .filter(tab => {
            if (!tab.url || !tab.id) return false;
            if (tab.url.includes('luponmedia.com')) return false;
            if (tab.url.startsWith('chrome')) return false;
            if (tab.url.includes('rubiconproject.com')) return false;
            if (tab.url.includes('cloudflare.com')) return false;
            return true;
          })
          .sort((a, b) => ((b as chrome.tabs.Tab & { lastAccessed?: number }).lastAccessed || 0) - ((a as chrome.tabs.Tab & { lastAccessed?: number }).lastAccessed || 0));

        const publisherTab = publisherTabs[0];

        if (!publisherTab?.id) {
          sendResponse({ error: 'No publisher tab found — open a publisher page first' });
          return;
        }

        chrome.scripting.executeScript({
          target: { tabId: publisherTab.id },
          func: () => {
            const w = window as any;
            const pbjs = w.pbjs;
            if (!pbjs) {
              return { error: 'window.pbjs not found on this page', url: location.href, timestamp: Date.now() };
            }
            const events = pbjs.getEvents?.() || [];
            return {
              version: pbjs.version || null,
              adUnits: pbjs.adUnits || [],
              bidders: Array.from(new Set(
                events
                  .filter((e: any) => e.eventType === 'bidRequested')
                  .map((e: any) => e.args?.bidder)
                  .filter(Boolean)
              )),
              config: pbjs.getConfig?.() || {},
              events: events,
              errors: w.__pbjsErrors || [],
              url: location.href,
              timestamp: Date.now()
            };
          }
        }, (results) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message, url: publisherTab.url });
            return;
          }
          const result = results?.[0]?.result;
          if (!result) {
            sendResponse({ error: 'executeScript returned no result', url: publisherTab.url });
            return;
          }
          sendResponse(result);
        });
      });

      return true;
    }
  );
}
