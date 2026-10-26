import React, { useState } from 'react';
import { Terrain } from '../game/types';
import { PixelTerrainSigil } from './PixelIcons';

interface TerrainBannerProps {
  terrain: Terrain;
  index?: number;
}

export const TerrainBanner: React.FC<TerrainBannerProps> = ({ terrain }) => {
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      className="terrain-banner"
      style={{ borderColor: terrain.color }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      onClick={() => setShowTip(prev => !prev)}
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

      {showTip && (
        <div className="terrain-tooltip" onClick={e => e.stopPropagation()}>
          <div style={{ color: '#ffcc00', fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>
            [ {terrain.name} · 倍率 x{terrain.weight} ]
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4' }}>
            {terrain.description}
          </div>
        </div>
      )}
    </div>
  );
};
