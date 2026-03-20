import type { ContractAction, ActionParams, ExecutionContext, ExecutionResult } from '../types';

/**
 * ContractExecutor uses viem to call smart contract functions.
 * viem is a peer dependency — callers must provide a configured client
 * via ExecutionContext.viemClient.
 *
 * Read-only actions use publicClient.readContract().
 * Write actions use walletClient.writeContract().
 */
export class ContractExecutor {
  async execute<T = unknown>(
    action: ContractAction,
    params: ActionParams,
    ctx: ExecutionContext = {}
  ): Promise<ExecutionResult<T>> {
    const start = Date.now();

    try {
      if (!ctx.viemClient) {
        throw new Error(
          'ContractExecutor requires a viem client in ExecutionContext.viemClient. ' +
          'Pass a publicClient for reads, or a walletClient for writes.'
        );
      }

      const client = ctx.viemClient as Record<string, unknown>;
      const abiFunction = action.abiFunction ?? action.name;

      // Build minimal ABI from the action's parameter schema
      const abi = this.buildMinimalAbi(action, abiFunction);
      const args = this.buildArgs(action, params);

      let data: unknown;

      if (action.isReadOnly) {
        // publicClient.readContract
        if (typeof client['readContract'] !== 'function') {
          throw new Error('viemClient does not have readContract — pass a PublicClient for read actions');
        }
        data = await (client['readContract'] as Function)({
          address: action.location as `0x${string}`,
          abi,
          functionName: abiFunction,
          args,
          ...(action.chainId ? { chainId: action.chainId } : {}),
        });
      } else {
        // walletClient.writeContract
        if (typeof client['writeContract'] !== 'function') {
          throw new Error('viemClient does not have writeContract — pass a WalletClient for write actions');
        }
        data = await (client['writeContract'] as Function)({
          address: action.location as `0x${string}`,
          abi,
          functionName: abiFunction,
          args,
          ...(action.chainId ? { chainId: action.chainId } : {}),
        });
      }

      return {
        success: true,
        data: data as T,
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

  /**
   * Build a minimal viem-compatible ABI entry from the action's parameter schema.
   * This is used when no full ABI file is available.
   */
  private buildMinimalAbi(action: ContractAction, functionName: string): unknown[] {
    const inputs = Object.entries(action.parameters.properties).map(
      ([name, prop]) => ({
        name,
        type: this.mapToSolidityType(prop.type),
        internalType: this.mapToSolidityType(prop.type),
      })
    );

    return [
      {
        type: 'function',
        name: functionName,
        inputs,
        outputs: [{ name: '', type: this.mapToSolidityType(action.returns.type) }],
        stateMutability: action.isReadOnly ? 'view' : 'nonpayable',
      },
    ];
  }

  /** Order params as positional args for viem */
  private buildArgs(action: ContractAction, params: ActionParams): unknown[] {
    return Object.keys(action.parameters.properties).map((key) => params[key]);
  }

  private mapToSolidityType(type: string): string {
    switch (type) {
      case 'number': return 'uint256';
      case 'boolean': return 'bool';
      case 'string': return 'string';
      case 'array': return 'bytes[]';
      case 'object': return 'bytes';
      default: return 'bytes';
    }
  }
}
