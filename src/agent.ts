import type {
  AgentManifest,
  AgentAction,
  ActionParams,
  ExecutionContext,
  ExecutionResult,
  AgentEvents,
} from './types';
import { ManifestClient } from './manifest/client';
import type { ManifestClientOptions } from './manifest/client';
import { ActionExecutor } from './executor/action-executor';
import type { ActionExecutorOptions } from './executor/action-executor';
import { AgentEventEmitter } from './events/emitter';
import { ActionStream } from './events/stream';
import type { StreamOptions } from './events/stream';

export interface FarcasterAgentOptions {
  manifest?: ManifestClientOptions;
  executor?: ActionExecutorOptions;
}

/**
 * FarcasterAgent — the top-level SDK class.
 *
 * Combines manifest loading, action execution, and event streaming
 * into a single ergonomic interface.
 *
 * Quick start:
 *   const agent = await FarcasterAgent.load('https://myapp.xyz/agent.json');
 *   const result = await agent.execute('flip', { choice: 'heads' });
 *   agent.on('action:success', (e) => console.log(e));
 */
export class FarcasterAgent {
  private manifestClient: ManifestClient;
  private executor: ActionExecutor;
  readonly events: AgentEventEmitter;

  constructor(options: FarcasterAgentOptions = {}) {
    this.manifestClient = new ManifestClient(options.manifest);
    this.executor = new ActionExecutor(options.executor);
    this.events = new AgentEventEmitter();
  }

  // ─── Static loaders ──────────────────────────────────────────────────────────

  static async load(url: string, options: FarcasterAgentOptions = {}): Promise<FarcasterAgent> {
    const agent = new FarcasterAgent(options);
    const manifest = await agent.manifestClient.fromUrl(url);
    agent.events.emit('manifest:loaded', { manifest, source: url, timestamp: Date.now() });
    return agent;
  }

  static fromFile(filePath: string, options: FarcasterAgentOptions = {}): FarcasterAgent {
    const agent = new FarcasterAgent(options);
    const manifest = agent.manifestClient.fromFile(filePath);
    agent.events.emit('manifest:loaded', { manifest, source: filePath, timestamp: Date.now() });
    return agent;
  }

  static fromManifest(manifest: AgentManifest, options: FarcasterAgentOptions = {}): FarcasterAgent {
    const agent = new FarcasterAgent(options);
    agent.manifestClient.fromObject(manifest, 'inline');
    agent.events.emit('manifest:loaded', { manifest, source: 'inline', timestamp: Date.now() });
    return agent;
  }

  // ─── Manifest accessors ───────────────────────────────────────────────────────

  get manifest(): AgentManifest { return this.manifestClient.manifest; }
  get name(): string { return this.manifest.name; }
  get description(): string { return this.manifest.description; }

  getActions(): AgentAction[] { return this.manifestClient.getActions(); }
  getAction(name: string): AgentAction { return this.manifestClient.getAction(name); }
  getActionsByType(type: AgentAction['type']): AgentAction[] {
    return this.manifestClient.getActionsByType(type);
  }
  hasCapability(cap: string): boolean { return this.manifestClient.hasCapability(cap); }
  summary(): string { return this.manifestClient.summary(); }

  // ─── Execution ────────────────────────────────────────────────────────────────

  async execute<T = unknown>(
    actionName: string,
    params: ActionParams = {},
    context: ExecutionContext = {}
  ): Promise<ExecutionResult<T>> {
    const action = this.manifestClient.getAction(actionName);

    this.events.emit('action:start', {
      action: actionName,
      params,
      timestamp: Date.now(),
    });

    const result = await this.executor.execute<T>(action, params, context);

    if (result.success) {
      this.events.emit('action:success', {
        action: actionName,
        result,
        timestamp: Date.now(),
      });
    } else {
      this.events.emit('action:error', {
        action: actionName,
        error: new Error(result.error ?? 'Unknown error'),
        params,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  // ─── Streaming ────────────────────────────────────────────────────────────────

  stream(actionName: string): ActionStream {
    const action = this.manifestClient.getAction(actionName);
    return new ActionStream(action, this.events);
  }

  // ─── Events ───────────────────────────────────────────────────────────────────

  on<K extends keyof AgentEvents>(
    event: K,
    listener: (payload: AgentEvents[K]) => void
  ): this {
    this.events.on(event, listener);
    return this;
  }

  off<K extends keyof AgentEvents>(
    event: K,
    listener: (payload: AgentEvents[K]) => void
  ): this {
    this.events.off(event, listener);
    return this;
  }
}
