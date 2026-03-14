/**
 * Local type shim for 'prebid.js' so we don't rely on the package's TypeScript resolution.
 * Maps to our Injected/prebid interfaces.
 */
declare module 'prebid.js' {
  import type {
    IPrebidConfig,
    IGlobalPbjs,
    IPrebidBid,
    IPrebidAdUnit,
    IPrebidEvent,
    IPrebidBidderRequest,
  } from '../pages/Injected/prebid';

  export type Config = IPrebidConfig;
  export type PrebidJS = IGlobalPbjs;
  export type Bid = IPrebidBid;
  export type AdUnit = IPrebidAdUnit;
  export type AdUnitBid = IPrebidBid;
  /** Generic event record - type param is the event type name for typing only; runtime shape is IPrebidEvent */
  export type EventRecord<T = string> = IPrebidEvent;
  /** Generic for compatibility with prebid.js API; type param ignored, shape is IPrebidBidderRequest */
  export type BidderRequest<T = string> = IPrebidBidderRequest;
}
