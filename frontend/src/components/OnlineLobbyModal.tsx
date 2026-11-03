import React, { useState, useEffect } from 'react';
import { networkManager } from '../game/online/networkManager';
import { OnlineConnectionStatus } from '../game/online/types';
import { soundManager } from '../game/soundManager';

interface OnlineLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMatch: (roomCode: string, isHost: boolean) => void;
  initialRoomCode?: string;
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  isOpen,
  onClose,
  onStartMatch,
  initialRoomCode = ''
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [status, setStatus] = useState<OnlineConnectionStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // 處理 URL 帶入的預設房間號
  useEffect(() => {
    if (initialRoomCode) {
      setActiveTab('join');
      setInputCode(initialRoomCode);
    }
  }, [initialRoomCode]);

  useEffect(() => {
    if (!isOpen) {
      networkManager.cleanup();
      setStatus('idle');
      setStatusMessage('');
      setCopyFeedback(null);
      return;
    }

    networkManager.init({
      onStatusChange: (newStatus, msg) => {
        setStatus(newStatus);
        if (msg) setStatusMessage(msg);
        if (newStatus === 'connected') {
          soundManager.playSfx('startClash');
          setTimeout(() => {
            onStartMatch(networkManager.getRoomCode(), networkManager.getRole() === 'HOST');
          }, 800);
        }
      },
      onMessage: () => {},
      onPingUpdate: () => {},
      onError: (errText) => {
        setStatusMessage(errText);
      }
    });

    if (activeTab === 'create' && !roomCode) {
      handleCreateRoom();
    }
  }, [isOpen, activeTab]);

  const handleCreateRoom = async () => {
    try {
      soundManager.playSfx('click');
      const code = await networkManager.createRoom();
      setRoomCode(code);
    } catch (err) {
      console.error('Create room failed', err);
    }
  };

  const handleJoinRoom = async () => {
    const code = inputCode.trim();
    if (!code) {
      setStatusMessage('請輸入有效的 6 位房間代碼');
      return;
    }
    soundManager.playSfx('click');
    try {
      await networkManager.joinRoom(code);
    } catch (err) {
      console.error('Join room failed', err);
    }
  };

  const copyText = async (text: string, label: string) => {
    soundManager.playSfx('click');
    let copied = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        copied = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {}
    }

    if (copied) {
      setCopyFeedback(label);
      setTimeout(() => setCopyFeedback(null), 2200);
    } else {
      setCopyFeedback('複製失敗，請手動複製');
      setTimeout(() => setCopyFeedback(null), 2200);
    }
  };

  if (!isOpen) return null;

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?room=${roomCode || inputCode}`
    : '';

  return (
    <div className="overlay" style={{ zIndex: 1200 }}>
      <div
        style={{
          background: '#0b0f19',
          border: '4px solid #fff',
          boxShadow: '8px 8px 0 #000',
          padding: '24px',
          width: '92%',
          maxWidth: '520px',
          color: '#fff',
          position: 'relative'
        }}
      >
        {/* 頂部標題與關閉按鈕 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(16px, 4vw, 20px)', color: '#00ffcc', letterSpacing: '1px' }}>
            [ 雲端連機對戰大廳 ]
          </h2>
          <button
            onClick={() => {
              soundManager.playSfx('click');
              networkManager.cleanup();
              onClose();
            }}
            style={{
              background: 'transparent',
              border: '2px solid #64748b',
              color: '#94a3b8',
              padding: '4px 10px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}
          >
            ✕ 關閉
          </button>
        </div>

        {/* 分頁按鈕群 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            className="btn"
            style={{
              flex: 1,
              background: activeTab === 'create' ? '#0f766e' : '#1e293b',
              border: activeTab === 'create' ? '2px solid #00ffcc' : '2px solid #334155',
              padding: '10px 0',
              fontSize: '14px'
            }}
            onClick={() => {
              soundManager.playSfx('click');
              setActiveTab('create');
              if (!roomCode) handleCreateRoom();
            }}
          >
            [ 創建房間 · 房主 ]
          </button>
          <button
            className="btn"
            style={{
              flex: 1,
              background: activeTab === 'join' ? '#dc2626' : '#1e293b',
              border: activeTab === 'join' ? '2px solid #ff4747' : '2px solid #334155',
              padding: '10px 0',
              fontSize: '14px'
            }}
            onClick={() => {
              soundManager.playSfx('click');
              setActiveTab('join');
              networkManager.cleanup();
              setStatus('idle');
              setStatusMessage('');
            }}
          >
            [ 加入房間 · 挑戰者 ]
          </button>
        </div>

        {/* 內容區：創建房間 */}
        {activeTab === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>
              將此 6 位房間代碼或邀請連結發送給對手，即可跨裝置線上對戰！
            </div>

            {/* 6 位房間代碼展示卡 */}
            <div
              style={{
                background: '#020617',
                border: '3px solid #00ffcc',
                padding: '18px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                position: 'relative'
              }}
            >
              <span style={{ fontSize: '12px', color: '#64748b', letterSpacing: '1px' }}>
                ROOM CODE
              </span>
              <span
                style={{
                  fontSize: 'clamp(2rem, 7vw, 2.8rem)',
                  fontWeight: 'bold',
                  letterSpacing: '8px',
                  color: '#ffcc00',
                  textShadow: '3px 3px 0 #000',
                  fontFamily: 'monospace'
                }}
              >
                {roomCode || '------'}
              </span>

              {/* 複製按鈕群 */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  className="btn"
                  style={{ fontSize: '12px', padding: '6px 14px', background: '#334155' }}
                  onClick={() => copyText(roomCode, '代碼已複製！')}
                  disabled={!roomCode}
                >
                  複製代碼
                </button>
                <button
                  className="btn"
                  style={{ fontSize: '12px', padding: '6px 14px', background: '#0284c7' }}
                  onClick={() => copyText(inviteUrl, '邀請連結已複製！')}
                  disabled={!roomCode}
                >
                  複製邀請連結
                </button>
              </div>

              {copyFeedback && (
                <div style={{ color: '#00ffcc', fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>
                  ✓ {copyFeedback}
                </div>
              )}
            </div>

            {/* 等待狀態與雷達動畫 */}
            <div
              style={{
                background: 'rgba(15,23,42,0.6)',
                border: '2px dashed #334155',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: status === 'connected' ? '#00ffcc' : '#f59e0b',
                  boxShadow: status === 'connected' ? '0 0 10px #00ffcc' : '0 0 10px #f59e0b',
                  animation: 'pulse 1.2s infinite'
                }}
              />
              <span style={{ fontSize: '13px', color: status === 'connected' ? '#00ffcc' : '#cbd5e1' }}>
                {statusMessage || '等待挑戰者加入房間...'}
              </span>
            </div>

            <div style={{ fontSize: '11px', color: '#64748b' }}>
              提示：房主為初始 [ ODD 奇數 ] 陣營，挑戰者為初始 [ EVEN 偶數 ] 陣營。每局結束自動輪換！
            </div>
          </div>
        )}

        {/* 內容區：加入房間 */}
        {activeTab === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>
              請輸入房主提供的 6 位數字房間代碼：
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                maxLength={6}
                value={inputCode}
                placeholder="6 位代碼 (例如: 839201)"
                onChange={(e) => setInputCode(e.target.value.replace(/[^0-9]/g, ''))}
                style={{
                  flex: 1,
                  background: '#020617',
                  border: '3px solid #ff4747',
                  color: '#ffcc00',
                  fontSize: '20px',
                  fontFamily: 'monospace',
                  padding: '10px 14px',
                  textAlign: 'center',
                  letterSpacing: '4px',
                  outline: 'none'
                }}
              />
              <button
                className="btn"
                style={{ background: '#334155', padding: '0 14px', fontSize: '13px' }}
                onClick={async () => {
                  try {
                    if (navigator.clipboard?.readText) {
                      const text = await navigator.clipboard.readText();
                      const digits = text.replace(/[^0-9]/g, '').slice(0, 6);
                      if (digits) setInputCode(digits);
                    }
                  } catch {}
                }}
              >
                貼上
              </button>
            </div>

            <button
              className="btn engage"
              style={{
                width: '100%',
                padding: '12px 0',
                fontSize: '16px',
                background: '#dc2626'
              }}
              onClick={handleJoinRoom}
              disabled={inputCode.length !== 6 || status === 'connecting'}
            >
              {status === 'connecting' ? '正在連線房間...' : '連線加入對決！'}
            </button>

            {statusMessage && (
              <div
                style={{
                  fontSize: '13px',
                  color: status === 'error' ? '#ff4747' : '#00ffcc',
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '8px',
                  border: '1px solid #334155'
                }}
              >
                {statusMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
