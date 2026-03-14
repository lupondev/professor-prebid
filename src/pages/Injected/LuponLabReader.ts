/**
 * Lupon Lab Reader — runs in PAGE context (injected script)
 * Has direct access to window.pbjs
 * Listens for LUPON_PBJS_DATA_REQUEST and returns all pbjs data
 */

export function registerLuponLabReader(): void {
  window.addEventListener('message', (event) => {
    if (
      event.source !== window ||
      event.data?.type !== 'LUPON_PBJS_DATA_REQUEST'
    ) {
      return;
    }

    const requestId = event.data.requestId;
    const pbjs = (window as any).pbjs;

    if (!pbjs) {
      window.postMessage(
        {
          type: 'LUPON_PBJS_DATA_RESPONSE',
          requestId,
          payload: {
            error: 'window.pbjs not found on this page',
            url: location.href,
            timestamp: Date.now(),
          },
        },
        '*'
      );
      return;
    }

    // Collect all available pbjs data
    let config = {};
    let adUnits: any[] = [];
    let bidResponses: any = {};
    let events: any[] = [];
    let bidderSettings: any = {};

    try { config = pbjs.getConfig ? pbjs.getConfig() : {}; } catch (e) {}
    try { adUnits = pbjs.adUnits || []; } catch (e) {}
    try { bidResponses = pbjs.getBidResponses ? pbjs.getBidResponses() : {}; } catch (e) {}
    try { events = pbjs.getEvents ? pbjs.getEvents() : []; } catch (e) {}
    try { bidderSettings = pbjs.bidderSettings || {}; } catch (e) {}

    // Extract unique bidders from ad units
    const bidders = Array.from(
      new Set(
        adUnits.flatMap((u: any) =>
          (u.bids || []).map((b: any) => b.bidder)
        )
      )
    ) as string[];

    // Extract JS errors if tracked
    const errors: string[] = (window as any).__pbjsErrors || [];

    // Build bid events summary
    const bidEvents = events.filter((e: any) =>
      ['bidResponse', 'noBid', 'bidTimeout', 'bidWon', 'auctionInit', 'auctionEnd', 'bidRequested'].includes(e.eventType)
    ).slice(-50); // Last 50 events

    const payload = {
      version: pbjs.version || null,
      adUnits,
      bidders,
      config,
      events: bidEvents,
      bidResponses,
      bidderSettings,
      errors,
      url: location.href,
      timestamp: Date.now(),
    };

    window.postMessage(
      {
        type: 'LUPON_PBJS_DATA_RESPONSE',
        requestId,
        payload,
      },
      '*'
    );
  });
}
