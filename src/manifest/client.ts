import * as fs from 'fs';
import type { AgentManifest, AgentAction, ValidationResult } from '../types';
import { ManifestValidator } from './validator';

export interface ManifestClientOptions {
  /** Automatically throw if validation fails (default: true) */
  strict?: boolean;
  /** Custom fetch implementation (useful for testing or edge runtimes) */
  fetch?: typeof globalThis.fetch;
  /** Request timeout in ms when fetching from URL (default: 10000) */
  timeoutMs?: number;
}

export class ManifestClient {
  private validator = new ManifestValidator();
  private options: Required<ManifestClientOptions>;
  private _manifest: AgentManifest | null = null;
  private _source: string = '';

  constructor(options: ManifestClientOptions = {}) {
    this.options = {
      strict: options.strict ?? true,
      fetch: options.fetch ?? globalThis.fetch,
      timeoutMs: options.timeoutMs ?? 10_000,
    };
  }

  // ─── Loading ────────────────────────────────────────────────────────────────

  /** Load manifest from a URL (browser + Node compatible) */
  async fromUrl(url: string): Promise<AgentManifest> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);

    let raw: unknown;
    try {
      const res = await this.options.fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching manifest from ${url}`);
      }
      raw = await res.json();
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new Error(`Timeout fetching manifest from ${url} after ${this.options.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    return this._load(raw, url);
  }

  /** Load manifest from a local file path (Node.js only) */
  fromFile(filePath: string): AgentManifest {
    if (typeof window !== 'undefined') {
      throw new Error('fromFile() is only available in Node.js environments');
    }
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
    return this._load(raw, filePath);
  }

  /** Load manifest from a raw object (e.g. already fetched) */
  fromObject(raw: unknown, source = 'inline'): AgentManifest {
    return this._load(raw, source);
  }

  // ─── Accessors ──────────────────────────────────────────────────────────────

  get manifest(): AgentManifest {
    if (!this._manifest) throw new Error('No manifest loaded. Call fromUrl(), fromFile(), or fromObject() first.');
    return this._manifest;
  }

  get source(): string { return this._source; }

  get isLoaded(): boolean { return this._manifest !== null; }

  // ─── Query helpers ───────────────────────────────────────────────────────────

  /** Get all actions */
  getActions(): AgentAction[] {
    return this.manifest.actions;
  }

  /** Get actions filtered by type */
  getActionsByType(type: AgentAction['type']): AgentAction[] {
    return this.manifest.actions.filter((a) => a.type === type);
  }

  /** Find a single action by name (throws if not found) */
  getAction(name: string): AgentAction {
    const action = this.manifest.actions.find((a) => a.name === name);
    if (!action) {
      throw new Error(
        `Action "${name}" not found in manifest. Available: ${this.manifest.actions.map((a) => a.name).join(', ')}`
      );
    }
    return action;
  }

  /** Check if the app declares a specific capability */
  hasCapability(capability: string): boolean {
    return this.manifest.capabilities.includes(capability);
  }

  /** Get all declared capabilities */
  getCapabilities(): string[] {
    return [...this.manifest.capabilities];
  }

  /** Validate the currently loaded manifest */
  validate(): ValidationResult {
    return this.validator.validate(this._manifest);
  }

  /** Summarize the manifest as a human-readable string */
  summary(): string {
    const m = this.manifest;
    const lines = [
      `📦 ${m.name} v${m.version}`,
      `   ${m.description}`,
      `   Actions (${m.actions.length}):`,
      ...m.actions.map((a) => `     • [${a.type}] ${a.name} — ${a.description}`),
    ];
    if (m.capabilities.length > 0) {
      lines.push(`   Capabilities: ${m.capabilities.join(', ')}`);
    }
    return lines.join('\n');
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private _load(raw: unknown, source: string): AgentManifest {
    if (this.options.strict) {
      this._manifest = this.validator.parse(raw);
    } else {
      const result = this.validator.validate(raw);
      if (!result.valid) {
        console.warn(`[farcaster-agent-sdk] Manifest validation warnings from ${source}:`, result.errors);
      }
      // Best-effort cast when not strict
      this._manifest = raw as AgentManifest;
    }
    this._source = source;
    return this._manifest;
  }
}
