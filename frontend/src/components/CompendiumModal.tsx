import React, { useState } from 'react';
import { getAllCharacters } from '../game/registry/characters';
import { TERRAIN_POOL } from '../game/registry/terrains';

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
        style={{ width: '92%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ color: '#ffcc00', margin: 0, textShadow: '2px 2px 0 #000' }}>
            📖 戰術百科圖鑑
          </h2>
          <button className="btn" style={{ padding: '6px 12px', fontSize: '12px', background: '#444' }} onClick={onClose}>
            ✕ 關閉
          </button>
        </div>

        {/* 分頁切換 */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button
            className="btn"
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '14px',
              background: tab === 'characters' ? '#4CAF50' : '#333'
            }}
            onClick={() => setTab('characters')}
          >
            ♟ 像素角色圖鑑 ({characters.length})
          </button>
          <button
            className="btn"
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '14px',
              background: tab === 'terrains' ? '#2196F3' : '#333'
            }}
            onClick={() => setTab('terrains')}
          >
            🌍 戰場環境一覽 ({TERRAIN_POOL.length})
          </button>
        </div>

        {/* 角色分頁 */}
        {tab === 'characters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>
              💡 每個棋子皆具備專屬特性，善用特性可在劣勢下逆襲或精準操控奇偶數！
            </div>
            {characters.map(char => (
              <div
                key={char.id}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `2px solid ${char.themeColor || '#555'}`,
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ fontSize: '32px', minWidth: '40px', textAlign: 'center' }}>
                  {char.avatar.src}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>{char.name}</span>
                    <span style={{ fontSize: '11px', color: '#888' }}>Lv.{char.level}</span>
                    {char.trait && (
                      <span
                        style={{
                          fontSize: '10px',
                          background: '#ffcc00',
                          color: '#000',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontWeight: 'bold'
                        }}
                      >
                        {char.trait.badge}
                      </span>
                    )}
                  </div>
                  {char.trait && (
                    <div style={{ fontSize: '12px', color: '#00ffcc', lineHeight: '1.4' }}>
                      【{char.trait.name}】：{char.trait.description}
                    </div>
                  )}
                  {char.lore && (
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '3px', fontStyle: 'italic' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>
              💡 戰場環境每回合隨機輪換，不同的地形會影響氣勢傳遞、倍率計算與特性發動！
            </div>
            {TERRAIN_POOL.map(terrain => (
              <div
                key={terrain.id}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `2px solid ${terrain.color}`,
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ fontSize: '30px', minWidth: '40px', textAlign: 'center' }}>
                  {terrain.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>{terrain.name}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        background: terrain.color,
                        color: '#fff',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontWeight: 'bold'
                      }}
                    >
                      倍率 x{terrain.weight}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#ddd', lineHeight: '1.4' }}>
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
