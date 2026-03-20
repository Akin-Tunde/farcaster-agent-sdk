/**
 * farcaster-agent-sdk — Usage Examples
 */

import {
  FarcasterAgent,
  ManifestBuilder,
  AgentCompiler,
  ManifestClient,
  ManifestValidator,
} from 'farcaster-agent-sdk';

// ─── 1. Load a manifest from a URL and execute an action ─────────────────────

async function example1() {
  const agent = await FarcasterAgent.load('https://coinflip.xyz/agent.json', {
    executor: {
      defaultContext: {
        baseUrl: 'https://coinflip.xyz',
        headers: { Authorization: 'Bearer my-token' },
      },
    },
  });

  console.log(agent.summary());

  const result = await agent.execute('flip', { choice: 'heads', amount: 0.01 });
  if (result.success) {
    console.log('Result:', result.data, `(${result.durationMs}ms)`);
  } else {
    console.error('Failed:', result.error);
  }
}

// ─── 2. Listen to events ──────────────────────────────────────────────────────

async function example2() {
  const agent = await FarcasterAgent.load('https://myapp.xyz/agent.json');

  agent
    .on('action:start', ({ action, params }) =>
      console.log(`▶ ${action}`, params)
    )
    .on('action:success', ({ action, result }) =>
      console.log(`✅ ${action} (${result.durationMs}ms)`)
    )
    .on('action:error', ({ action, error }) =>
      console.error(`❌ ${action}:`, error.message)
    );

  await agent.execute('someAction', { value: 42 });
}

// ─── 3. Stream a long-running action via SSE ──────────────────────────────────

async function example3() {
  const agent = await FarcasterAgent.load('https://myapp.xyz/agent.json');

  agent.on('stream:data', ({ chunk }) => process.stdout.write(String(chunk)));
  agent.on('stream:end', () => console.log('\n[done]'));

  const stream = agent.stream('generateText');
  await stream.open(
    { transport: 'sse', url: 'https://myapp.xyz/api/generate/stream' },
    { prompt: 'Hello world' }
  );
}

// ─── 4. Build a manifest in code with ManifestBuilder ────────────────────────

function example4() {
  const manifest = new ManifestBuilder('CoinFlip')
    .setDescription('A provably fair coin flip game on Farcaster')
    .setVersion('1.2.0')
    .setMetadata({
      homeUrl: 'https://coinflip.xyz',
      iconUrl: 'https://coinflip.xyz/icon.png',
    })
    .addCapability('wallet')
    .addApiAction({
      name: 'flip',
      description: 'Flip a coin and win ETH if you guess correctly',
      location: '/api/flip',
      method: 'POST',
      parameters: {
        properties: {
          choice: {
            type: 'string',
            description: 'Your bet: "heads" or "tails"',
            enum: ['heads', 'tails'],
            required: true,
          },
          amount: {
            type: 'number',
            description: 'Amount of ETH to wager',
            minimum: 0.001,
            maximum: 1,
            required: true,
          },
        },
      },
      returns: { type: 'object', description: 'Flip result and transaction hash' },
    })
    .addContractAction({
      name: 'getBalance',
      description: 'Read the contract prize pool balance',
      location: '0xYourContractAddress',
      abiFunction: 'getBalance',
      isReadOnly: true,
      chainId: 8453, // Base
      parameters: { properties: {} },
      returns: { type: 'number', description: 'Prize pool in wei' },
    })
    .build();

  console.log(JSON.stringify(manifest, null, 2));
  return manifest;
}

// ─── 5. Compile a project programmatically ───────────────────────────────────

async function example5() {
  // Dry run — returns manifest without writing
  const manifest = await AgentCompiler.compile({
    path: './my-farcaster-app',
    dryRun: true,
  });

  console.log(`Detected ${manifest.actions.length} actions`);

  // Write to disk
  await AgentCompiler.compile({
    path: './my-farcaster-app',
    output: './.farcaster/agent.json',
  });
}

// ─── 6. Validate a manifest ───────────────────────────────────────────────────

function example6() {
  const validator = new ManifestValidator();

  const result = validator.validate({
    name: 'My App',
    description: 'Does cool things',
    version: '1.0.0',
    metadata: {},
    capabilities: ['wallet'],
    actions: [],
  });

  if (result.valid) {
    console.log('✅ Valid');
    if (result.warnings.length > 0) {
      console.warn('⚠️  Warnings:', result.warnings);
    }
  } else {
    console.error('❌ Errors:', result.errors);
  }
}

// ─── 7. Load from file (Node.js) ─────────────────────────────────────────────

function example7() {
  const agent = FarcasterAgent.fromFile('./agent.json', {
    executor: {
      defaultContext: { baseUrl: 'http://localhost:3000' },
    },
  });

  console.log('Loaded:', agent.name);
  console.log('Actions:', agent.getActions().map((a) => a.name));
  console.log('Has wallet?', agent.hasCapability('wallet'));
}

// ─── 8. Use ManifestClient directly ──────────────────────────────────────────

async function example8() {
  const client = new ManifestClient({ strict: false });
  const manifest = await client.fromUrl('https://myapp.xyz/agent.json');

  const apiActions = client.getActionsByType('api');
  const contractActions = client.getActionsByType('contract');

  console.log(`API actions: ${apiActions.map((a) => a.name).join(', ')}`);
  console.log(`Contract actions: ${contractActions.map((a) => a.name).join(', ')}`);

  const validation = client.validate();
  console.log('Warnings:', validation.warnings);
}
