import React, { useState } from 'react';
import { getAllCharacters } from '../game/registry/characters';
import { LANE_CONSTRAINTS } from '../game/registry/laneConstraints';
import { PixelPieceIcon, PixelTerrainSigil } from './PixelIcons';

interface CompendiumModalProps {
  onClose: () => void;
}

export const CompendiumModal: React.FC<CompendiumModalProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'characters' | 'constraints'>('characters');
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
            [ 戰術牌庫 ] ({characters.length}張)
          </button>
          <button
            className="btn"
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '13px',
              background: tab === 'constraints' ? '#0369a1' : '#1e293b'
            }}
            onClick={() => setTab('constraints')}
          >
            [ 中路禁令 ] ({LANE_CONSTRAINTS.length}種)
          </button>
        </div>

        {/* 角色分頁 */}
        {tab === 'characters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              * 15 張對稱牌庫：LV.1~2 具備戰術特性，LV.3~4 為高戰力白板。每回合發 3 張必全出。
            </div>
            {characters.map(char => (
              <div
                key={char.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: `2px solid ${char.themeColor || '#475569'}`,
                  borderRadius: '0px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <div style={{ minWidth: '40px', display: 'flex', justifyContent: 'center' }}>
                  {char.avatar.type === 'image' ? (
                    <img
                      src={char.avatar.src}
                      alt={char.name}
                      style={{ imageRendering: 'pixelated', maxWidth: '36px', maxHeight: '36px', objectFit: 'contain' }}
                    />
                  ) : (
                    <PixelPieceIcon type={char.avatar.src || char.id} color="white" size={36} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', letterSpacing: '1px' }}>
                      {char.name}
                    </span>
                    <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                      LV.{char.base_level || char.level}
                    </span>
                    {char.trait ? (
                      <span
                        style={{
                          fontSize: '10px',
                          background: '#ffcc00',
                          color: '#000',
                          padding: '1px 5px',
                          borderRadius: '0px',
                          fontWeight: 'bold'
                        }}
                      >
                        {char.trait.badge}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '10px',
                          background: '#334155',
                          color: '#94a3b8',
                          padding: '1px 5px',
                          borderRadius: '0px',
                          fontWeight: 'bold'
                        }}
                      >
                        常規
                      </span>
                    )}
                  </div>
                  {char.trait ? (
                    <div style={{ fontSize: '12px', color: '#00ffcc', lineHeight: '1.6' }}>
                      【{char.trait.name}】{char.trait.description}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
                      [ 常規兵種 ] 專注於正面點數對決與排位博弈，無特殊異能。
                    </div>
                  )}
                  {char.lore && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#94a3b8',
                        marginTop: '4px',
                        fontStyle: 'normal',
                        lineHeight: '1.4',
                        letterSpacing: '0.2px'
                      }}
                    >
                      {char.lore}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 禁令分頁 */}
        {tab === 'constraints' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              * 中路 (Lane 1) 享有 ×2 戰力倍率，但每回合受不同禁令限制。違規放置之卡牌戰力視為 0。
            </div>
            {LANE_CONSTRAINTS.map(c => (
              <div
                key={c.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: `2px solid ${c.color}`,
                  borderRadius: '0px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <div style={{ minWidth: '36px', display: 'flex', justifyContent: 'center' }}>
                  <PixelTerrainSigil terrainId="arena" color={c.color} size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', letterSpacing: '1px' }}>
                      {c.name}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        background: c.color,
                        color: '#000',
                        padding: '1px 6px',
                        borderRadius: '0px',
                        fontWeight: 'bold',
                        fontFamily: 'monospace'
                      }}
                    >
                      {c.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                    {c.description}
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
