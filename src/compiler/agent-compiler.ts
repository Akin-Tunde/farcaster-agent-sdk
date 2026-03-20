import * as path from 'path';
import * as fs from 'fs';
import type { AgentManifest, CompilerOptions } from '../types';

/**
 * AgentCompiler wraps the farcaster-agent-compiler's internals
 * as a programmatic Node.js API — no shell exec, no CLI.
 *
 * This is the same logic the CLI uses, just importable.
 */
export class AgentCompiler {
  /**
   * Compile a project at `options.path` into an AgentManifest.
   *
   * - If `options.dryRun` is true, returns the manifest without writing.
   * - Otherwise writes to `options.output` (default: `<path>/agent.json`).
   */
  static async compile(options: CompilerOptions): Promise<AgentManifest> {
    const projectPath = path.resolve(options.path);
    const outputPath = options.output
      ? path.resolve(options.output)
      : path.join(projectPath, 'agent.json');

    // Dynamically import the compiler — try main entry first, then dist paths
    let DiscoveryService: any, TSParser: any, ManifestGenerator: any;
    try {
      // Attempt 1: main package entry (if compiler re-exports internals)
      const mod = await import('farcaster-agent-compiler').catch(() => null);
      DiscoveryService = mod?.DiscoveryService;
      TSParser = mod?.TSParser;
      ManifestGenerator = mod?.ManifestGenerator;

      // Attempt 2: known dist subpaths
      if (!DiscoveryService) {
        const [d, p, g] = await Promise.all([
          import('farcaster-agent-compiler/dist/discovery/service.js').catch(() => null),
          import('farcaster-agent-compiler/dist/parser/ts-parser.js').catch(() => null),
          import('farcaster-agent-compiler/dist/generator/json.js').catch(() => null),
        ]);
        DiscoveryService = d?.DiscoveryService;
        TSParser = p?.TSParser;
        ManifestGenerator = g?.ManifestGenerator;
      }

      if (!DiscoveryService || !TSParser || !ManifestGenerator) {
        throw new Error('Could not resolve compiler internals');
      }
    } catch {
      throw new Error(
        'farcaster-agent-compiler is required to use AgentCompiler.\n' +
        'Install it: npm install farcaster-agent-compiler'
      );
    }

    const discovery = new DiscoveryService(projectPath);
    const files: string[] = await discovery.findRelevantFiles();

    const parser = new TSParser(projectPath);
    const allActions: unknown[] = [];

    for (const file of files) {
      const fileActions: unknown[] = await parser.parseFile(file);
      allActions.push(...fileActions);
    }

    // Deduplicate — prefer the version with more parameters
    const uniqueActions = new Map<string, unknown>();
    for (const action of allActions as Array<{ name: string; parameters: { properties: Record<string, unknown> } }>) {
      const existing = uniqueActions.get(action.name) as typeof action | undefined;
      if (
        !existing ||
        Object.keys(action.parameters.properties).length >
          Object.keys(existing.parameters.properties).length
      ) {
        uniqueActions.set(action.name, action);
      }
    }

    const generator = new ManifestGenerator();
    const manifest = generator.generate(
      Array.from(uniqueActions.values()),
      parser.getAppMetadata(),
      parser.getCapabilities()
    ) as AgentManifest;

    if (!options.dryRun) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
    }

    return manifest;
  }

  /**
   * Compile and return JSON string (convenience wrapper).
   */
  static async compileToJson(options: CompilerOptions): Promise<string> {
    const manifest = await this.compile({ ...options, dryRun: true });
    return JSON.stringify(manifest, null, 2);
  }
}
