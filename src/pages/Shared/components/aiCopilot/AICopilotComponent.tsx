import React, { useContext, useMemo, useState, useRef, useEffect } from 'react';
import AppStateContext from '../../contexts/appStateContext';
import type { EventRecord } from 'prebid.js';

const STYLES = {
  root: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column' as const, background: '#080b0f', fontFamily: 'system-ui', color: '#e6edf3' },
  banner: { padding: 12, marginBottom: 8, background: '#0e1318', border: '1px solid #1e2a35', borderRadius: 8, fontSize: 13, color: '#8b949e' },
  alert: { padding: '10px 12px', marginBottom: 8, borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  alertWarning: { background: 'rgba(210,153,34,0.15)', border: '1px solid rgba(210,153,34,0.4)', color: '#d29922' },
  alertError: { background: 'rgba(248,81,73,0.15)', border: '1px solid rgba(248,81,73,0.4)', color: '#f85149' },
  chatWrap: { flex: 1, minHeight: 200, overflow: 'auto', display: 'flex', flexDirection: 'column' as const, background: '#0e1318', border: '1px solid #1e2a35', borderRadius: 8, padding: 12 },
  messageList: { flex: 1, overflow: 'auto', listStyle: 'none', margin: 0, padding: 0 },
  bubbleWrapUser: { display: 'flex', justifyContent: 'flex-end', marginBottom: 12 },
  bubbleWrapAssistant: { display: 'flex', justifyContent: 'flex-start', marginBottom: 12 },
  bubbleUser: { maxWidth: '90%', padding: '10px 14px', borderRadius: 12, border: '1px solid #00e5ff', background: 'rgba(0,229,255,0.08)', fontSize: 14 },
  bubbleAssistant: { maxWidth: '90%', padding: '10px 14px', borderRadius: 12, background: '#0e1318', border: '1px solid #1e2a35', fontSize: 14 },
  bubbleLabel: { fontSize: 11, color: '#8b949e', marginBottom: 4 },
  bubbleContent: { whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' },
  emptyState: { padding: '24px 16px', textAlign: 'center' as const, color: '#8b949e', fontSize: 14 },
  suggestions: { display: 'flex', flexWrap: 'wrap' as const, gap: 8, justifyContent: 'center', marginTop: 16 },
  chip: { padding: '8px 14px', borderRadius: 20, background: '#0e1318', border: '1px solid #1e2a35', color: '#00e5ff', fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui' },
  typingWrap: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 12, maxWidth: '90%' },
  typingText: { fontSize: 14, color: '#8b949e' },
  inputRow: { display: 'flex', gap: 8, marginTop: 12, flexShrink: 0 },
  input: { flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #1e2a35', background: '#080b0f', color: '#e6edf3', fontSize: 14, fontFamily: 'system-ui', outline: 'none' },
  sendBtn: { width: 44, height: 44, borderRadius: 8, border: 'none', background: '#00e5ff', color: '#080b0f', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
} as const;

const SUGGESTIONS = [
  'Why are some bidders not returning bids?',
  'Summarize my ad unit setup.',
  'What might be wrong with my timeline?',
  'Explain my price granularity config.',
];

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL_ID = 'claude-sonnet-4-20250514';
const STORAGE_KEY_API = 'anthropicApiKey';
const MAX_CONTEXT_CHARS = 80000;

// Temporary test: paste your key here when running to verify fetch works (bypasses storage).
const HARDCODED_TEST_KEY = '';;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function buildPrebidContext(state: {
  prebid: any;
  auctionInitEvents: EventRecord<'auctionInit'>[];
  auctionEndEvents: EventRecord<'auctionEnd'>[];
  allBidResponseEvents: EventRecord<'bidResponse'>[];
  allWinningBids: EventRecord<'bidWon'>[];
  events: any[];
}): string {
  const adUnits = (state.auctionInitEvents || []).reduce((acc: any[], ev) => {
    return acc.concat((ev.args?.adUnits || []) as any[]);
  }, []);
  const adUnitsDeduped = adUnits.filter((au, i, arr) => arr.findIndex((a) => a?.code === au?.code) === i);

  const timeline = (state.auctionEndEvents || []).map((ev) => ({
    auctionId: ev.args?.auctionId,
    start: ev.args?.timestamp,
    end: ev.args?.auctionEnd,
    durationMs: ev.args?.auctionEnd != null && ev.args?.timestamp != null ? ev.args.auctionEnd - ev.args.timestamp : null,
    winningBidsCount: (ev.args?.winningBids as any[])?.length ?? 0,
  }));

  const config = state.prebid?.config ? { ...state.prebid.config } : {};
  if (config.consentManagement) {
    try {
      config.consentManagement = '[redacted]';
    } catch (_) {}
  }

  const winningBidsSample = (state.allWinningBids || []).slice(0, 50).map((b: any) => ({
    bidder: b.bidder,
    adUnitCode: b.adUnitCode,
    cpm: b.cpm,
    currency: b.currency,
    mediaType: b.mediaType,
  }));

  const eventSummary = Array.isArray(state.events)
    ? {
        total: state.events.length,
        byType: (state.events as any[]).reduce((acc: Record<string, number>, ev: any) => {
          const t = ev?.eventType || 'unknown';
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {}),
      }
    : null;

  const context = {
    prebidVersion: state.prebid?.version,
    config,
    adUnits: adUnitsDeduped.slice(0, 200),
    adUnitCount: adUnitsDeduped.length,
    timeline,
    winningBidsSample,
    winningBidsTotal: (state.allWinningBids || []).length,
    bidResponsesTotal: (state.allBidResponseEvents || []).length,
    eventSummary,
  };

  let str = JSON.stringify(context, null, 2);
  if (str.length > MAX_CONTEXT_CHARS) {
    str = str.slice(0, MAX_CONTEXT_CHARS) + '\n...[truncated]';
  }
  return str;
}

export const AICopilotComponent = (): JSX.Element => {
  const state = useContext(AppStateContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [typingDots, setTypingDots] = useState('');
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) {
      setTypingDots('');
      return;
    }
    let n = 0;
    const id = setInterval(() => {
      n = (n + 1) % 4;
      setTypingDots('.'.repeat(n));
    }, 400);
    return () => clearInterval(id);
  }, [loading]);

  const prebidContextJson = useMemo(
    () =>
      buildPrebidContext({
        prebid: state.prebid,
        auctionInitEvents: state.auctionInitEvents,
        auctionEndEvents: state.auctionEndEvents,
        allBidResponseEvents: state.allBidResponseEvents,
        allWinningBids: state.allWinningBids,
        events: state.events,
      }),
    [
      state.prebid,
      state.auctionInitEvents,
      state.auctionEndEvents,
      state.allBidResponseEvents,
      state.allWinningBids,
      state.events,
    ]
  );

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError(null);
    setApiKeyMissing(false);
    setLoading(true);

    try {
      const result = await new Promise<Record<string, string>>((resolve, reject) => {
        chrome.storage.sync.get([STORAGE_KEY_API], (r) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(r as Record<string, string>);
        });
      });

      const rawKey = result?.[STORAGE_KEY_API];
      const storageKey = typeof rawKey === 'string' ? rawKey.trim() : '';
      const apiKey = HARDCODED_TEST_KEY || storageKey;
      if (!apiKey) {
        setApiKeyMissing(true);
        setMessages((prev) => prev.slice(0, -1));
        setLoading(false);
        return;
      }

      const systemPrompt = `You are an expert Prebid.js assistant inside the Professor Prebid browser extension. The user is debugging or configuring header bidding. Use the following Prebid context (ad units, config, timeline, bids) to answer their questions accurately. If the context is empty or minimal, say so and still try to help with general Prebid questions.

Prebid context (JSON):
${prebidContextJson}`;

      const apiMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: text },
      ];

      const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL_ID,
          max_tokens: 4096,
          system: systemPrompt,
          messages: apiMessages,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        if (res.status === 401) {
          console.log('[AICopilot] 401 response body (full):', errBody);
        }
        throw new Error(res.status === 401 ? 'Invalid API key' : `API error ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const data = await res.json();
      const assistantText =
        data.content?.find((c: any) => c.type === 'text')?.text ?? (data.content?.[0]?.text ?? 'No response.');
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={STYLES.root}>
      <div style={STYLES.banner}>
        Ask questions about your Prebid setup. Context (ad units, config, timeline, bids) is sent with each message.
        Set your Anthropic API key in the extension Options page.
      </div>

      {apiKeyMissing && (
        <div style={{ ...STYLES.alert, ...STYLES.alertWarning }}>
          <span>No API key found. Open the extension Options page and add your Anthropic API key (stored in Chrome sync).</span>
          <button type="button" onClick={() => setApiKeyMissing(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18, padding: '0 4px' }} aria-label="Dismiss">×</button>
        </div>
      )}

      {error && (
        <div style={{ ...STYLES.alert, ...STYLES.alertError }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18, padding: '0 4px' }} aria-label="Dismiss">×</button>
        </div>
      )}

      <div style={STYLES.chatWrap}>
        <ul style={STYLES.messageList}>
          {messages.length === 0 && !loading && (
            <li style={STYLES.emptyState}>
              <div>No messages yet</div>
              <div style={STYLES.suggestions}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} type="button" style={STYLES.chip} onClick={() => sendMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </li>
          )}
          {messages.map((msg, i) => (
            <li key={i} style={msg.role === 'user' ? STYLES.bubbleWrapUser : STYLES.bubbleWrapAssistant}>
              <div style={msg.role === 'user' ? STYLES.bubbleUser : STYLES.bubbleAssistant}>
                <div style={STYLES.bubbleLabel}>{msg.role === 'user' ? 'You' : 'Claude'}</div>
                <div style={STYLES.bubbleContent}>{msg.content}</div>
              </div>
            </li>
          ))}
          {loading && (
            <li style={STYLES.typingWrap}>
              <span style={STYLES.typingText}>Claude is thinking{typingDots}</span>
            </li>
          )}
          <div ref={listEndRef} />
        </ul>

        <div style={STYLES.inputRow}>
          <input
            type="text"
            placeholder="Ask about your Prebid setup…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={loading}
            style={STYLES.input}
            aria-label="Message input"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{ ...STYLES.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
            aria-label="Send"
          >
            <ArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AICopilotComponent;
