import { z } from 'zod';
import type { AgentManifest, ValidationResult } from '../types';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const ParameterPropertySchema = z.object({
  // Compiler may emit raw TS/Solidity types — accept any string, normalise known ones
  type: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  enum: z.array(z.string()).optional(),
  default: z.unknown().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  format: z.string().optional(),
});

const ParameterSchemaSchema = z.object({
  properties: z.record(ParameterPropertySchema),
});

const ReturnSchemaSchema = z.object({
  type: z.string(),
  description: z.string().optional(),
});

const ApiActionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  type: z.literal('api'),
  location: z.string().min(1),
  method: z.string().optional(),
  parameters: ParameterSchemaSchema,
  returns: ReturnSchemaSchema,
});

const ContractActionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  type: z.literal('contract'),
  location: z.string().min(1),
  abiFunction: z.string().optional(),
  isReadOnly: z.boolean().optional(),
  chainId: z.number().optional(),
  parameters: ParameterSchemaSchema,
  returns: ReturnSchemaSchema,
});

const FunctionActionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  type: z.literal('function'),
  location: z.string().min(1),
  parameters: ParameterSchemaSchema,
  returns: ReturnSchemaSchema,
});

const AgentActionSchema = z.discriminatedUnion('type', [
  ApiActionSchema,
  ContractActionSchema,
  FunctionActionSchema,
]);

const AppMetadataSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  iconUrl: z.string().url().optional(),
  homeUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  splashImageUrl: z.string().url().optional(),
  splashBackgroundColor: z.string().optional(),
});

export const AgentManifestSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  version: z.string(),
  metadata: AppMetadataSchema.default({}),
  capabilities: z.array(z.string()).default([]),
  actions: z.array(AgentActionSchema),
});

// ─── Validator Class ──────────────────────────────────────────────────────────

export class ManifestValidator {
  /**
   * Validate a raw object against the AgentManifest schema.
   * Returns structured errors and warnings — never throws.
   */
  validate(raw: unknown): ValidationResult {
    const result = AgentManifestSchema.safeParse(raw);

    if (result.success) {
      const warnings = this.lint(result.data as AgentManifest);
      return { valid: true, errors: [], warnings };
    }

    const errors = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    );

    return { valid: false, errors, warnings: [] };
  }

  /**
   * Parse and validate, throwing on failure. Returns a typed AgentManifest.
   */
  parse(raw: unknown): AgentManifest {
    return AgentManifestSchema.parse(raw) as AgentManifest;
  }

  /**
   * Non-fatal lint checks — best practices that won't fail validation
   * but are worth flagging.
   */
  private lint(manifest: AgentManifest): string[] {
    const warnings: string[] = [];

    if (!manifest.metadata.homeUrl) {
      warnings.push('metadata.homeUrl is not set — agents may not be able to link to your app');
    }

    if (manifest.actions.length === 0) {
      warnings.push('No actions defined — agents will have nothing to execute');
    }

    for (const action of manifest.actions) {
      if (!action.description || action.description.length < 10) {
        warnings.push(
          `action "${action.name}": description is too short — agents use this to decide when to call the action`
        );
      }

      const props = action.parameters.properties;
      for (const [paramName, prop] of Object.entries(props)) {
        if (!prop.description) {
          warnings.push(
            `action "${action.name}" > param "${paramName}": missing description`
          );
        }
      }

      if (action.type === 'contract' && !action.chainId) {
        warnings.push(
          `action "${action.name}": contract action has no chainId — executor will use default chain`
        );
      }
    }

    return warnings;
  }
}
