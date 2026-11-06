import React, { useState, useEffect } from 'react';
import { CardView } from './CardView';
import { getShopCharacters } from '../game/registry/characters';
import { Character } from '../game/types';
import { getWallet, subscribeWallet, unlockCharacter } from '../game/economy/wallet';
import { soundManager } from '../game/soundManager';
import { PixelCoinIcon } from './PixelIcons';

interface ShopModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onOpenDeckBuilder?: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen = true,
  onClose,
  onOpenDeckBuilder
}) => {
  if (!isOpen) return null;
  const [wallet, setWallet] = useState(getWallet());
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    return subscribeWallet(updated => {
      setWallet(updated);
    });
  }, []);

  const shopCharacters = getShopCharacters();

  const handlePurchase = (char: Character) => {
    if (!char.price) return;
    soundManager.ensureContext();

    if (wallet.gold < char.price) {
      soundManager.playSfx('click');
      return;
    }

    const ok = unlockCharacter(char.id, char.price);
    if (ok) {
      soundManager.playSfx('coin');
      setSuccessNotice(`成功徵召【${char.name}】！已加入軍備庫，可立即配置出征。`);
      setTimeout(() => setSuccessNotice(null), 4000);
    }
  };

  return (
    <div className="tutorial-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div
        className="tutorial-box deck-builder-window"
        onClick={e => e.stopPropagation()}
      >
        {/* 頂部標題與金幣餘額 HUD */}
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
                color: 'var(--color-gold)',
                fontSize: '20px',
                letterSpacing: '1px',
                textShadow: '2px 2px 0 #000'
              }}
            >
              [ 像素商城 · 戰備棋手招募 ]
            </h2>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
              招募獨具異能的西洋棋手，同階自由替換，打造個人專屬出征卡組
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0, 0, 0, 0.6)',
              border: '2px solid #ffcc00',
              padding: '6px 14px',
              borderRadius: '4px',
              boxShadow: '2px 2px 0 #000'
            }}
          >
            <PixelCoinIcon size={16} />
            <span
              style={{
                color: '#ffcc00',
                fontWeight: 'bold',
                fontSize: '16px',
                fontFamily: 'monospace',
                letterSpacing: '1px'
              }}
            >
              {wallet.gold.toLocaleString()} G
            </span>
          </div>
        </div>

        {/* 購買成功提示橫幅 */}
        {successNotice && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.2)',
              border: '2px solid #10b981',
              color: '#34d399',
              padding: '8px 12px',
              fontSize: '12px',
              textAlign: 'center',
              marginBottom: '12px',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {successNotice}
          </div>
        )}

        {/* 角色商品網格展示區 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '6px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '14px',
            marginBottom: '16px'
          }}
        >
          {shopCharacters.map(char => {
            const isOwned = wallet.unlockedCharacterIds.includes(char.id);
            const canAfford = wallet.gold >= (char.price || 0);

            return (
              <div
                key={char.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: `2px solid ${isOwned ? '#334155' : char.themeColor || '#64748b'}`,
                  boxShadow: '3px 3px 0 #000',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  position: 'relative'
                }}
              >
                {/* 角色卡片與基礎資訊 */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="shop-thumb-card">
                    <CardView character={char} color="white" showTooltip={true} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>
                        {char.name}
                      </span>
                      <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                        LV.{char.level}
                      </span>
                    </div>

                    {char.trait && (
                      <span
                        style={{
                          fontSize: '9px',
                          background: char.themeColor || '#ffcc00',
                          color: '#000',
                          fontWeight: 'bold',
                          padding: '1px 5px',
                          borderRadius: '2px'
                        }}
                      >
                        【{char.trait.badge}】
                      </span>
                    )}

                    <div
                      style={{
                        fontSize: '10px',
                        color: '#cbd5e1',
                        marginTop: '6px',
                        lineHeight: '1.4'
                      }}
                    >
                      {char.trait?.description}
                    </div>
                  </div>
                </div>

                {/* 典故簡述 */}
                <div
                  style={{
                    fontSize: '10px',
                    color: '#94a3b8',
                    borderTop: '1px dashed #334155',
                    paddingTop: '6px',
                    lineHeight: '1.4'
                  }}
                >
                  {char.lore}
                </div>

                {/* 購買/徵召按鈕 */}
                <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                  {isOwned ? (
                    <div
                      style={{
                        width: '100%',
                        padding: '6px 0',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#10b981',
                        border: '1px solid #059669',
                        background: 'rgba(16, 185, 129, 0.1)',
                        fontWeight: 'bold'
                      }}
                    >
                      [ 已徵召入伍 ]
                    </div>
                  ) : (
                    <button
                      className="btn"
                      disabled={!canAfford}
                      onClick={() => handlePurchase(char)}
                      style={{
                        width: '100%',
                        padding: '7px 0',
                        fontSize: '13px',
                        background: canAfford ? '#d97706' : '#334155',
                        borderColor: canAfford ? '#fbbf24' : '#475569',
                        color: canAfford ? '#fff' : '#64748b',
                        cursor: canAfford ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {canAfford ? `[ 招募 ${char.price} G ]` : `[ 金幣不足 (${char.price} G) ]`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部導覽按鈕列 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '2px solid #334155',
            paddingTop: '14px'
          }}
        >
          <button
            className="btn"
            style={{
              padding: '8px 18px',
              fontSize: '13px',
              background: '#0284c7',
              borderColor: '#38bdf8'
            }}
            onClick={() => {
              soundManager.playSfx('click');
              onClose();
              onOpenDeckBuilder?.();
            }}
          >
            [ 前往軍備庫編成陣容 → ]
          </button>

          <button
            className="btn"
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              background: '#475569'
            }}
            onClick={() => {
              soundManager.playSfx('click');
              onClose();
            }}
          >
            [ 離開商城 ]
          </button>
        </div>
      </div>
    </div>
  );
};
