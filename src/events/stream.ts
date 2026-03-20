import type { AgentAction, ActionParams, ExecutionContext } from '../types';
import { AgentEventEmitter } from './emitter';

export type StreamTransport = 'sse' | 'websocket';

export interface StreamOptions {
  transport?: StreamTransport;
  /** For SSE: URL of the streaming endpoint */
  url?: string;
  /** For WebSocket: WS URL */
  wsUrl?: string;
  /** Additional headers (SSE only) */
  headers?: Record<string, string>;
  /** Transform a raw SSE/WS message into a typed chunk */
  parseChunk?: (raw: string) => unknown;
  /** Max time to wait for the stream to open (default: 15000ms) */
  connectTimeoutMs?: number;
}

/**
 * ActionStream wraps SSE or WebSocket connections for long-running actions
 * that push results incrementally (e.g. AI generation, blockchain event watching).
 *
 * Usage:
 *   const stream = new ActionStream(action, emitter);
 *   await stream.open({ url: '/api/stream', transport: 'sse' });
 *   // Listen via emitter.on('stream:data', ...)
 *   await stream.close();
 */
export class ActionStream {
  private evtSource: EventSource | null = null;
  private ws: WebSocket | null = null;
  private _isOpen = false;

  constructor(
    private action: AgentAction,
    private emitter: AgentEventEmitter
  ) {}

  get isOpen(): boolean { return this._isOpen; }

  async open(options: StreamOptions, params: ActionParams = {}): Promise<void> {
    const transport = options.transport ?? 'sse';

    if (transport === 'sse') {
      await this.openSse(options, params);
    } else {
      await this.openWebSocket(options, params);
    }
  }

  close(): void {
    this.evtSource?.close();
    this.ws?.close();
    this.evtSource = null;
    this.ws = null;
    this._isOpen = false;
  }

  // ─── SSE ────────────────────────────────────────────────────────────────────

  private async openSse(options: StreamOptions, params: ActionParams): Promise<void> {
    if (typeof EventSource === 'undefined') {
      throw new Error('EventSource is not available in this environment');
    }

    const url = options.url ?? this.action.location;
    if (!url) throw new Error('SSE requires options.url or action.location');

    // POST params then connect to SSE (common pattern: POST to init, GET SSE stream)
    const es = new EventSource(url);
    this.evtSource = es;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        es.close();
        reject(new Error(`SSE connection timeout after ${options.connectTimeoutMs ?? 15_000}ms`));
      }, options.connectTimeoutMs ?? 15_000);

      es.onopen = () => {
        clearTimeout(timeout);
        this._isOpen = true;
        resolve();
      };

      es.onerror = (err) => {
        clearTimeout(timeout);
        this._isOpen = false;
        this.emitter.emit('stream:error', {
          action: this.action.name,
          error: new Error('SSE connection error'),
          timestamp: Date.now(),
        });
        reject(err);
      };

      es.onmessage = (event) => {
        if (event.data === '[DONE]') {
          this._isOpen = false;
          es.close();
          this.emitter.emit('stream:end', {
            action: this.action.name,
            timestamp: Date.now(),
          });
          return;
        }

        try {
          const chunk = options.parseChunk
            ? options.parseChunk(event.data)
            : this.defaultParse(event.data);

          this.emitter.emit('stream:data', {
            action: this.action.name,
            chunk,
            timestamp: Date.now(),
          });
        } catch (err) {
          this.emitter.emit('stream:error', {
            action: this.action.name,
            error: err as Error,
            timestamp: Date.now(),
          });
        }
      };
    });
  }

  // ─── WebSocket ───────────────────────────────────────────────────────────────

  private async openWebSocket(options: StreamOptions, params: ActionParams): Promise<void> {
    const wsUrl = options.wsUrl;
    if (!wsUrl) throw new Error('WebSocket transport requires options.wsUrl');

    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error(`WebSocket connection timeout after ${options.connectTimeoutMs ?? 15_000}ms`));
      }, options.connectTimeoutMs ?? 15_000);

      ws.onopen = () => {
        clearTimeout(timeout);
        this._isOpen = true;
        // Send initial params as first message
        ws.send(JSON.stringify({ action: this.action.name, params }));
        resolve();
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        this._isOpen = false;
        this.emitter.emit('stream:error', {
          action: this.action.name,
          error: new Error('WebSocket error'),
          timestamp: Date.now(),
        });
        reject(err);
      };

      ws.onclose = () => {
        this._isOpen = false;
        this.emitter.emit('stream:end', {
          action: this.action.name,
          timestamp: Date.now(),
        });
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const chunk = options.parseChunk
            ? options.parseChunk(event.data as string)
            : this.defaultParse(event.data as string);

          this.emitter.emit('stream:data', {
            action: this.action.name,
            chunk,
            timestamp: Date.now(),
          });
        } catch (err) {
          this.emitter.emit('stream:error', {
            action: this.action.name,
            error: err as Error,
            timestamp: Date.now(),
          });
        }
      };
    });
  }

  private defaultParse(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}
