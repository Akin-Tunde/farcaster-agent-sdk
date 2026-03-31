// C:\dev\New folder\farcaster-agent-sdk\src\auth.ts
import { hexToBytes } from 'viem';
import { ed25519 } from '@noble/curves/ed25519';

export async function verifyFarcasterSignature(
  message: string, 
  signature: string, 
  publicKey: string
): Promise<boolean> {
  try {
    const sigBytes = hexToBytes(signature as `0x${string}`);
    const pubKeyBytes = hexToBytes(publicKey as `0x${string}`);
    const msgBytes = new TextEncoder().encode(message);
    return ed25519.verify(sigBytes, msgBytes, pubKeyBytes);
  } catch (e) {
    return false;
  }
}
/**
 * Resolves a Farcaster Public Key to an FID.
 * @param publicKey The hex string of the signer
 * @param apiKey The user's own Neynar API Key
 */
export async function getFidFromPublicKey(publicKey: string, apiKey?: string) {
  // 1. Prioritize the passed argument, then the Environment Variable
  const finalKey = apiKey || process.env.NEYNAR_API_KEY;

  if (!finalKey) {
    throw new Error("Neynar API Key is required. Provide it in the function call or set NEYNAR_API_KEY in your .env file.");
  }

  try {
    const response = await fetch(`https://api.neynar.com/v2/farcaster/signer?signer_uuid=${publicKey}`, {
      headers: { 
        'accept': 'application/json',
        'api_key': finalKey 
      }
    });
    const data = await response.json();
    return { fid: data.fid, user: data.user };
  } catch (error) {
    return null;
  }
}