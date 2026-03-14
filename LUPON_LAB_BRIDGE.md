# Lupon Lab Bridge

Connects **Lupon Ad Lab Inspector** (`cdn.luponmedia.com/lab/inspector`) to live `window.pbjs` data on any publisher page via this Chrome extension.

## Architecture

```
Lab Inspector (cdn.luponmedia.com)
    ↕ chrome.runtime.sendMessage (external)
Background Script (LuponLabBridge.ts)
    ↕ chrome.tabs.sendMessage
Content Script (LuponLabCollector.ts)
    ↕ window.postMessage
Injected Script (LuponLabReader.ts)  ← PAGE CONTEXT, reads window.pbjs
```

## Data returned to Lab Inspector

```json
{
  "version": "9.35.0",
  "adUnits": [...],
  "bidders": ["rubicon", "adform", "criteo"],
  "config": { "bidderTimeout": 1500, ... },
  "events": [ { "eventType": "bidResponse", "args": { "cpm": 1.23 } } ],
  "bidResponses": { ... },
  "errors": [],
  "url": "https://novi.ba/clanak/123",
  "timestamp": 1710000000000
}
```

## Integration steps

### 1. Add to Background/index.ts
```typescript
import { registerLuponLabBridge } from './LuponLabBridge';
registerLuponLabBridge();
```

### 2. Add to Content/index.ts
```typescript
import { registerLuponLabCollector } from './LuponLabCollector';
registerLuponLabCollector();
```

### 3. Add to Injected/prebid.ts (or new entry)
```typescript
import { registerLuponLabReader } from './LuponLabReader';
registerLuponLabReader();
```

### 4. Add Lab origin to manifest.json externally_connectable
```json
"externally_connectable": {
  "matches": ["https://cdn.luponmedia.com/*"]
}
```

## Workflow

1. Ad ops opens `cdn.luponmedia.com/lab/inspector`
2. Types publisher URL → clicks Scan
3. Lab shows "Extension detected" → clicks "Connect Live Data"
4. Extension reads `window.pbjs` from the currently open publisher tab
5. All Layer 2 + Layer 3 checks populate automatically with real data
6. Professor Prebid panel shows: Ad Units, Bids, Events, Config, Errors

## No extension fallback

If extension not installed, Lab falls back to bookmarklet.
Bookmarklet is auto-generated after scan and uses `window.opener.postMessage`.
