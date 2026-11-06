import React, { useState, useEffect, useRef } from 'react';
import { CardView } from './CardView';
import { Character } from '../game/types';
import {
  ALL_CHARACTERS,
  getCharactersByLevel
} from '../game/registry/characters';
import {
  getWallet,
  subscribeWallet,
  setActiveDeckSlot,
  resetActiveDeckToDefault,
  setCustomCharacterAvatar,
  clearCustomCharacterAvatar,
  getCustomCharacterAvatar
} from '../game/economy/wallet';
import { soundManager } from '../game/soundManager';

interface DeckBuilderModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onOpenShop?: () => void;
}

export const DeckBuilderModal: React.FC<DeckBuilderModalProps> = ({
  isOpen = true,
  onClose,
  onOpenShop
}) => {
  if (!isOpen) return null;
  const [wallet, setWallet] = useState(getWallet());
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [uploadTargetChar, setUploadTargetChar] = useState<Character | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeWallet(updated => {
      setWallet(updated);
    });
  }, []);

  // 當前等級的所有候選角色
  const availableCandidates = getCharactersByLevel(selectedLevel);

  // 取得目前出征陣容的 6 顆棋子
  const activeDeckChars: Character[] = [1, 2, 3, 4, 5, 6].map(lv => {
    const charId = wallet.activeDeck[lv];
    const found = ALL_CHARACTERS.find(c => c.id === charId);
    return found || ALL_CHARACTERS.find(c => c.level === lv)!;
  });

  const handleEquip = (char: Character) => {
    soundManager.ensureContext();
    soundManager.playSfx('cardDeploy');
    setActiveDeckSlot(char.level, char.id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetChar) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomCharacterAvatar(uploadTargetChar.id, dataUrl);
      soundManager.playSfx('coin');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const triggerUpload = (char: Character) => {
    setUploadTargetChar(char);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="tutorial-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div
        className="tutorial-box"
        style={{
          width: '95%',
          maxWidth: '860px',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 20px',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 隱藏式本機檔案上傳器 */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          onChange={handleFileChange}
        />

        {/* 頂部標題與說明 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid #334155',
            paddingBottom: '14px',
            marginBottom: '16px'
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: 'var(--color-cyan)',
                fontSize: '20px',
                letterSpacing: '1px',
                textShadow: '2px 2px 0 #000'
              }}
            >
              [ 軍備庫 · 出征陣容編成 ]
            </h2>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
              為 Lv.1 至 Lv.6 槽位挑選出戰棋子，支援自由上傳本地像素圖片換裝
            </div>
          </div>

          <button
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              background: '#d97706',
              borderColor: '#fbbf24',
              color: '#fff'
            }}
            onClick={() => {
              soundManager.playSfx('click');
              onClose();
              onOpenShop();
            }}
          >
            [ 招募新角色 (商城) → ]
          </button>
        </div>

        {/* 核心區：左側 6 槽位預覽 + 右側階級候選選擇 */}
        <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* 左側：當前出征陣容 (6 牌固定梯隊) */}
          <div
            style={{
              width: '280px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '2px solid #334155',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ fontSize: '12px', color: '#ffcc00', fontWeight: 'bold', marginBottom: '2px' }}>
              [ 當前出征軍備 (6 牌) ]
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                flex: 1
              }}
            >
              {activeDeckChars.map(char => {
                const isSelected = selectedLevel === char.level;
                return (
                  <div
                    key={char.id}
                    onClick={() => {
                      soundManager.playSfx('click');
                      setSelectedLevel(char.level);
                    }}
                    style={{
                      cursor: 'pointer',
                      border: `2px solid ${isSelected ? 'var(--color-cyan)' : '#334155'}`,
                      background: isSelected ? 'rgba(0, 255, 204, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      borderRadius: '2px',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: '10px', color: '#ffcc00', fontWeight: 'bold' }}>
                      LV.{char.level}
                    </div>
                    <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center', height: '80px' }}>
                      <CardView character={char} color="white" showTooltip={false} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}>
                      {char.name}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              className="btn"
              style={{
                width: '100%',
                padding: '6px 0',
                fontSize: '11px',
                background: '#475569',
                marginTop: '4px'
              }}
              onClick={() => {
                soundManager.playSfx('click');
                resetActiveDeckToDefault();
              }}
            >
              [ 重設為經典 6 西洋棋 ]
            </button>
          </div>

          {/* 右側：選定等級 (selectedLevel) 候選角色替換清單 */}
          <div
            style={{
              flex: 1,
              background: 'rgba(15, 23, 42, 0.85)',
              border: '2px solid #334155',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>
                [ Lv.{selectedLevel} 槽位候選棋手 ]
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                點擊即可裝備上陣或上傳自訂立繪
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {availableCandidates.map(candidate => {
                const isUnlocked = wallet.unlockedCharacterIds.includes(candidate.id);
                const isEquipped = wallet.activeDeck[candidate.level] === candidate.id;
                const hasCustomAvatar = Boolean(getCustomCharacterAvatar(candidate.id));

                return (
                  <div
                    key={candidate.id}
                    style={{
                      border: `2px solid ${isEquipped ? 'var(--color-cyan)' : isUnlocked ? '#475569' : '#334155'}`,
                      background: isEquipped ? 'rgba(0, 255, 204, 0.05)' : 'rgba(0, 0, 0, 0.4)',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      opacity: isUnlocked ? 1 : 0.6
                    }}
                  >
                    {/* 卡牌縮圖 */}
                    <div style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}>
                      <CardView character={candidate} color="white" showTooltip={true} />
                    </div>

                    {/* 角色詳細介紹 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                          {candidate.name}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                          LV.{candidate.level}
                        </span>
                        {candidate.trait && (
                          <span
                            style={{
                              fontSize: '10px',
                              background: candidate.themeColor || '#ffcc00',
                              color: '#000',
                              fontWeight: 'bold',
                              padding: '1px 6px',
                              borderRadius: '2px'
                            }}
                          >
                            【{candidate.trait.badge}】
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4', marginBottom: '4px' }}>
                        {candidate.trait?.description}
                      </div>

                      <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'normal' }}>
                        {candidate.lore}
                      </div>
                    </div>

                    {/* 操作按鈕群：裝備、換圖、重設 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '130px' }}>
                      {isUnlocked ? (
                        <>
                          {isEquipped ? (
                            <div
                              style={{
                                padding: '6px 0',
                                textAlign: 'center',
                                fontSize: '12px',
                                color: 'var(--color-cyan)',
                                border: '1px solid var(--color-cyan)',
                                background: 'rgba(0, 255, 204, 0.1)',
                                fontWeight: 'bold'
                              }}
                            >
                              [ 當前出征中 ]
                            </div>
                          ) : (
                            <button
                              className="btn"
                              style={{ padding: '6px 0', fontSize: '12px', background: '#0284c7' }}
                              onClick={() => handleEquip(candidate)}
                            >
                              [ 裝備出征 ]
                            </button>
                          )}

                          {/* 本機上傳圖片替換立繪 */}
                          <button
                            className="btn"
                            style={{
                              padding: '5px 0',
                              fontSize: '11px',
                              background: '#334155',
                              borderColor: '#64748b'
                            }}
                            onClick={() => triggerUpload(candidate)}
                          >
                            {hasCustomAvatar ? '[ 更換自訂立繪 ]' : '[ 上傳像素立繪 ]'}
                          </button>

                          {hasCustomAvatar && (
                            <button
                              className="btn"
                              style={{
                                padding: '3px 0',
                                fontSize: '10px',
                                background: 'transparent',
                                borderColor: '#ef4444',
                                color: '#f87171'
                              }}
                              onClick={() => {
                                soundManager.playSfx('click');
                                clearCustomCharacterAvatar(candidate.id);
                              }}
                            >
                              [ 恢復官方像素 ]
                            </button>
                          )}
                        </>
                      ) : (
                        <div
                          style={{
                            padding: '8px 0',
                            textAlign: 'center',
                            fontSize: '11px',
                            color: '#64748b',
                            border: '1px dashed #334155'
                          }}
                        >
                          [ 尚未於商城解鎖 ]
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 底部關閉按鈕 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            borderTop: '2px solid #334155',
            paddingTop: '14px',
            marginTop: '14px'
          }}
        >
          <button
            className="btn"
            style={{
              padding: '8px 24px',
              fontSize: '13px',
              background: '#059669',
              borderColor: '#10b981'
            }}
            onClick={() => {
              soundManager.playSfx('click');
              onClose();
            }}
          >
            [ 完成編成並保存 ]
          </button>
        </div>
      </div>
    </div>
  );
};
