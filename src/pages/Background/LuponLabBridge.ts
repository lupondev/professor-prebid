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
          target: { tabId: publisherTab.id!, allFrames: false },
          world: 'MAIN',
          func: () => {
            const w = window as any;

            // 1. Standard window.pbjs
            let pbjs = w.pbjs;
            let namespace = 'pbjs';

            // 2. DABPlus wrapper (adxbid publishers: novi.ba etc)
            if (!pbjs || !pbjs.version) {
              const dabKey = Object.keys(w).find(k =>
                /^DABPlus\d+$/.test(k) && w[k]?.adUnits
              );
              if (dabKey) { pbjs = w[dabKey]; namespace = dabKey; }
            }

            // 3. Generic Prebid fallback
            if (!pbjs || !pbjs.version) {
              const genericKey = Object.keys(w).find(k => {
                try { const v = w[k]; return v?.requestBids && v?.adUnits; } catch { return false; }
              });
              if (genericKey) { pbjs = w[genericKey]; namespace = genericKey; }
            }

            if (!pbjs) {
              return { error: 'No Prebid instance found', url: location.href, timestamp: Date.now() };
            }

            // All DABPlus instances
            const dabInstances = Object.keys(w).filter(k => /^DABPlus\d+$/.test(k) && w[k]?.adUnits);

            // Collect ad units from all instances
            const allAdUnits: any[] = [];
            const seenCodes = new Set<string>();
            dabInstances.forEach(k => {
              (w[k]?.adUnits || []).forEach((u: any) => {
                if (!seenCodes.has(u.code)) { seenCodes.add(u.code); allAdUnits.push(u); }
              });
            });
            if (!allAdUnits.length) allAdUnits.push(...(pbjs.adUnits || []));

            // Collect events from all instances
            const allEvents: any[] = [];
            dabInstances.forEach(k => {
              try { allEvents.push(...(w[k]?.getEvents?.() || [])); } catch {}
            });
            if (!allEvents.length) {
              try { allEvents.push(...(pbjs.getEvents?.() || [])); } catch {}
            }

            // Extract bidders — DABPlus stores bidder in args.bidder OR args.bids[].bidder
            const bidderSet = new Set<string>();
            allEvents
              .filter((e: any) => e.eventType === 'bidRequested')
              .forEach((e: any) => {
                // Standard: e.args.bidder
                if (e.args?.bidder) bidderSet.add(e.args.bidder);
                // DABPlus: e.args.bids[].bidder
                if (Array.isArray(e.args?.bids)) {
                  e.args.bids.forEach((b: any) => { if (b?.bidder) bidderSet.add(b.bidder); });
                }
              });

            let config = {};
            try { config = pbjs.getConfig?.() || {}; } catch {}

            return {
              version: pbjs.version || null,
              adUnits: allAdUnits,
              bidders: Array.from(bidderSet),
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
          sendResponse(results?.[0]?.result || { error: 'No result', url: publisherTab.url });
        });
      });

      return true;
    }
  );
}
