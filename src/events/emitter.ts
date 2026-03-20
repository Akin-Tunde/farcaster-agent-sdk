import EventEmitter from 'eventemitter3';
import type { AgentEvents } from '../types';

/**
 * AgentEventEmitter is a strongly-typed EventEmitter for agent lifecycle events.
 * Built on eventemitter3 for browser + Node compatibility.
 *
 * Events:
 *   action:start    — fired before any action execution begins
 *   action:success  — fired after a successful execution
 *   action:error    — fired when an execution fails
 *   manifest:loaded — fired when a manifest is loaded
 *   stream:data     — fired for each chunk from a streaming action
 *   stream:end      — fired when a stream completes
 *   stream:error    — fired when a stream errors
 */
export class AgentEventEmitter {
  private emitter = new EventEmitter();

  on<K extends keyof AgentEvents>(
    event: K,
    listener: (payload: AgentEvents[K]) => void
  ): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  once<K extends keyof AgentEvents>(
    event: K,
    listener: (payload: AgentEvents[K]) => void
  ): this {
    this.emitter.once(event, listener as (...args: unknown[]) => void);
    return this;
  }

  off<K extends keyof AgentEvents>(
    event: K,
    listener: (payload: AgentEvents[K]) => void
  ): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
    return this;
  }

  emit<K extends keyof AgentEvents>(event: K, payload: AgentEvents[K]): boolean {
    return this.emitter.emit(event, payload);
  }

  removeAllListeners(event?: keyof AgentEvents): this {
    this.emitter.removeAllListeners(event);
    return this;
  }
}
