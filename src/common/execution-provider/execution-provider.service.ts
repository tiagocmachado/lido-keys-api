import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { CHAINS } from '@lido-nestjs/constants';
import { Injectable, Inject } from '@nestjs/common';
import { Trace } from 'common/decorators/trace';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';

const TRACE_TIMEOUT = 30 * 1000;

@Injectable()
export class ExecutionProviderService {
  constructor(
    protected readonly provider: SimpleFallbackJsonRpcBatchProvider,
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
  ) {}

  /**
   * Returns network name
   */
  public async getNetworkName(): Promise<string> {
    const network = await this.provider.getNetwork();
    const name = CHAINS[network.chainId]?.toLocaleLowerCase();
    return name || network.name;
  }

  /**
   * Returns current chain id
   */
  public async getChainId(): Promise<number> {
    const { chainId } = await this.provider.getNetwork();
    return chainId;
  }

  /**
   *
   * Returns block hash
   */
  @Trace(TRACE_TIMEOUT)
  public async getBlockHash(blockHashOrBlockTag: number | string): Promise<string> {
    const block = await this.provider.getBlock(blockHashOrBlockTag);
    return block.hash;
  }
}
