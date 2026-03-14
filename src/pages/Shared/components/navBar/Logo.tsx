import React from 'react';

interface LuponLogoProps {
  version?: string;
  size?: number;
  barColor?: string;
  textColor?: string;
}

const LuponLogo: React.FC<LuponLogoProps> = ({ version = 'v2.0', barColor = '#7c3aed', textColor = '#e0e0e0' }) => {
  const barHeight = 5;
  const gap = 5.25;

  return (
    <svg width={140} height={28} viewBox="0 0 240 56" xmlns="http://www.w3.org/2000/svg">
      {/* Bars */}
      <g fill={barColor}>
        <rect x="5" y={0 * (barHeight + gap)} width="38" height={barHeight} rx="4" />
        <rect x="15" y={1 * (barHeight + gap)} width="40" height={barHeight} rx="4" />
        <rect x="10" y={2 * (barHeight + gap)} width="30" height={barHeight} rx="4" />
        <rect x="20" y={3 * (barHeight + gap)} width="35" height={barHeight} rx="4" />
        <rect x="5" y={4 * (barHeight + gap)} width="55" height={barHeight} rx="4" />
      </g>

      {/* Text: Lupon Intelligence */}
      <text x="70" y="22" fontSize="14" fontFamily="roboto, -apple-system, sans-serif" fontWeight="bold" fill={textColor}>
        Lupon Intelligence
      </text>
      <text x="70" y="42" fontSize="10" fontFamily="roboto, -apple-system, sans-serif" fill={textColor} opacity={0.85}>
        Powered by Lupon Media
      </text>

      {/* Version */}
      <text x="200" y="42" fontSize="10" fontFamily="roboto, -apple-system, sans-serif" fill={textColor} opacity={0.7}>
        {version}
      </text>
    </svg>
  );
};

export default LuponLogo;
