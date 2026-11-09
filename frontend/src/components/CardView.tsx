import React, { useState } from 'react';
import { Character } from '../game/types';
import { PixelPieceIcon } from './PixelIcons';
import { getCustomCharacterAvatar } from '../game/economy/wallet';

interface CardViewProps {
  character: Character | null;
  color: 'white' | 'black';
  isWinner?: boolean;
  isLoser?: boolean;
  isClashing?: boolean;
  isUnselectedHand?: boolean; // 4選3中尚未佈署的手牌
  isRevealed?: boolean; // 是否翻開揭示 (敵方暗牌/揭曉動畫)
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
  isRevealed = true,
  onClick,
  showTooltip = true
}) => {
  const [hovered, setHovered] = useState(false);

  if (!character) {
    return <div className="card empty" onClick={onClick} />;
  }

  if (isRevealed === false) {
    return (
      <div
        className={`card ${color}-piece`}
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: '#000',
          color: '#64748b',
          fontSize: '24px',
          fontFamily: 'monospace'
        }}
      >
        ?
      </div>
    );
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

  const customAvatar = character ? getCustomCharacterAvatar(character.id) : null;
  const isImg = customAvatar ? true : character.avatar.type === 'image';
  const avatarSrc = customAvatar || character.avatar.src;

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
            src={avatarSrc}
            alt={character.name}
            style={{ imageRendering: 'pixelated', maxWidth: '36px', maxHeight: '36px', objectFit: 'contain' }}
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

      {/* 角色詳細懸浮說明 Tooltip (零 Emoji，精簡公式) */}
      {showTooltip && hovered && (
        <div className="card-trait-tooltip" onClick={e => e.stopPropagation()}>
          {character.trait ? (
            <>
              <div style={{ color: '#ffcc00', fontWeight: 'bold', marginBottom: '3px', fontSize: '12px', letterSpacing: '0.5px' }}>
                {character.name} · 【{character.trait.badge}】
              </div>
              <div style={{ fontSize: '11px', color: '#e2e8f0', lineHeight: '1.5', letterSpacing: '0.2px' }}>
                {character.trait.description}
              </div>
            </>
          ) : (
            <>
              <div style={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '3px', fontSize: '12px', letterSpacing: '0.5px' }}>
                {character.name} · 【常規棋子】
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5', letterSpacing: '0.2px' }}>
                標準點數棋子 (LV.{character.level})，專注於正面點數對抗與奇偶陣營博弈，無特殊異能。
              </div>
            </>
          )}
          {character.lore && (
            <div
              className="card-trait-lore"
              style={{
                fontSize: '11px',
                color: '#94a3b8',
                marginTop: '6px',
                paddingTop: '4px',
                borderTop: '1px dashed #334155',
                lineHeight: '1.4',
                letterSpacing: '0.2px',
                fontStyle: 'normal'
              }}
            >
              {character.lore}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
