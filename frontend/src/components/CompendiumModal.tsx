import React, { useState } from 'react';
import { getAllCharacters } from '../game/registry/characters';
import { TERRAIN_POOL } from '../game/registry/terrains';
import { PixelPieceIcon, PixelTerrainSigil } from './PixelIcons';

interface CompendiumModalProps {
  onClose: () => void;
}

export const CompendiumModal: React.FC<CompendiumModalProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'characters' | 'terrains'>('characters');
  const characters = getAllCharacters();

  return (
    <div className="tutorial-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div
        className="tutorial-box"
        style={{ width: '92%', maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ color: '#ffcc00', margin: 0, fontSize: '18px', letterSpacing: '1px' }}>
            [ 戰術百科 COMPENDIUM ]
          </h2>
          <button className="btn" style={{ padding: '6px 14px', fontSize: '12px', background: '#334155' }} onClick={onClose}>
            關閉
          </button>
        </div>

        {/* 分頁切換 */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button
            className="btn"
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '13px',
              background: tab === 'characters' ? '#0f766e' : '#1e293b'
            }}
            onClick={() => setTab('characters')}
          >
            [ 角色名錄 ] ({characters.length})
          </button>
          <button
            className="btn"
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '13px',
              background: tab === 'terrains' ? '#0369a1' : '#1e293b'
            }}
            onClick={() => setTab('terrains')}
          >
            [ 戰場環境 ] ({TERRAIN_POOL.length})
          </button>
        </div>

        {/* 角色分頁 */}
        {tab === 'characters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              * 點陣西洋棋核心規格：善用特性可在劣勢下逆襲或精準操控奇偶總分。
            </div>
            {characters.map(char => (
              <div
                key={char.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: `2px solid ${char.themeColor || '#475569'}`,
                  borderRadius: '4px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <div style={{ minWidth: '40px', display: 'flex', justifyContent: 'center' }}>
                  <PixelPieceIcon type={char.avatar.src || char.id} color="white" size={36} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', letterSpacing: '1px' }}>
                      {char.name}
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                      LV.{char.level}
                    </span>
                    {char.trait && (
                      <span
                        style={{
                          fontSize: '10px',
                          background: '#ffcc00',
                          color: '#000',
                          padding: '1px 5px',
                          borderRadius: '2px',
                          fontWeight: 'bold'
                        }}
                      >
                        {char.trait.badge}
                      </span>
                    )}
                  </div>
                  {char.trait && (
                    <div style={{ fontSize: '12px', color: '#00ffcc', lineHeight: '1.4' }}>
                      【{char.trait.name}】{char.trait.description}
                    </div>
                  )}
                  {char.lore && (
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px', fontStyle: 'italic' }}>
                      {char.lore}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 戰場分頁 */}
        {tab === 'terrains' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              * 動態環境每回合隨機輪換，直接影響氣勢傳遞、倍率計算與特性發動。
            </div>
            {TERRAIN_POOL.map(terrain => (
              <div
                key={terrain.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: `2px solid ${terrain.color}`,
                  borderRadius: '4px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <div style={{ minWidth: '36px', display: 'flex', justifyContent: 'center' }}>
                  <PixelTerrainSigil terrainId={terrain.icon || terrain.id} color={terrain.color} size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', letterSpacing: '1px' }}>
                      {terrain.name}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        background: terrain.color,
                        color: '#fff',
                        padding: '1px 6px',
                        borderRadius: '2px',
                        fontWeight: 'bold',
                        fontFamily: 'monospace'
                      }}
                    >
                      x{terrain.weight}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
                    {terrain.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn" style={{ width: '100%', marginTop: '20px', padding: '10px' }} onClick={onClose}>
          返回戰局
        </button>
      </div>
    </div>
  );
};
