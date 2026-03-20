# farcaster-agent-sdk

A full-stack TypeScript SDK for building, reading, executing, and streaming [Farcaster Agent](https://github.com/0xedev/farcaster-agent-compiler) actions.

## Installation

```bash
npm install farcaster-agent-sdk
# peer dep for contract actions:
npm install viem
```

## Quick Start

```ts
import { FarcasterAgent } from 'farcaster-agent-sdk';

const agent = await FarcasterAgent.load('https://myapp.xyz/agent.json', {
  executor: { defaultContext: { baseUrl: 'https://myapp.xyz' } },
});

console.log(agent.summary());

const result = await agent.execute('flip', { choice: 'heads', amount: 0.01 });
console.log(result.data);
```

---

## Modules

The SDK is split into four tree-shakeable modules:

| Import | Purpose |
|---|---|
| `farcaster-agent-sdk` | Everything (top-level `FarcasterAgent` class) |
| `farcaster-agent-sdk/manifest` | Load & validate `agent.json` |
| `farcaster-agent-sdk/executor` | Execute actions (API, contract, function) |
| `farcaster-agent-sdk/compiler` | Generate manifests from code |
| `farcaster-agent-sdk/events` | Typed events & SSE/WebSocket streaming |

---

## API Reference

### `FarcasterAgent`

The main entry point. Combines all four modules.

```ts
// Load from URL
const agent = await FarcasterAgent.load(url, options?);

// Load from file (Node.js only)
const agent = FarcasterAgent.fromFile(filePath, options?);

// Load from a manifest object
const agent = FarcasterAgent.fromManifest(manifest, options?);
```

#### Execute an action

```ts
const result = await agent.execute(actionName, params, context?);
// result: { success, data, error, action, durationMs }
```

#### Stream a long-running action

```ts
agent.on('stream:data', ({ chunk }) => console.log(chunk));
agent.on('stream:end', () => console.log('done'));

const stream = agent.stream('generateText');
await stream.open({ transport: 'sse', url: '/api/stream' }, { prompt: 'Hi' });
```

#### Listen to events

```ts
agent
  .on('action:start',   ({ action, params }) => ...)
  .on('action:success', ({ action, result }) => ...)
  .on('action:error',   ({ action, error })  => ...)
  .on('manifest:loaded',({ manifest })       => ...)
  .on('stream:data',    ({ chunk })          => ...)
  .on('stream:end',     ({ action })         => ...)
  .on('stream:error',   ({ error })          => ...);
```

---

### `ManifestBuilder`

Fluent builder for creating `agent.json` programmatically.

```ts
import { ManifestBuilder } from 'farcaster-agent-sdk/compiler';

const manifest = new ManifestBuilder('MyApp')
  .setDescription('Does cool things')
  .setMetadata({ homeUrl: 'https://myapp.xyz' })
  .addCapability('wallet')
  .addApiAction({
    name: 'doSomething',
    description: 'Performs an action',
    location: '/api/do',
    method: 'POST',
    parameters: {
      properties: {
        input: { type: 'string', description: 'The input', required: true },
      },
    },
    returns: { type: 'object' },
  })
  .build();
```

---

### `AgentCompiler`

Programmatic wrapper around `farcaster-agent-compiler`. Scans a project and generates `agent.json`.

```ts
import { AgentCompiler } from 'farcaster-agent-sdk/compiler';

// Write to disk
await AgentCompiler.compile({ path: './my-app', output: './agent.json' });

// Dry run — returns manifest, no file written
const manifest = await AgentCompiler.compile({ path: './my-app', dryRun: true });
```

---

### `ManifestValidator`

Validates any object against the `agent.json` spec.

```ts
import { ManifestValidator } from 'farcaster-agent-sdk/manifest';

const validator = new ManifestValidator();
const { valid, errors, warnings } = validator.validate(rawObject);
```

---

### `ActionExecutor`

Low-level executor for running individual actions without a full `FarcasterAgent` instance.

```ts
import { ActionExecutor } from 'farcaster-agent-sdk/executor';

const executor = new ActionExecutor({
  defaultContext: { baseUrl: 'https://myapp.xyz' },
});

const result = await executor.execute(action, params, context?);
```

**Execution Context:**

```ts
interface ExecutionContext {
  viemClient?: PublicClient | WalletClient; // for contract actions
  headers?: Record<string, string>;         // for API actions
  baseUrl?: string;                         // for relative API locations
  timeoutMs?: number;                       // default: 30000
}
```

---

### `AgentEventEmitter`

Standalone typed event emitter, usable independently of `FarcasterAgent`.

```ts
import { AgentEventEmitter } from 'farcaster-agent-sdk/events';

const emitter = new AgentEventEmitter();
emitter.on('action:success', (e) => console.log(e));
```

---

## Contract Actions (viem)

Pass a viem `PublicClient` or `WalletClient` via `ExecutionContext.viemClient`:

```ts
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({ chain: base, transport: http() });

const result = await agent.execute('getBalance', {}, {
  viemClient: publicClient,
});
```

---

## License

MIT
