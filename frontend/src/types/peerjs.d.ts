declare module 'peerjs' {
  export interface PeerJSOption {
    key?: string;
    host?: string;
    port?: number;
    path?: string;
    secure?: boolean;
    pingInterval?: number;
    debug?: number;
    config?: RTCConfiguration;
  }

  export interface DataConnection {
    peer: string;
    open: boolean;
    metadata: any;
    connectionId: string;
    on(event: 'open', cb: () => void): void;
    on(event: 'data', cb: (data: unknown) => void): void;
    on(event: 'close', cb: () => void): void;
    on(event: 'error', cb: (err: any) => void): void;
    send(data: unknown): void;
    close(): void;
  }

  export class Peer {
    id: string;
    destroyed: boolean;
    disconnected: boolean;
    open: boolean;
    constructor(id?: string | PeerJSOption, options?: PeerJSOption);
    on(event: 'open', cb: (id: string) => void): void;
    on(event: 'connection', cb: (conn: DataConnection) => void): void;
    on(event: 'error', cb: (err: any) => void): void;
    on(event: 'close', cb: () => void): void;
    on(event: 'disconnected', cb: (currentId: string) => void): void;
    connect(id: string, options?: any): DataConnection;
    reconnect(): void;
    disconnect(): void;
    destroy(): void;
  }

  export default Peer;
}
