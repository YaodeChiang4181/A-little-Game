/**
 * 氣勢連鎖奇偶戰 - 復古 8-Bit 晶片音樂 (Chiptune) 與音效合成引擎
 * 完全基於 Web Audio API 純代碼合成，0 額外依賴、0 流量下載、秒開且支援完美無縫循環
 */

export type SfxType =
  | 'click'
  | 'cardSelect'
  | 'cardDeploy'
  | 'cardRecall'
  | 'deployReady'
  | 'startClash'
  | 'enemyDeal'
  | 'cardReveal'
  | 'traitTrigger'
  | 'hitDamage'
  | 'victory'
  | 'defeat';

export interface BgmTrack {
  id: string;
  name: string;
  bpm: number;
  description: string;
  tag: string;
}

export const BGM_TRACKS: BgmTrack[] = [
  {
    id: 'rush',
    name: '疾馳交鋒 (Pixel Rush)',
    bpm: 136,
    description: '輕快明亮的高速琶音與律動鼓點，營造緊湊刺激的博弈氛圍',
    tag: '輕快戰鬥'
  },
  {
    id: 'parity',
    name: '賽局博弈 (Tactical Parity)',
    bpm: 126,
    description: '富有節奏感與策略思考韻味的方波和弦，適合深思熟慮的奇偶推演',
    tag: '策略律動'
  },
  {
    id: 'royal',
    name: '王城決戰 (Royal Arcade)',
    bpm: 142,
    description: '經典紅白機熱血街機進行曲風格，昂揚熱烈，勝利渴望拉滿',
    tag: '熱血街機'
  }
];

export interface AudioSettings {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  bgmVolume: number; // 0 ~ 1
  sfxVolume: number; // 0 ~ 1
  selectedTrack: string; // track id
}

const STORAGE_KEY = 'parity_battle_audio_settings_v1';

const DEFAULT_SETTINGS: AudioSettings = {
  bgmEnabled: true,
  sfxEnabled: true,
  bgmVolume: 0.45,
  sfxVolume: 0.65,
  selectedTrack: 'rush'
};

// 常用音高頻率表 (Hz)
const N: Record<string, number> = {
  REST: 0,
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, Cs4: 277.18, D4: 293.66, Ds4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Gs4: 415.30, A4: 440.00, As4: 466.16, B4: 493.88,
  C5: 523.25, Cs5: 554.37, D5: 587.33, Ds5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, Gs5: 830.61, A5: 880.00, As5: 932.33, B5: 987.77,
  C6: 1046.50
};

class SoundManager {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings = DEFAULT_SETTINGS;
  private listeners: ((s: AudioSettings) => void)[] = [];

