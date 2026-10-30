import React, { useState, useEffect, useRef } from 'react';
import { Terrain } from '../game/types';
import { PixelTerrainSigil } from './PixelIcons';

export interface TerrainBannerProps {
  terrain: Terrain;
  index?: number;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const TerrainBanner: React.FC<TerrainBannerProps> = ({
  terrain,
  index = 1,
  isSelected = false,
  onSelect
}) => {
  const [showTip, setShowTip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 點擊外部自動收起 (Standalone 模式)
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

  return (
    <div
      ref={containerRef}
      className={`terrain-banner ${isSelected ? 'selected' : ''}`}
      style={{
        borderColor: isSelected ? '#ffcc00' : terrain.color,
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
        <PixelTerrainSigil terrainId={terrain.icon || terrain.id} color={terrain.color} size={15} />
        <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>
          {terrain.name}
        </span>
        <span
          style={{
            background: terrain.color,
            color: '#fff',
            fontSize: '9px',
            padding: '1px 5px',
            borderRadius: '2px',
            fontWeight: 'bold',
            fontFamily: 'monospace'
          }}
        >
          x{terrain.weight}
        </span>
      </div>

      {!onSelect && showTip && (
        <div className={`terrain-tooltip slot-${index}`} onClick={e => e.stopPropagation()}>
          <div style={{ color: '#ffcc00', fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>
            [ {terrain.name} · 倍率 x{terrain.weight} ]
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' }}>
            {terrain.description}
          </div>
        </div>
      )}
    </div>
  );
};

