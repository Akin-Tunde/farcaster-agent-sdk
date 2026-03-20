import type { AgentAction, ParameterSchema, ReturnSchema } from '../types';

export interface AgentActionMeta {
  description: string;
  parameters?: ParameterSchema;
  returns?: ReturnSchema;
  /** Override the action name (defaults to function name) */
  name?: string;
}

const registry = new Map<string, AgentAction>();

/**
 * @agentAction decorator — annotate any exported async function to register
 * it as a Farcaster agent action at runtime.
 *
 * Usage:
 *   @agentAction({ description: 'Flip a coin', parameters: { ... } })
 *   export async function flip(params: { choice: string }) { ... }
 *
 * Retrieve all registered actions:
 *   import { getRegisteredActions } from 'farcaster-agent-sdk/compiler';
 */
export function agentAction(meta: AgentActionMeta) {
  return function <T extends (...args: unknown[]) => unknown>(
    target: T,
    context: ClassMethodDecoratorContext | { kind?: string }
  ): T {
    // Support both TC39 decorators (context.kind) and legacy experimental decorators
    const fnName = meta.name ?? (typeof context === 'object' && 'name' in context
      ? String(context.name)
      : target.name);

    const action: AgentAction = {
      name: fnName,
      description: meta.description,
      type: 'function',
      location: `./${fnName}`,
      parameters: meta.parameters ?? { properties: {} },
      returns: meta.returns ?? { type: 'any' },
    };

    registry.set(fnName, action);
    return target;
  };
}

/**
 * Legacy method decorator form for TypeScript's experimentalDecorators.
 * Use this if you get errors with the standard @agentAction above.
 *
 * Usage:
 *   class MyActions {
 *     @agentActionMethod({ description: 'Flip a coin' })
 *     async flip(params: { choice: string }) { ... }
 *   }
 */
export function agentActionMethod(meta: AgentActionMeta) {
  return function (
    _target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor
  ): void {
    const fnName = meta.name ?? String(propertyKey);

    const action: AgentAction = {
      name: fnName,
      description: meta.description,
      type: 'function',
      location: `./${fnName}`,
      parameters: meta.parameters ?? { properties: {} },
      returns: meta.returns ?? { type: 'any' },
    };

    registry.set(fnName, action);
  };
}

/** Retrieve all actions registered via @agentAction or @agentActionMethod */
export function getRegisteredActions(): AgentAction[] {
  return Array.from(registry.values());
}

/** Clear the registry (useful for testing) */
export function clearRegistry(): void {
  registry.clear();
}
