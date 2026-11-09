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
  allowCustomUpload?: boolean;
}

export const DeckBuilderModal: React.FC<DeckBuilderModalProps> = ({
  isOpen = true,
  onClose,
  onOpenShop,
  allowCustomUpload = false
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
        className="tutorial-box deck-builder-window"
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
        <div className="deck-builder-header">
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
              為 Lv.1 至 Lv.6 槽位挑選出戰棋子，同階特職自由替換，配置個人專屬出征卡組
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
              onOpenShop?.();
            }}
          >
            [ 招募新角色 (商城) → ]
          </button>
        </div>

        {/* 核心區：左側 6 槽位預覽 + 右側階級候選選擇 */}
        <div className="deck-builder-body">
          {/* 左側 / 行動版頂部：當前出征陣容 (6 牌固定梯隊) */}
          <div className="deck-builder-left-roster">
            <div style={{ fontSize: '12px', color: '#ffcc00', fontWeight: 'bold', marginBottom: '2px' }}>
              [ 當前出征軍備 (6 牌) ]
            </div>

            <div className="deck-roster-grid">
              {activeDeckChars.map(char => {
                const isSelected = selectedLevel === char.level;
                return (
                  <div
                    key={char.id}
                    onClick={() => {
                      soundManager.playSfx('click');
                      setSelectedLevel(char.level);
                    }}
                    className={`deck-slot-item ${isSelected ? 'selected' : ''}`}
                  >
                    <div style={{ fontSize: '10px', color: '#ffcc00', fontWeight: 'bold' }}>
                      LV.{char.level}
                    </div>
                    <div className="deck-mini-card">
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
                marginTop: 'auto'
              }}
              onClick={() => {
                soundManager.playSfx('click');
                resetActiveDeckToDefault();
              }}
            >
              [ 重設為經典 6 西洋棋 ]
            </button>
          </div>

          {/* 右側 / 行動版底部：選定等級 (selectedLevel) 候選角色替換清單 */}
          <div className="deck-builder-right-candidates">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '4px' }}>
              <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>
                [ Lv.{selectedLevel} 槽位候選棋手 ]
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                點擊即可裝備上陣或上傳自訂立繪
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {availableCandidates.map(candidate => {
                const isUnlocked = wallet.unlockedCharacterIds.includes(candidate.id);
                const isEquipped = wallet.activeDeck[candidate.level] === candidate.id;
                const hasCustomAvatar = Boolean(getCustomCharacterAvatar(candidate.id));

                return (
                  <div
                    key={candidate.id}
                    className={`candidate-item-card ${isEquipped ? 'equipped' : ''}`}
                    style={{ opacity: isUnlocked ? 1 : 0.6 }}
                  >
                    <div className="candidate-card-top-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                      {/* 卡牌縮圖 (使用專屬 .candidate-thumb-card 尺寸，零 scale 溢出) */}
                      <div className="candidate-thumb-card">
                        <CardView character={candidate} color="white" showTooltip={true} />
                      </div>

                      {/* 角色詳細介紹 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>
                            {candidate.name}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                            LV.{candidate.level}
                          </span>
                          {candidate.trait ? (
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
                          ) : (
                            <span
                              style={{
                                fontSize: '10px',
                                background: '#334155',
                                color: '#94a3b8',
                                fontWeight: 'bold',
                                padding: '1px 6px',
                                borderRadius: '2px'
                              }}
                            >
                              【常規】
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4', marginBottom: '4px' }}>
                          {candidate.trait ? candidate.trait.description : '[ 常規棋子 ] 純數字基礎戰力，專注於正面點數與奇偶賽局策略。'}
                        </div>

                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {candidate.lore}
                        </div>
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

                          {/* 僅個人/開發者模式下才顯示立繪上傳 */}
                          {allowCustomUpload && (
                            <>
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
