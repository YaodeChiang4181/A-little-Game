import React, { useState, useEffect, useRef } from 'react';
import { Terrain, LaneConstraint } from '../game/types';
import { PixelTerrainSigil } from './PixelIcons';

export interface TerrainBannerProps {
  terrain?: Terrain;
  laneIndex?: number;              // 0, 1, 2
  multiplier?: number;             // 1 或 2
  constraint?: LaneConstraint;     // 中路禁令
  isSelected?: boolean;
  onSelect?: () => void;
}

export const TerrainBanner: React.FC<TerrainBannerProps> = ({
  terrain,
  laneIndex = 1,
  multiplier = laneIndex === 1 ? 2 : 1,
  constraint,
  isSelected = false,
  onSelect
}) => {
  const [showTip, setShowTip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 點擊外部自動收起
  useEffect(() => {
    if (!showTip) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowTip(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showTip]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect();
    } else {
      setShowTip(prev => !prev);
    }
  };

  // 若為新三路結構
  const laneNames = ['左翼陣線', '中路核心', '右翼陣線'];
  const displayName = constraint && laneIndex === 1
    ? `中路 · ${constraint.badge}`
    : terrain ? terrain.name : laneNames[laneIndex] || `戰場 ${laneIndex + 1}`;

  const themeColor = laneIndex === 1
    ? (constraint ? constraint.color : '#fbbf24')
    : (terrain ? terrain.color : '#64748b');

  const descText = laneIndex === 1 && constraint
    ? constraint.description
    : terrain ? terrain.description : '常規推進陣線，乘數倍率 ×1，無特殊限制。';

  return (
    <div
      ref={containerRef}
      className={`terrain-banner ${isSelected ? 'selected' : ''}`}
      style={{
        borderColor: isSelected ? '#ffcc00' : themeColor,
        background: laneIndex === 1 ? '#18181b' : '#090d16',
        zIndex: isSelected || showTip ? 150 : 5
      }}
      onMouseEnter={() => {
        if (!onSelect) setShowTip(true);
      }}
      onMouseLeave={() => {
        if (!onSelect) setShowTip(false);
      }}
      onClick={handleClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <PixelTerrainSigil
          terrainId={laneIndex === 1 ? 'arena' : 'town'}
          color={themeColor}
          size={14}
        />
        <span style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          {displayName}
        </span>
        <span
          style={{
            background: themeColor,
            color: '#000',
            fontSize: '9px',
            padding: '1px 4px',
            borderRadius: '0px',
            fontWeight: 'bold',
            fontFamily: 'monospace'
          }}
        >
          ×{multiplier}
        </span>
      </div>

      {!onSelect && showTip && (
        <div className={`terrain-tooltip slot-${laneIndex}`} onClick={e => e.stopPropagation()}>
          <div style={{ color: '#ffcc00', fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>
            [ {displayName} · 倍率 ×{multiplier} ]
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' }}>
            {descText}
          </div>
        </div>
      )}
    </div>
  );
};
