import type {
  AgentManifest,
  AgentAction,
  ApiAction,
  ContractAction,
  FunctionAction,
  AppMetadata,
  ParameterSchema,
  ReturnSchema,
} from '../types';

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type ApiActionInput = PartialBy<Omit<ApiAction, 'type'>, 'parameters' | 'returns'>;
type ContractActionInput = PartialBy<Omit<ContractAction, 'type'>, 'parameters' | 'returns'>;
type FunctionActionInput = PartialBy<Omit<FunctionAction, 'type'>, 'parameters' | 'returns'>;

const defaultParams: ParameterSchema = { properties: {} };
const defaultReturns: ReturnSchema = { type: 'any' };

/**
 * ManifestBuilder — fluent builder for creating agent.json manifests in code.
 *
 * Usage:
 *   const manifest = new ManifestBuilder('CoinFlip')
 *     .setDescription('A coin flip game on Farcaster')
 *     .setMetadata({ homeUrl: 'https://coinflip.xyz' })
 *     .addApiAction({ name: 'flip', location: '/api/flip', method: 'POST', ... })
 *     .addCapability('wallet')
 *     .build();
 */
export class ManifestBuilder {
  private manifest: AgentManifest;

  constructor(name: string) {
    this.manifest = {
      name,
      description: '',
      version: '1.0.0',
      metadata: {},
      capabilities: [],
      actions: [],
    };
  }

  setDescription(description: string): this {
    this.manifest.description = description;
    return this;
  }

  setVersion(version: string): this {
    this.manifest.version = version;
    return this;
  }

  setMetadata(metadata: AppMetadata): this {
    this.manifest.metadata = { ...this.manifest.metadata, ...metadata };
    return this;
  }

  addCapability(capability: string): this {
    if (!this.manifest.capabilities.includes(capability)) {
      this.manifest.capabilities.push(capability);
    }
    return this;
  }

  addCapabilities(capabilities: string[]): this {
    for (const cap of capabilities) this.addCapability(cap);
    return this;
  }

  // ─── Action Builders ─────────────────────────────────────────────────────────

  addApiAction(action: ApiActionInput): this {
    this.manifest.actions.push({
      type: 'api',
      parameters: defaultParams,
      returns: defaultReturns,
      ...action,
    } as ApiAction);
    return this;
  }

  addContractAction(action: ContractActionInput): this {
    this.manifest.actions.push({
      type: 'contract',
      parameters: defaultParams,
      returns: defaultReturns,
      ...action,
    } as ContractAction);
    return this;
  }

  addFunctionAction(action: FunctionActionInput): this {
    this.manifest.actions.push({
      type: 'function',
      parameters: defaultParams,
      returns: defaultReturns,
      ...action,
    } as FunctionAction);
    return this;
  }

  /** Add a pre-built action directly */
  addAction(action: AgentAction): this {
    this.manifest.actions.push(action);
    return this;
  }

  /** Remove an action by name */
  removeAction(name: string): this {
    this.manifest.actions = this.manifest.actions.filter((a) => a.name !== name);
    return this;
  }

  /** Merge another manifest's actions into this one */
  mergeActions(other: AgentManifest): this {
    for (const action of other.actions) {
      if (!this.manifest.actions.some((a) => a.name === action.name)) {
        this.manifest.actions.push(action);
      }
    }
    return this;
  }

  /** Return a deep clone of the current manifest (non-destructive) */
  peek(): AgentManifest {
    return JSON.parse(JSON.stringify(this.manifest)) as AgentManifest;
  }

  /** Build and return the final manifest */
  build(): AgentManifest {
    if (!this.manifest.description) {
      console.warn('[ManifestBuilder] description is empty — agents use this to understand your app');
    }
    return JSON.parse(JSON.stringify(this.manifest)) as AgentManifest;
  }

  /** Serialize the manifest to a JSON string */
  toJson(indent = 2): string {
    return JSON.stringify(this.build(), null, indent);
  }
}
