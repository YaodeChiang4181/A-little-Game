import Peer, { DataConnection } from 'peerjs';
import { NetworkMessage, OnlineRole, OnlineConnectionStatus } from './types';

// 為瀏覽器環境安全防禦 global 變數
if (typeof window !== 'undefined' && !(window as any).global) {
  (window as any).global = window;
}

const PEER_PREFIX = 'pbe-parity-';

// 安全適配 bundler 對 Peer 類別的導出格式
const PeerConstructor: any = (Peer as any)?.default || Peer;

export interface NetworkCallbacks {
  onStatusChange: (status: OnlineConnectionStatus, message?: string) => void;
  onMessage: (message: NetworkMessage) => void;
  onPingUpdate: (pingMs: number) => void;
  onError: (errorText: string) => void;
}

export class NetworkManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private role: OnlineRole = 'GUEST';
  private roomCode: string = '';
  private callbacks: NetworkCallbacks | null = null;
  private pingIntervalId: number | null = null;
  private isConnected: boolean = false;

  constructor() {}

  public init(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 產生 6 位隨機數字房間號
   */
  public generateRoomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 房主創建房間 (Host)
   */
  public createRoom(specifiedCode?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.cleanup();
      this.role = 'HOST';
      const code = specifiedCode || this.generateRoomCode();
      this.roomCode = code;
      const peerId = `${PEER_PREFIX}${code}`;

      this.callbacks?.onStatusChange('creating', '正在雲端註冊房間代碼...');

      try {
        const peer = new PeerConstructor(peerId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer = peer;

        peer.on('open', (id) => {
          this.callbacks?.onStatusChange('waiting', `房間代碼 [ ${code} ] 已就緒，等待挑戰者加入...`);
          resolve(code);
        });

        peer.on('connection', (conn) => {
          // 只允許單一挑戰者對戰
          if (this.connection) {
            conn.close();
            return;
          }

          this.connection = conn;
          this.setupConnectionHandlers(conn);
        });

        peer.on('error', (err: any) => {
          console.error('[PeerJS Host Error]', err);
          if (err.type === 'unavailable-id') {
            // 若該代碼已被佔用，自動重試新代碼
            this.createRoom().then(resolve).catch(reject);
          } else {
            this.callbacks?.onError(`建立房間失敗: ${err.message || err.type}`);
            this.callbacks?.onStatusChange('error', '房間建立失敗');
            reject(err);
          }
        });
      } catch (e: any) {
        this.callbacks?.onError(`WebRTC 初始化失敗: ${e.message}`);
        reject(e);
      }
    });
  }

  /**
   * 挑戰者加入房間 (Guest)
   */
  public joinRoom(roomCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cleanup();
      this.role = 'GUEST';
      this.roomCode = roomCode.trim();
      const hostPeerId = `${PEER_PREFIX}${this.roomCode}`;

      this.callbacks?.onStatusChange('connecting', `正在連線至房間 [ ${this.roomCode} ]...`);

      try {
        const peer = new PeerConstructor({
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer = peer;

        peer.on('open', () => {
          const conn = peer.connect(hostPeerId, {
            reliable: true
          });

          this.connection = conn;
          this.setupConnectionHandlers(conn);
          resolve();
        });

        peer.on('error', (err: any) => {
          console.error('[PeerJS Guest Error]', err);
          if (err.type === 'peer-unavailable') {
            this.callbacks?.onError(`找不到房間代碼 [ ${this.roomCode} ]，請確認代碼是否正確。`);
          } else {
            this.callbacks?.onError(`連線房間失敗: ${err.message || err.type}`);
          }
          this.callbacks?.onStatusChange('error', '連線失敗');
          reject(err);
        });
      } catch (e: any) {
        this.callbacks?.onError(`WebRTC 初始化失敗: ${e.message}`);
        reject(e);
      }
    });
  }

  /**
   * 設定 DataConnection 雙向事件
   */
  private setupConnectionHandlers(conn: DataConnection) {
    conn.on('open', () => {
      this.isConnected = true;
      this.callbacks?.onStatusChange('connected', '連線成功！正在進入對決...');

      // 連線成功後，啟動心跳檢查
      this.startHeartbeat();

      if (this.role === 'GUEST') {
        this.send({
          type: 'HELLO',
          sender: 'GUEST',
          name: '挑戰者',
          timestamp: Date.now()
        });
      } else {
        this.send({
          type: 'WELCOME',
          sender: 'HOST',
          roomCode: this.roomCode,
          hostName: '房主',
          timestamp: Date.now()
        });
      }
    });

    conn.on('data', (rawData: unknown) => {
      try {
        const message = rawData as NetworkMessage;
        if (!message || !message.type) return;

        if (message.type === 'PING') {
          // 回應 PONG
          this.send({
            type: 'PONG',
            sender: this.role,
            timestamp: message.timestamp
          });
          return;
        }

        if (message.type === 'PONG') {
          // 計算雙向往返延遲
          const latency = Math.max(1, Math.round((Date.now() - message.timestamp) / 2));
          this.callbacks?.onPingUpdate(latency);
          return;
        }

        this.callbacks?.onMessage(message);
      } catch (err) {
        console.error('[NetworkManager] Error handling incoming data', err);
      }
    });

    conn.on('close', () => {
      this.isConnected = false;
      this.stopHeartbeat();
      this.callbacks?.onStatusChange('disconnected', '對手已中斷連線。');
    });

    conn.on('error', (err: any) => {
      console.error('[DataConnection Error]', err);
      this.callbacks?.onError(`傳輸通道異常: ${err.message || '未知錯誤'}`);
    });
  }

  /**
   * 發送具名訊息
   */
  public send(message: NetworkMessage) {
    if (this.connection && this.connection.open) {
      this.connection.send(message);
    }
  }

  /**
   * 啟動心跳檢測 (計算 Ping 毫秒數)
   */
  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingIntervalId = window.setInterval(() => {
      if (this.connection && this.connection.open) {
        this.send({
          type: 'PING',
          sender: this.role,
          timestamp: Date.now()
        });
      }
    }, 2500);
  }

  private stopHeartbeat() {
    if (this.pingIntervalId !== null) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  /**
   * 關閉連線與銷毀資源
   */
  public cleanup() {
    this.stopHeartbeat();
    this.isConnected = false;

    if (this.connection) {
      try {
        this.connection.close();
      } catch {}
      this.connection = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
  }

  public getRole(): OnlineRole {
    return this.role;
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  public isReady(): boolean {
    return this.isConnected && Boolean(this.connection?.open);
  }
}

export const networkManager = new NetworkManager();
