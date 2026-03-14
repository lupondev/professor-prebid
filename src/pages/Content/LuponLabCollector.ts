/**
 * Lupon Lab Collector — runs in Content Script context
 * Listens for GET_PBJS_DATA message from Background
 * Reads window.pbjs via the injected script bridge
 * Returns structured data back to Background → Lab Inspector
 */

import { GET_PBJS_DATA, LuponLabData } from '../Background/LuponLabBridge';

export function registerLuponLabCollector(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== GET_PBJS_DATA) return false;

    // Use postMessage to ask injected script (page context) for pbjs data
    // Injected script runs in page context and can access window.pbjs directly
    const requestId = 'lupon_' + Date.now();

    const handler = (event: MessageEvent) => {
      if (
        event.source !== window ||
        event.data?.type !== 'LUPON_PBJS_DATA_RESPONSE' ||
        event.data?.requestId !== requestId
      ) {
        return;
      }
      window.removeEventListener('message', handler);
      clearTimeout(timeout);
      sendResponse(event.data.payload);
    };

    window.addEventListener('message', handler);

    // Ask injected script for data
    window.postMessage(
      { type: 'LUPON_PBJS_DATA_REQUEST', requestId },
      '*'
    );

    // Timeout after 3 seconds
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      sendResponse({
        error: 'Timeout — pbjs data not received within 3s',
        url: location.href,
        timestamp: Date.now(),
      } as Partial<LuponLabData>);
    }, 3000);

    return true; // async
  });
}