  // BGM 排程狀態
  private bgmMasterGain: GainNode | null = null;
  private isBgmPlaying: boolean = false;
  private schedulerTimer: number | null = null;
  private currentStep: number = 0;
  private nextStepTime: number = 0;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      // ignore
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach(fn => fn({ ...this.settings }));
  }

  public subscribe(fn: (s: AudioSettings) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  /**
   * 確保 AudioContext 初始化並處於 running 狀態
   */
  public async ensureContext(): Promise<AudioContext | null> {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return null;
      this.ctx = new AudioCtxClass();
      this.createNoiseBuffer();
    }

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        // user haven't interacted yet
      }
    }

    return this.ctx;
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1; // 1 秒白噪聲
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  // ==========================================
  // 設定變更介面
  // ==========================================

  public toggleBgm(enabled?: boolean) {
    const nextVal = enabled !== undefined ? enabled : !this.settings.bgmEnabled;
    this.settings.bgmEnabled = nextVal;
    this.saveSettings();

    if (nextVal) {
      this.startBgm();
    } else {
      this.stopBgm();
    }
  }

  public setBgmVolume(volume: number) {
    this.settings.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgmMasterGain && this.ctx) {
      this.bgmMasterGain.gain.setValueAtTime(this.settings.bgmVolume, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  public toggleSfx(enabled?: boolean) {
    this.settings.sfxEnabled = enabled !== undefined ? enabled : !this.settings.sfxEnabled;
    this.saveSettings();
  }

  public setSfxVolume(volume: number) {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  public selectTrack(trackId: string) {
    if (this.settings.selectedTrack === trackId) return;
    this.settings.selectedTrack = trackId;
    this.saveSettings();

    if (this.settings.bgmEnabled && this.isBgmPlaying) {
      // 快速換曲：重置步驟計數器
      this.currentStep = 0;
      if (this.ctx) {
        this.nextStepTime = this.ctx.currentTime + 0.05;
      }
    }
  }

  // ==========================================
  // 復古 8-Bit 音效合成 (SFX Engine)
  // ==========================================

  public async playSfx(type: SfxType) {
    if (!this.settings.sfxEnabled) return;
    const ctx = await this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.settings.sfxVolume, t);
    masterGain.connect(ctx.destination);

    switch (type) {
      case 'click': {
        // 短促乾脆的 UI 點擊音
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.045);
        break;
      }

      case 'cardSelect': {
        // 選取卡片：輕快微揚音調
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.085);
        break;
      }

      case 'cardDeploy': {
        // 卡牌佈署落子：低音敲擊 + 脆片鎖定感
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.13);
        break;
      }

      case 'cardRecall': {
        // 撤回卡牌：滑音返回
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.09);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.095);
        break;
      }

      case 'deployReady': {
        // 3 張滿編備戰：雙音琶音通知
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = t + idx * 0.06;
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.18, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(start);
          osc.stop(start + 0.11);
        });
        break;
      }

      case 'startClash': {
        // 出征決鬥！激昂戰鼓衝擊
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.35);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.36);
        break;
      }

      case 'enemyDeal': {
        // 敵方卡牌飛入：破空呼嘯聲
        if (this.noiseBuffer) {
          const noise = ctx.createBufferSource();
          noise.buffer = this.noiseBuffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1200, t);
          filter.frequency.exponentialRampToValueAtTime(300, t + 0.15);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          noise.start(t);
          noise.stop(t + 0.16);
        }
        break;
      }

      case 'cardReveal': {
        // 格線翻牌對決：金屬碰撞與差值鎖定
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.11);
        break;
      }

      case 'traitTrigger': {
        // 特性發動（如逆襲、威壓）：炫麗的像素高音琶音
        [587.33, 739.99, 880, 1174.66].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = t + idx * 0.05;
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.22, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(start);
          osc.stop(start + 0.16);
        });
        break;
      }

      case 'hitDamage': {
        // 奇偶結算命中扣血：重型低音轟鳴
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.31);
        break;
      }

      case 'victory': {
        // 勝利凱旋號角
        const fanfareNotes = [N.C4, N.E4, N.G4, N.C5, N.G4, N.C5];
        const times = [0, 0.12, 0.24, 0.36, 0.52, 0.68];
        const durs = [0.1, 0.1, 0.1, 0.14, 0.14, 0.45];
        fanfareNotes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = t + times[idx];
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.35, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + durs[idx]);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(start);
          osc.stop(start + durs[idx] + 0.01);
        });
        break;
      }

      case 'defeat': {
        // 戰敗嘆息降調
        const defeatNotes = [N.G4, N.E4, N.Ds4, N.C4];
        defeatNotes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = t + idx * 0.18;
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.3, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(start);
          osc.stop(start + 0.23);
        });
        break;
      }
    }
  }

  // ==========================================
  // 背景音樂音軌合成 (Procedural Chiptune Sequencer)
  // ==========================================

  public async startBgm() {
    if (!this.settings.bgmEnabled || this.isBgmPlaying) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    if (!this.bgmMasterGain) {
      this.bgmMasterGain = ctx.createGain();
      this.bgmMasterGain.gain.setValueAtTime(this.settings.bgmVolume, ctx.currentTime);
      this.bgmMasterGain.connect(ctx.destination);
    }

    this.isBgmPlaying = true;
    this.currentStep = 0;
    this.nextStepTime = ctx.currentTime + 0.05;

    // 啟動步進音訊調度循環 (Lookahead Scheduler)
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
    }
    this.schedulerTimer = window.setInterval(() => {
      this.scheduleBgmNotes();
    }, 40);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private scheduleBgmNotes() {
    if (!this.ctx || !this.isBgmPlaying || !this.bgmMasterGain) return;

    const track = BGM_TRACKS.find(t => t.id === this.settings.selectedTrack) || BGM_TRACKS[0];
    const secondsPerBeat = 60.0 / track.bpm;
    const stepDuration = secondsPerBeat / 4; // 16 分音符為 1 step

    // 排程接下來 0.15 秒內的音符
    while (this.nextStepTime < this.ctx.currentTime + 0.15) {
      this.playStep(track.id, this.currentStep, this.nextStepTime, stepDuration);
      this.nextStepTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 64; // 64 步 (4 小節) 循環
    }
  }

  /**
   * 根據曲目與當前步驟播放對應聲道 (Lead, Bass, Percussion)
   */
  private playStep(trackId: string, step: number, time: number, stepDur: number) {
    if (!this.ctx || !this.bgmMasterGain) return;

    if (trackId === 'rush') {
      this.playRushTrackStep(step, time, stepDur);
    } else if (trackId === 'parity') {
      this.playParityTrackStep(step, time, stepDur);
    } else {
      this.playRoyalTrackStep(step, time, stepDur);
    }
  }

  // --- 曲目 1: 疾馳交鋒 (Pixel Rush) ---
  private playRushTrackStep(step: number, time: number, stepDur: number) {
    if (!this.ctx || !this.bgmMasterGain) return;

    // 鼓點 (8-bit Drums)
    const beatInBar = step % 16;
    if (beatInBar === 0 || beatInBar === 8) {
      this.synthKick(time, 0.4);
    }
    if (beatInBar === 4 || beatInBar === 12) {
      this.synthSnare(time, 0.28);
    }
    if (step % 2 === 0) {
      this.synthHiHat(time, 0.08);
    }

    // 貝斯 (Bass: Triangle)
    const bar = Math.floor(step / 16);
    const bassRoot = bar === 0 ? N.A2 : bar === 1 ? N.F2 : bar === 2 ? N.C3 : N.G2;
    if (step % 4 === 0 || step % 4 === 2) {
      this.synthNote(bassRoot, 'triangle', time, stepDur * 1.5, 0.35);
    }

    // 主旋律 (Lead: Square) - 輕快高速琶音
    const leadPatterns: number[] = [
      // Bar 1 (A minor)
      N.A4, N.C5, N.E5, N.A5, N.G5, N.E5, N.C5, N.E5,
      N.A4, N.C5, N.E5, N.G5, N.A5, N.B5, N.C6, N.B5,
      // Bar 2 (F major)
      N.F4, N.A4, N.C5, N.F5, N.E5, N.C5, N.A4, N.C5,
      N.F4, N.A4, N.C5, N.E5, N.F5, N.G5, N.A5, N.G5,
      // Bar 3 (C major)
      N.E4, N.G4, N.C5, N.E5, N.D5, N.B4, N.G4, N.B4,
      N.C5, N.E5, N.G5, N.C6, N.B5, N.G5, N.E5, N.D5,
      // Bar 4 (G major / Turnaround)
      N.D4, N.G4, N.B4, N.D5, N.C5, N.A4, N.Fs4, N.A4,
      N.B4, N.D5, N.G5, N.B5, N.A5, N.G5, N.E5, N.D5
    ];

    const note = leadPatterns[step % 64];
    if (note && note > 0) {
      this.synthNote(note, 'square', time, stepDur * 0.8, 0.16);
    }
  }

  // --- 曲目 2: 賽局博弈 (Tactical Parity) ---
  private playParityTrackStep(step: number, time: number, stepDur: number) {
    if (!this.ctx || !this.bgmMasterGain) return;

    // 充滿彈性的 Funky 律動
    const beatInBar = step % 16;
    if (beatInBar === 0 || beatInBar === 6 || beatInBar === 10) {
      this.synthKick(time, 0.38);
    }
    if (beatInBar === 4 || beatInBar === 12) {
      this.synthSnare(time, 0.25);
    }
    if (step % 2 === 1) {
      this.synthHiHat(time, 0.09);
    }

    // 貝斯 (跳動感)
    const bar = Math.floor(step / 16);
    const bassPatterns = [
      [N.D2, N.REST, N.D2, N.REST, N.F2, N.REST, N.G2, N.REST, N.D2, N.REST, N.C2, N.REST, N.D2, N.REST, N.REST, N.REST],
      [N.G2, N.REST, N.G2, N.REST, N.As2, N.REST, N.C3, N.REST, N.G2, N.REST, N.F2, N.REST, N.G2, N.REST, N.REST, N.REST],
      [N.As2, N.REST, N.As2, N.REST, N.C3, N.REST, N.D3, N.REST, N.As2, N.REST, N.A2, N.REST, N.G2, N.REST, N.REST, N.REST],
      [N.A2, N.REST, N.Cs3, N.REST, N.E3, N.REST, N.G3, N.REST, N.A2, N.REST, N.A2, N.REST, N.C3, N.REST, N.Cs3, N.REST]
    ];
    const bassNote = bassPatterns[bar % 4][beatInBar];
    if (bassNote && bassNote > 0) {
      this.synthNote(bassNote, 'triangle', time, stepDur * 1.2, 0.38);
    }

    // 主旋律 (思考博弈風)
    if (step % 4 === 0) {
      const leadNotes = [
        N.D4, N.F4, N.A4, N.D5, N.C5, N.A4, N.F4, N.G4,
        N.G4, N.As4, N.D5, N.F5, N.D5, N.As4, N.G4, N.A4
      ];
      const lead = leadNotes[Math.floor(step / 4) % leadNotes.length];
      if (lead) {
        this.synthNote(lead, 'square', time, stepDur * 2.5, 0.18);
      }
    }
  }

  // --- 曲目 3: 王城決戰 (Royal Arcade) ---
  private playRoyalTrackStep(step: number, time: number, stepDur: number) {
    if (!this.ctx || !this.bgmMasterGain) return;

    // 經典四四拍直球進行曲
    const beatInBar = step % 16;
    if (beatInBar === 0 || beatInBar === 8) {
      this.synthKick(time, 0.45);
    }
    if (beatInBar === 4 || beatInBar === 12) {
      this.synthSnare(time, 0.32);
    }
    if (step % 2 === 0) {
      this.synthHiHat(time, 0.12);
    }

    // 進行曲低音
    const bar = Math.floor(step / 16);
    const roots = [N.C3, N.G2, N.A2, N.F2];
    const root = roots[bar % 4];
    if (beatInBar % 4 === 0) {
      this.synthNote(root, 'triangle', time, stepDur * 2, 0.4);
    }

    // 熱血主旋律
    const melody: number[] = [
      N.C5, N.REST, N.G4, N.C5, N.D5, N.REST, N.E5, N.REST,
      N.F5, N.E5, N.D5, N.C5, N.D5, N.REST, N.G4, N.REST,
      N.E5, N.REST, N.D5, N.E5, N.F5, N.REST, N.G5, N.REST,
      N.A5, N.G5, N.F5, N.E5, N.D5, N.C5, N.D5, N.REST,
      N.C5, N.E5, N.G5, N.C6, N.B5, N.G5, N.E5, N.G5,
      N.A5, N.F5, N.D5, N.F5, N.G5, N.REST, N.REST, N.REST,
      N.E5, N.C5, N.G4, N.C5, N.D5, N.B4, N.G4, N.B4,
      N.C5, N.REST, N.G4, N.REST, N.C5, N.REST, N.REST, N.REST
    ];

    const note = melody[step % 64];
    if (note && note > 0) {
      this.synthNote(note, 'square', time, stepDur * 1.2, 0.2);
    }
  }

  // --- 合成器基本元件 ---

  private synthNote(freq: number, type: OscillatorType, time: number, duration: number, gainVal: number) {
    if (!this.ctx || !this.bgmMasterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private synthKick(time: number, gainVal: number) {
    if (!this.ctx || !this.bgmMasterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.bgmMasterGain);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  private synthSnare(time: number, gainVal: number) {
    if (!this.ctx || !this.bgmMasterGain || !this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    noise.start(time);
    noise.stop(time + 0.15);
  }

  private synthHiHat(time: number, gainVal: number) {
    if (!this.ctx || !this.bgmMasterGain || !this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);

    noise.start(time);
    noise.stop(time + 0.045);
  }
}

export const soundManager = new SoundManager();
