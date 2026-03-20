import type { FunctionAction, ActionParams, ExecutionContext, ExecutionResult } from '../types';

/**
 * FunctionExecutor dynamically imports and invokes local TypeScript/JS functions
 * that are annotated as agent actions.
 *
 * The action's `location` field must be a resolvable module path (relative to CWD
 * or an absolute path). The exported function name must match `action.name`.
 *
 * This executor is Node.js only. In browser environments, use ApiExecutor
 * and expose functions as API routes instead.
 */
export class FunctionExecutor {
  private cache = new Map<string, Record<string, unknown>>();

  async execute<T = unknown>(
    action: FunctionAction,
    params: ActionParams,
    _ctx: ExecutionContext = {}
  ): Promise<ExecutionResult<T>> {
    const start = Date.now();

    try {
      if (typeof window !== 'undefined') {
        throw new Error(
          'FunctionExecutor is only available in Node.js. ' +
          'In browser environments, expose functions as API routes and use ApiExecutor.'
        );
      }

      const fn = await this.resolveFunction(action);
      const result = await fn(params);

      return {
        success: true,
        data: result as T,
        action: action.name,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
        action: action.name,
        durationMs: Date.now() - start,
      };
    }
  }

  private async resolveFunction(action: FunctionAction): Promise<Function> {
    const location = action.location.startsWith('./')
      ? action.location
      : `./${action.location}`;

    // Try cache first
    let mod = this.cache.get(location);
    if (!mod) {
      try {
        mod = await import(location) as Record<string, unknown>;
        this.cache.set(location, mod);
      } catch (err) {
        throw new Error(
          `Failed to import module at "${location}": ${(err as Error).message}`
        );
      }
    }

    const fn = mod[action.name];
    if (typeof fn !== 'function') {
      const exports = Object.keys(mod).join(', ');
      throw new Error(
        `Function "${action.name}" not found in module "${location}". ` +
        `Available exports: ${exports}`
      );
    }

    return fn as Function;
  }

  /** Clear the module cache (useful for testing) */
  clearCache(): void {
    this.cache.clear();
  }
}
