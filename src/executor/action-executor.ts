import type {
  AgentAction,
  ApiAction,
  ContractAction,
  FunctionAction,
  ActionParams,
  ExecutionContext,
  ExecutionResult,
} from '../types';
import { ParamValidator } from './param-validator';
import { ApiExecutor } from './api-executor';
import { ContractExecutor } from './contract-executor';
import { FunctionExecutor } from './function-executor';

export interface ActionExecutorOptions {
  /** Default execution context applied to all executions */
  defaultContext?: ExecutionContext;
  /** Skip parameter validation (default: false) */
  skipValidation?: boolean;
}

/**
 * ActionExecutor is the main dispatcher. Given any AgentAction and params,
 * it validates inputs then routes to ApiExecutor, ContractExecutor, or FunctionExecutor.
 */
export class ActionExecutor {
  private paramValidator = new ParamValidator();
  private apiExecutor = new ApiExecutor();
  private contractExecutor = new ContractExecutor();
  private functionExecutor = new FunctionExecutor();
  private options: Required<ActionExecutorOptions>;

  constructor(options: ActionExecutorOptions = {}) {
    this.options = {
      defaultContext: options.defaultContext ?? {},
      skipValidation: options.skipValidation ?? false,
    };
  }

  async execute<T = unknown>(
    action: AgentAction,
    params: ActionParams = {},
    context: ExecutionContext = {}
  ): Promise<ExecutionResult<T>> {
    const ctx = { ...this.options.defaultContext, ...context };

    // Validate + coerce params before dispatching
    if (!this.options.skipValidation) {
      const validation = this.paramValidator.validate(action, params);
      if (!validation.valid) {
        return {
          success: false,
          error: `Parameter validation failed:\n${validation.errors
            .map((e) => `  • ${e.param}: ${e.message}`)
            .join('\n')}`,
          action: action.name,
          durationMs: 0,
        };
      }
      // Use coerced params going forward
      params = validation.coerced;
    }

    switch (action.type) {
      case 'api':
        return this.apiExecutor.execute<T>(action as ApiAction, params, ctx);
      case 'contract':
        return this.contractExecutor.execute<T>(action as ContractAction, params, ctx);
      case 'function':
        return this.functionExecutor.execute<T>(action as FunctionAction, params, ctx);
      default:
        return {
          success: false,
          error: `Unknown action type: ${(action as AgentAction).type}`,
          action: action.name,
          durationMs: 0,
        };
    }
  }

  /** Execute by action name — requires the full actions array */
  async executeByName<T = unknown>(
    name: string,
    actions: AgentAction[],
    params: ActionParams = {},
    context: ExecutionContext = {}
  ): Promise<ExecutionResult<T>> {
    const action = actions.find((a) => a.name === name);
    if (!action) {
      return {
        success: false,
        error: `Action "${name}" not found. Available: ${actions.map((a) => a.name).join(', ')}`,
        action: name,
        durationMs: 0,
      };
    }
    return this.execute<T>(action, params, context);
  }
}
