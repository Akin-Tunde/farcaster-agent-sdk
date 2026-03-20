// ─── Parameter & Schema Types ─────────────────────────────────────────────────

export interface ParameterProperty {
  /** Core JSON-schema types + 'any'. The compiler may also emit raw TS/Solidity type strings. */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any' | (string & {});
  description?: string;
  required?: boolean;
  enum?: string[];
  default?: unknown;
  // Numeric constraints
  minimum?: number;
  maximum?: number;
  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}

export interface ParameterSchema {
  properties: Record<string, ParameterProperty>;
}

export interface ReturnSchema {
  type: string;
  description?: string;
}

// ─── Action Types ─────────────────────────────────────────────────────────────

export type ActionType = 'api' | 'contract' | 'function';

export interface BaseAction {
  name: string;
  description: string;
  type: ActionType;
  location: string;
  parameters: ParameterSchema;
  returns: ReturnSchema;
}

export interface ApiAction extends BaseAction {
  type: 'api';
  method?: string;
}

export interface ContractAction extends BaseAction {
  type: 'contract';
  abiFunction?: string;
  isReadOnly?: boolean;
  chainId?: number;
}

export interface FunctionAction extends BaseAction {
  type: 'function';
}

export type AgentAction = ApiAction | ContractAction | FunctionAction;

// ─── Manifest Types ───────────────────────────────────────────────────────────

export interface AppMetadata {
  name?: string;
  description?: string;
  iconUrl?: string;
  homeUrl?: string;
  imageUrl?: string;
  splashImageUrl?: string;
  splashBackgroundColor?: string;
}

export interface AgentManifest {
  name: string;
  description: string;
  version: string;
  metadata: AppMetadata;
  capabilities: string[];
  actions: AgentAction[];
}

// ─── Execution Types ──────────────────────────────────────────────────────────

export type ActionParams = Record<string, unknown>;

export interface ExecutionContext {
  /** For contract actions — a viem WalletClient or PublicClient */
  viemClient?: unknown;
  /** Additional HTTP headers for API actions */
  headers?: Record<string, string>;
  /** Base URL override for resolving relative API action locations */
  baseUrl?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

export interface ExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  action: string;
  durationMs: number;
}

// ─── Event Types ──────────────────────────────────────────────────────────────

export interface ActionStartEvent {
  action: string;
  params: ActionParams;
  timestamp: number;
}

export interface ActionSuccessEvent<T = unknown> {
  action: string;
  result: ExecutionResult<T>;
  timestamp: number;
}

export interface ActionErrorEvent {
  action: string;
  error: Error;
  params: ActionParams;
  timestamp: number;
}

export interface ManifestLoadedEvent {
  manifest: AgentManifest;
  source: string;
  timestamp: number;
}

export interface AgentEvents {
  'action:start': ActionStartEvent;
  'action:success': ActionSuccessEvent;
  'action:error': ActionErrorEvent;
  'manifest:loaded': ManifestLoadedEvent;
  'stream:data': { action: string; chunk: unknown; timestamp: number };
  'stream:end': { action: string; timestamp: number };
  'stream:error': { action: string; error: Error; timestamp: number };
}

// ─── Compiler Types ───────────────────────────────────────────────────────────

export interface CompilerOptions {
  /** Absolute or relative path to the project root */
  path: string;
  /** Output path for agent.json */
  output?: string;
  /** If true, return manifest without writing to disk */
  dryRun?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
