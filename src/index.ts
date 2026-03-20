// ─── Top-level agent class ────────────────────────────────────────────────────
export { FarcasterAgent } from './agent';
export type { FarcasterAgentOptions } from './agent';

// ─── Manifest ─────────────────────────────────────────────────────────────────
export { ManifestClient, ManifestValidator, AgentManifestSchema } from './manifest/index';
export type { ManifestClientOptions } from './manifest/index';

// ─── Executor ─────────────────────────────────────────────────────────────────
export { ActionExecutor, ApiExecutor, ContractExecutor, FunctionExecutor, ParamValidator } from './executor/index';
export type { ActionExecutorOptions, ParamValidationResult, ParamValidationError } from './executor/index';

// ─── Compiler ─────────────────────────────────────────────────────────────────
export { AgentCompiler, ManifestBuilder, agentAction, agentActionMethod, getRegisteredActions, clearRegistry } from './compiler/index';
export type { AgentActionMeta } from './compiler/index';

// ─── Events ───────────────────────────────────────────────────────────────────
export { AgentEventEmitter, ActionStream } from './events/index';
export type { StreamOptions, StreamTransport } from './events/index';

// ─── Types (re-exported for consumers) ───────────────────────────────────────
export type {
  AgentManifest,
  AgentAction,
  ApiAction,
  ContractAction,
  FunctionAction,
  AppMetadata,
  ActionParams,
  ExecutionContext,
  ExecutionResult,
  AgentEvents,
  CompilerOptions,
  ValidationResult,
  ParameterProperty,
  ParameterSchema,
  ReturnSchema,
} from './types';
