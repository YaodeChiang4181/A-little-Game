import React, { useState } from 'react';
import { Terrain } from '../game/types';

interface TerrainBannerProps {
  terrain: Terrain;
  index: number;
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
        <span style={{ fontSize: '15px' }}>{terrain.icon}</span>
        <span style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>{terrain.name}</span>
        <span
          style={{
            background: terrain.color,
            color: '#fff',
            fontSize: '10px',
            padding: '1px 5px',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          x{terrain.weight}
        </span>
      </div>

      {showTip && (
        <div className="terrain-tooltip" onClick={e => e.stopPropagation()}>
          <div style={{ color: '#ffcc00', fontWeight: 'bold', marginBottom: '3px' }}>
            {terrain.icon} {terrain.name} (倍率 x{terrain.weight})
          </div>
          <div style={{ fontSize: '11px', color: '#ddd' }}>
            {terrain.description}
          </div>
        </div>
      )}
    </div>
  );
};
