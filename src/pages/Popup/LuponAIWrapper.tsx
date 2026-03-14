import React, { useContext, useState, useEffect } from 'react';
import AppStateContext from '../Shared/contexts/appStateContext';
import { LuponAI } from './LuponAI';

export const LuponAIWrapper: React.FC = () => {
  const { prebids, pbjsNamespace } = useContext(AppStateContext);
  const [pageUrl, setPageUrl] = useState('');

  useEffect(() => {
    chrome.tabs?.query?.({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0];
      setPageUrl(tab?.url || '');
    });
  }, []);

  const prebid = prebids?.[pbjsNamespace];
  const events = Array.isArray(prebid?.events) ? prebid.events : [];
  const auctionInit = events.find((e: any) => e.eventType === 'auctionInit');
  const adUnits = auctionInit?.args?.adUnits || [];
  const bidders = Array.from(
    new Set(
      events
        .filter((e: any) => e.args?.bidder || e.args?.bidderCode)
        .map((e: any) => e.args?.bidder || e.args?.bidderCode)
    )
  ) as string[];

  const prebidData = prebid
    ? {
        version: prebid.version,
        adUnits,
        bidders: bidders.length ? bidders : adUnits.flatMap((u: any) => (u.bids || []).map((b: any) => b.bidder)).filter(Boolean),
        config: prebid.config || {},
        events: prebid.events || [],
        errors: (prebid as any).errors || [],
      }
    : null;

  return <LuponAI prebidData={prebidData} pageUrl={pageUrl} />;
};
