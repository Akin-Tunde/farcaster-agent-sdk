import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'manifest/index': 'src/manifest/index.ts',
    'compiler/index': 'src/compiler/index.ts',
    'executor/index': 'src/executor/index.ts',
    'events/index': 'src/events/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['viem', 'ts-morph', 'tinyglobby'],
});
