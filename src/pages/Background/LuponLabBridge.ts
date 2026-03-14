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
  namespace?: string;
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
        const publisherTabs = allTabs
          .filter(tab => {
            if (!tab.url || !tab.id) return false;
            if (tab.url.includes('luponmedia.com')) return false;
            if (tab.url.startsWith('chrome')) return false;
            if (tab.url.includes('rubiconproject.com')) return false;
            if (tab.url.includes('cloudflare.com')) return false;
            return true;
          })
          .sort((a, b) =>
            ((b as any).lastAccessed || 0) - ((a as any).lastAccessed || 0)
          );

        const publisherTab = publisherTabs[0];

        if (!publisherTab?.id) {
          sendResponse({ error: 'No publisher tab found — open a publisher page first' });
          return;
        }

        chrome.scripting.executeScript({
          target: { tabId: publisherTab.id! },
          func: () => {
            const w = window as any;

            // 1. Standard window.pbjs
            let pbjs = w.pbjs;
            let namespace = 'pbjs';

            // 2. DABPlus wrapper (used by novi.ba and adxbid publishers)
            //    Instances: DABPlus8400, DABPlus8401, DABPlus8577, etc.
            if (!pbjs || !pbjs.version) {
              const dabKey = Object.keys(w).find(k =>
                /^DABPlus\d+$/.test(k) &&
                w[k] &&
                typeof w[k] === 'object' &&
                w[k].adUnits
              );
              if (dabKey) {
                pbjs = w[dabKey];
                namespace = dabKey;
              }
            }

            // 3. Any object with requestBids + adUnits (generic Prebid)
            if (!pbjs || !pbjs.version) {
              const genericKey = Object.keys(w).find(k => {
                try {
                  const v = w[k];
                  return v && typeof v === 'object' && v.requestBids && v.adUnits;
                } catch { return false; }
              });
              if (genericKey) {
                pbjs = w[genericKey];
                namespace = genericKey;
              }
            }

            if (!pbjs) {
              return {
                error: 'No Prebid instance found (tried pbjs, DABPlus*, generic)',
                url: location.href,
                timestamp: Date.now()
              };
            }

            // Collect all DABPlus ad units if available
            const allAdUnits: any[] = pbjs.adUnits || [];
            const dabInstances = Object.keys(w).filter(k => /^DABPlus\d+$/.test(k) && w[k]?.adUnits);
            dabInstances.forEach(k => {
              if (k !== namespace && w[k]?.adUnits) {
                allAdUnits.push(...(w[k].adUnits || []));
              }
            });

            // Collect events from all instances
            const allEvents: any[] = [];
            dabInstances.forEach(k => {
              try {
                const evts = w[k]?.getEvents?.() || [];
                allEvents.push(...evts);
              } catch {}
            });
            if (!allEvents.length) {
              try { allEvents.push(...(pbjs.getEvents?.() || [])); } catch {}
            }

            const bidders = Array.from(new Set(
              allEvents
                .filter((e: any) => e.eventType === 'bidRequested')
                .map((e: any) => e.args?.bidder)
                .filter(Boolean)
            )) as string[];

            let config = {};
            try { config = pbjs.getConfig?.() || {}; } catch {}

            return {
              version: pbjs.version || null,
              adUnits: allAdUnits,
              bidders,
              config,
              events: allEvents,
              errors: w.__pbjsErrors || [],
              url: location.href,
              timestamp: Date.now(),
              namespace,
              dabInstances
            };
          }
        }, (results) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message, url: publisherTab.url });
            return;
          }
          const result = results?.[0]?.result;
          sendResponse(result || { error: 'executeScript returned no result', url: publisherTab.url });
        });
      });

      return true;
    }
  );
}
