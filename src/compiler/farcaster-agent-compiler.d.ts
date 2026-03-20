// Declaration shims for farcaster-agent-compiler internal dist paths.
// These modules exist at runtime but ship no .d.ts files.
// We declare them as `any` so the DTS build doesn't error.

declare module 'farcaster-agent-compiler' {
  export const DiscoveryService: any;
  export const TSParser: any;
  export const ManifestGenerator: any;
  [key: string]: any;
}

declare module 'farcaster-agent-compiler/dist/discovery/service.js' {
  export const DiscoveryService: any;
}

declare module 'farcaster-agent-compiler/dist/parser/ts-parser.js' {
  export const TSParser: any;
}

declare module 'farcaster-agent-compiler/dist/generator/json.js' {
  export const ManifestGenerator: any;
}
