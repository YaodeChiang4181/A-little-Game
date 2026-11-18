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
  isUnselectedHand?: boolean; // 尚未佈署的手牌
  isRevealed?: boolean; // 是否翻開揭示 (敵方暗牌/揭曉動畫)
  isLiftingOff?: boolean; // L4 手牌起跳躍離動畫
  isDropIn?: boolean; // L1 戰場破空砸入彈跳動畫
  isRecalling?: boolean; // 戰場卡牌撤回躍出動畫
  isViolatedConstraint?: boolean; // 中路禁令違規 (有效等級視為 0)
  effectiveLevel?: number; // 經結算或特性加成後的有效等級
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
  isLiftingOff = false,
  isDropIn = false,
  isRecalling = false,
  isViolatedConstraint = false,
  effectiveLevel,
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

  const liftClass = isLiftingOff ? 'card-lift-off ' : '';
  const dropClass = isDropIn ? 'card-drop-in ' : '';
  const recallClass = isRecalling ? 'card-recall-out ' : '';

  return (
    <div
      className={`card ${color}-piece ${animClass}${liftClass}${dropClass}${recallClass}${isUnselectedHand ? 'unselected-hand-card' : ''}`.trim()}
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
            color: isViolatedConstraint ? '#ef4444' : color === 'white' ? '#475569' : '#94a3b8',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            textDecoration: isViolatedConstraint ? 'line-through' : 'none'
          }}
        >
          LV.{character.base_level || character.level}
        </span>
        {isViolatedConstraint ? (
          <span
            style={{
              fontSize: '9px',
              padding: '1px 3px',
              borderRadius: '0px',
              background: '#991b1b',
              color: '#fecaca',
              fontWeight: 'bold',
              letterSpacing: '0.5px'
            }}
          >
            [0分]
          </span>
        ) : effectiveLevel !== undefined && effectiveLevel !== (character.base_level || character.level) ? (
          <span
            style={{
              fontSize: '9px',
              padding: '1px 3px',
              borderRadius: '0px',
              background: '#1e3a8a',
              color: '#60a5fa',
              fontWeight: 'bold',
              letterSpacing: '0.5px'
            }}
          >
            ▶{effectiveLevel}
          </span>
        ) : null}
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
