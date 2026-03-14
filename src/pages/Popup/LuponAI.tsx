import React, { useState } from 'react';

interface Props {
  prebidData: any;
  pageUrl: string;
}

export const LuponAI: React.FC<Props> = ({ prebidData, pageUrl }) => {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    setAnalysis('');

    const summary = {
      url: pageUrl,
      prebidVersion: prebidData?.version,
      adUnits: prebidData?.adUnits?.length || 0,
      bidders: prebidData?.bidders || [],
      bidderTimeout: prebidData?.config?.bidderTimeout,
      gdpr: !!prebidData?.config?.consentManagement,
      events: {
        bidRequested: (prebidData?.events || []).filter((e: any) => e.eventType === 'bidRequested').length,
        bidResponse: (prebidData?.events || []).filter((e: any) => e.eventType === 'bidResponse').length,
        bidTimeout: (prebidData?.events || []).filter((e: any) => e.eventType === 'bidTimeout').length,
        noBid: (prebidData?.events || []).filter((e: any) => e.eventType === 'noBid').length,
        bidWon: (prebidData?.events || []).filter((e: any) => e.eventType === 'bidWon').length,
      },
      floors: prebidData?.config?.floors ? 'configured' : 'not set',
      errors: prebidData?.errors || [],
    };

    try {
      const stored = await new Promise<Record<string, string>>((resolve, reject) => {
        chrome.storage?.sync?.get?.(['anthropicApiKey'], (r) => {
          if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError?.message));
          else resolve((r || {}) as Record<string, string>);
        });
      });
      const apiKey = (stored?.anthropicApiKey || '').trim();
      if (!apiKey) {
        setAnalysis('Analysis failed: Set your Anthropic API key in extension options.');
        setLoading(false);
        return;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: `You are Lupon Intelligence, an expert ad ops analyst for Lupon Media. 
Analyze Prebid.js auction data and give a concise technical diagnosis.
Format your response as:
SCORE: X/10
CRITICAL: [list critical issues, or "None"]
WARNINGS: [list warnings, or "None"]  
RECOMMENDATION: [top 1-2 actionable fixes]
Be direct and technical. No fluff.`,
          messages: [{
            role: 'user',
            content: `Analyze this publisher ad setup:\n${JSON.stringify(summary, null, 2)}`
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || 'No analysis returned';
      setAnalysis(text);
    } catch (e: any) {
      setAnalysis('Analysis failed: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '12px', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
        borderRadius: '8px',
        padding: '10px 14px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>
          ⚡ Lupon Intelligence
        </span>
        <button
          onClick={analyze}
          disabled={loading}
          style={{
            background: loading ? '#555' : '#fff',
            color: loading ? '#999' : '#7c3aed',
            border: 'none',
            borderRadius: '5px',
            padding: '4px 12px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {!analysis && !loading && (
        <div style={{ color: '#555', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
          Click Analyze to get AI-powered diagnosis
        </div>
      )}

      {loading && (
        <div style={{ color: '#7c3aed', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
          ⏳ Lupon Intelligence analyzing...
        </div>
      )}

      {analysis && (
        <pre style={{
          background: '#0d0d1a',
          color: '#e0e0e0',
          borderRadius: '6px',
          padding: '12px',
          fontSize: '11px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          margin: 0,
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {analysis}
        </pre>
      )}
    </div>
  );
};
