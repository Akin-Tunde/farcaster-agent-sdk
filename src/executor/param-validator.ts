import type { AgentAction, ActionParams, ParameterProperty } from '../types';

export interface ParamValidationError {
  param: string;
  message: string;
}

export interface ParamValidationResult {
  valid: boolean;
  errors: ParamValidationError[];
  coerced: ActionParams;
}

/**
 * Validates and coerces action parameters against an action's parameter schema.
 * Runs before every execution to catch type mismatches early.
 */
export class ParamValidator {
  validate(action: AgentAction, params: ActionParams): ParamValidationResult {
    const errors: ParamValidationError[] = [];
    const coerced: ActionParams = { ...params };
    const props = action.parameters.properties;

    // Check required fields are present
    for (const [name, schema] of Object.entries(props)) {
      const value = params[name];

      if (schema.required && (value === undefined || value === null)) {
        // Apply default if one exists
        if (schema.default !== undefined) {
          coerced[name] = schema.default;
          continue;
        }
        errors.push({ param: name, message: 'Required parameter is missing' });
        continue;
      }

      if (value === undefined || value === null) continue;

      const typeError = this.checkType(name, value, schema);
      if (typeError) {
        // Try coercion before flagging as error
        const coercedValue = this.tryCoerce(value, schema);
        if (coercedValue !== null) {
          coerced[name] = coercedValue;
        } else {
          errors.push(typeError);
        }
        continue;
      }

      // Constraint checks
      const constraintErrors = this.checkConstraints(name, value, schema);
      errors.push(...constraintErrors);
    }

    // Warn about unknown params (not an error, just strip)
    for (const key of Object.keys(params)) {
      if (!(key in props)) {
        console.warn(`[farcaster-agent-sdk] Unknown param "${key}" for action "${action.name}" — ignoring`);
        delete coerced[key];
      }
    }

    return { valid: errors.length === 0, errors, coerced };
  }

  private checkType(
    name: string,
    value: unknown,
    schema: ParameterProperty
  ): ParamValidationError | null {
    if (schema.type === 'any') return null;

    const jsType = typeof value;

    switch (schema.type) {
      case 'string':
        if (jsType !== 'string') return { param: name, message: `Expected string, got ${jsType}` };
        break;
      case 'number':
        if (jsType !== 'number') return { param: name, message: `Expected number, got ${jsType}` };
        break;
      case 'boolean':
        if (jsType !== 'boolean') return { param: name, message: `Expected boolean, got ${jsType}` };
        break;
      case 'array':
        if (!Array.isArray(value)) return { param: name, message: `Expected array, got ${jsType}` };
        break;
      case 'object':
        if (jsType !== 'object' || Array.isArray(value)) {
          return { param: name, message: `Expected object, got ${Array.isArray(value) ? 'array' : jsType}` };
        }
        break;
    }

    return null;
  }

  private checkConstraints(
    name: string,
    value: unknown,
    schema: ParameterProperty
  ): ParamValidationError[] {
    const errors: ParamValidationError[] = [];

    if (schema.enum && !schema.enum.includes(value as string)) {
      errors.push({
        param: name,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
      });
    }

    if (typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({ param: name, message: `Must be >= ${schema.minimum}` });
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({ param: name, message: `Must be <= ${schema.maximum}` });
      }
    }

    if (typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({ param: name, message: `Must be at least ${schema.minLength} characters` });
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({ param: name, message: `Must be at most ${schema.maxLength} characters` });
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        errors.push({ param: name, message: `Must match pattern: ${schema.pattern}` });
      }
    }

    return errors;
  }

  private tryCoerce(value: unknown, schema: ParameterProperty): unknown | null {
    try {
      switch (schema.type) {
        case 'number':
          if (typeof value === 'string') {
            const n = Number(value);
            if (!isNaN(n)) return n;
          }
          break;
        case 'boolean':
          if (value === 'true') return true;
          if (value === 'false') return false;
          break;
        case 'string':
          if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
          }
          break;
      }
    } catch { /* ignore */ }
    return null;
  }
}
