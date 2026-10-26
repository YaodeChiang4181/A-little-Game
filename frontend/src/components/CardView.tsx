import React, { useState } from 'react';
import { Character } from '../game/types';
import { PixelPieceIcon } from './PixelIcons';

interface CardViewProps {
  character: Character | null;
  color: 'white' | 'black';
  isWinner?: boolean;
  isLoser?: boolean;
  isClashing?: boolean;
  isUnselectedHand?: boolean; // 4選3中尚未佈署的手牌
  onClick?: () => void;
  showTooltip?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  character,
  color,
  isWinner,
  isLoser,
  isClashing,
  isUnselectedHand,
  onClick,
  showTooltip = true
}) => {
  const [hovered, setHovered] = useState(false);

  if (!character) {
    return <div className="card empty" onClick={onClick} />;
  }

  let animClass = '';
  if (isClashing) {
    animClass = color === 'black' ? 'flip-reveal ' : '';
    if (isWinner) animClass += 'clash-winner ';
    if (isLoser) animClass += 'clash-loser ';
  } else {
    if (isWinner) animClass += 'resolved-winner ';
    if (isLoser) animClass += 'resolved-loser ';
  }

  const isImg = character.avatar.type === 'image';

  return (
    <div
      className={`card ${color}-piece ${animClass} ${isUnselectedHand ? 'unselected-hand-card' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderColor: character.themeColor || (color === 'white' ? '#000' : '#000')
      }}
    >
      {/* 像素角色圖示 */}
      <div className="card-icon-container" style={{ marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isImg ? (
          <img
            src={character.avatar.src}
            alt={character.name}
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <PixelPieceIcon type={character.avatar.src || character.id} color={color} />
        )}
      </div>

      {/* 角色名稱 */}
      <div className="card-name-text">{character.name}</div>

      {/* 等級與特性標籤 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
        <span
          style={{
            fontSize: '10px',
            color: color === 'white' ? '#475569' : '#94a3b8',
            fontFamily: 'monospace',
            fontWeight: 'bold'
          }}
        >
          LV.{character.level}
        </span>
        {character.trait && (
          <span
            style={{
              fontSize: '9px',
              padding: '1px 4px',
              borderRadius: '2px',
              background: color === 'white' ? '#0f172a' : '#ffcc00',
              color: color === 'white' ? '#00ffcc' : '#000',
              fontWeight: 'bold',
              letterSpacing: '0.5px'
            }}
          >
            {character.trait.badge}
          </span>
        )}
      </div>

      {/* 特性懸浮說明 Tooltip (零 Emoji，精簡公式) */}
      {showTooltip && hovered && character.trait && (
        <div className="card-trait-tooltip" onClick={e => e.stopPropagation()}>
          <div style={{ color: '#ffcc00', fontWeight: 'bold', marginBottom: '3px', fontSize: '12px' }}>
            {character.name} · 【{character.trait.badge}】
          </div>
          <div style={{ fontSize: '11px', color: '#e2e8f0', lineHeight: '1.4' }}>
            {character.trait.description}
          </div>
          {character.lore && (
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
              {character.lore}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
