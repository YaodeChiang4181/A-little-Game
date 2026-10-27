import React, { useState, useEffect } from 'react';
import { soundManager, BGM_TRACKS, AudioSettings } from '../game/soundManager';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<AudioSettings>(soundManager.getSettings());

  useEffect(() => {
    // 訂閱設定變更
    const unsubscribe = soundManager.subscribe(newSettings => {
      setSettings(newSettings);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleBgm = () => {
    soundManager.ensureContext();
    soundManager.toggleBgm();
    soundManager.playSfx('click');
  };

  const handleToggleSfx = () => {
    soundManager.ensureContext();
    soundManager.toggleSfx();
    soundManager.playSfx('click');
  };

  const handleBgmVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    soundManager.setBgmVolume(val);
  };

  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    soundManager.setSfxVolume(val);
  };

  const handleSelectTrack = (trackId: string) => {
    soundManager.ensureContext();
    soundManager.selectTrack(trackId);
    soundManager.playSfx('click');
  };

  const handleTestSfx = () => {
    soundManager.ensureContext();
    soundManager.playSfx('traitTrigger');
  };

  return (
    <div className="tutorial-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div
        className="tutorial-box"
        style={{
          width: '92%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'rgba(15, 23, 42, 0.96)',
          border: '3px solid #00ffcc',
          boxShadow: '0 0 25px rgba(0, 255, 204, 0.25)',
          padding: '24px'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 標題列 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #334155', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ color: '#00ffcc', margin: 0, fontSize: '18px', letterSpacing: '1.5px', textShadow: '2px 2px 0 #000' }}>
              [ SETTINGS ]
            </h2>
          </div>
          <button
            className="btn"
            style={{ padding: '6px 14px', fontSize: '12px', background: '#334155' }}
            onClick={() => {
              soundManager.playSfx('click');
              onClose();
            }}
          >
            關閉
          </button>
        </div>

        {/* ================= 背景音樂 (BGM) 區域 ================= */}
        <div style={{ marginBottom: '24px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid #475569', borderRadius: '4px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff', letterSpacing: '0.5px' }}>
                [ 背景音樂 BGM ]
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                戰鬥配樂
              </div>
            </div>
            <button
              className="btn"
              style={{
                background: settings.bgmEnabled ? '#059669' : '#dc2626',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 'bold',
                minWidth: '70px'
              }}
              onClick={handleToggleBgm}
            >
              {settings.bgmEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 音量滑桿 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', opacity: settings.bgmEnabled ? 1 : 0.4 }}>
            <span style={{ fontSize: '12px', color: '#cbd5e1', minWidth: '40px' }}>音量</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.bgmVolume}
              onChange={handleBgmVolumeChange}
              disabled={!settings.bgmEnabled}
              style={{ flex: 1, accentColor: '#00ffcc', cursor: settings.bgmEnabled ? 'pointer' : 'not-allowed' }}
            />
            <span style={{ fontSize: '12px', color: '#00ffcc', fontFamily: 'monospace', minWidth: '35px', textAlign: 'right' }}>
              {Math.round(settings.bgmVolume * 100)}%
            </span>
          </div>

          {/* 曲目選擇 */}
          <div style={{ opacity: settings.bgmEnabled ? 1 : 0.4 }}>
            <div style={{ fontSize: '12px', color: '#ffcc00', fontWeight: 'bold', marginBottom: '8px' }}>
              【 配樂曲目庫 】
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {BGM_TRACKS.map(track => {
                const isSelected = settings.selectedTrack === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => settings.bgmEnabled && handleSelectTrack(track.id)}
                    style={{
                      background: isSelected ? 'rgba(0, 255, 204, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                      border: isSelected ? '2px solid #00ffcc' : '1px solid #334155',
                      borderRadius: '3px',
                      padding: '10px 12px',
                      cursor: settings.bgmEnabled ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: isSelected ? '#00ffcc' : '#fff', fontWeight: isSelected ? 'bold' : 'normal', fontSize: '13px' }}>
                          {isSelected ? '▶ ' : '   '}{track.name}
                        </span>
                        <span style={{ fontSize: '10px', background: isSelected ? '#0f766e' : '#334155', color: '#fff', padding: '1px 5px', borderRadius: '2px' }}>
                          {track.tag}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {track.bpm} BPM
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                        {track.description}
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ color: '#00ffcc', fontSize: '11px', fontWeight: 'bold', border: '1px solid #00ffcc', padding: '2px 6px', borderRadius: '2px' }}>
                        播放中
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================= 音效 (SFX) 區域 ================= */}
        <div style={{ marginBottom: '20px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid #475569', borderRadius: '4px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff', letterSpacing: '0.5px' }}>
                [ 戰鬥音效 SFX ]
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                出擊、交鋒、氣勢翻牌、特性觸發與扣血的音效
              </div>
            </div>
            <button
              className="btn"
              style={{
                background: settings.sfxEnabled ? '#059669' : '#dc2626',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 'bold',
                minWidth: '70px'
              }}
              onClick={handleToggleSfx}
            >
              {settings.sfxEnabled ? '已開啟 ON' : '已靜音 OFF'}
            </button>
          </div>

          {/* 音量滑桿 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', opacity: settings.sfxEnabled ? 1 : 0.4 }}>
            <span style={{ fontSize: '12px', color: '#cbd5e1', minWidth: '40px' }}>音量</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              onChange={handleSfxVolumeChange}
              disabled={!settings.sfxEnabled}
              style={{ flex: 1, accentColor: '#00ffcc', cursor: settings.sfxEnabled ? 'pointer' : 'not-allowed' }}
            />
            <span style={{ fontSize: '12px', color: '#00ffcc', fontFamily: 'monospace', minWidth: '35px', textAlign: 'right' }}>
              {Math.round(settings.sfxVolume * 100)}%
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn"
              disabled={!settings.sfxEnabled}
              style={{
                background: '#4338ca',
                padding: '6px 14px',
                fontSize: '11px',
                opacity: settings.sfxEnabled ? 1 : 0.4,
                cursor: settings.sfxEnabled ? 'pointer' : 'not-allowed'
              }}
              onClick={handleTestSfx}
            >
              [ 測試特性音效 ]
            </button>
          </div>
        </div>

        {/* 底部說明 */}
        <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', borderTop: '1px dashed #334155', paddingTop: '12px' }}>
          * 設定將自動保存於本機瀏覽器。配樂為純前端動態晶片合成
        </div>
      </div>
    </div>
  );
};
