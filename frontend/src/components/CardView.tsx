import React, { useState } from 'react';
import { Character } from '../game/types';

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
      {/* 棋子圖示 */}
      <div style={{ fontSize: '32px', marginBottom: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isImg ? (
          <img
            src={character.avatar.src}
            alt={character.name}
            style={{ width: '36px', height: '36px', imageRendering: 'pixelated' }}
          />
        ) : (
          <span>{character.avatar.src}</span>
        )}
      </div>

      {/* 角色名稱 */}
      <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{character.name}</div>

      {/* 等級與特性標籤 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
        <span style={{ fontSize: '10px', color: color === 'white' ? '#666' : '#aaa' }}>
          Lv.{character.level}
        </span>
        {character.trait && (
          <span
            style={{
              fontSize: '9px',
              padding: '1px 3px',
              borderRadius: '2px',
              background: color === 'white' ? '#222' : '#ffcc00',
              color: color === 'white' ? '#00ffcc' : '#000',
              fontWeight: 'bold',
              letterSpacing: '0.5px'
            }}
          >
            {character.trait.badge}
          </span>
        )}
      </div>

      {/* 特性懸浮說明 Tooltip */}
      {showTooltip && hovered && character.trait && (
        <div className="card-trait-tooltip" onClick={e => e.stopPropagation()}>
          <div style={{ color: '#ffcc00', fontWeight: 'bold', marginBottom: '4px' }}>
            {character.name} · {character.trait.name}
          </div>
          <div style={{ fontSize: '11px', color: '#eee', lineHeight: '1.4' }}>
            {character.trait.description}
          </div>
          {character.lore && (
            <div style={{ fontSize: '9px', color: '#999', marginTop: '4px', fontStyle: 'italic' }}>
              「{character.lore}」
            </div>
          )}
        </div>
      )}
    </div>
  );
};
