import { Inject, Injectable, LoggerService, NotFoundException } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { KeyListResponse, KeyWithModuleAddress } from './entities';
import { RegistryService } from 'jobs/registry.service';
import { ConfigService, GROUPED_ONCHAIN_V1_TYPE } from 'common/config';
import { ELBlockSnapshot, KeyQuery } from 'http/common/entities';
import { getSRModuleByType } from 'http/common/sr-modules.utils';

@Injectable()
export class KeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected keyRegistryService: RegistryService,
    protected configService: ConfigService,
  ) {}

  async get(filters: KeyQuery): Promise<KeyListResponse> {
    //TODO: In future iteration for staking router here will be method to get keys from all modules
    const chainId = this.configService.get('CHAIN_ID');
    const moduleType = GROUPED_ONCHAIN_V1_TYPE;
    const registryModule = getSRModuleByType(moduleType, chainId);

    if (!registryModule) {
      throw new NotFoundException(`Module with type ${moduleType} not found`);
    }

    const { keys, meta } = await this.keyRegistryService.getKeysWithMeta(filters);

    if (!meta) {
      return {
        data: [],
        meta: null,
      };
    }

    const registryKeys: KeyWithModuleAddress[] = keys.map(
      (key) => new KeyWithModuleAddress(key, registryModule.stakingModuleAddress),
    );
    const elBlockSnapshot = new ELBlockSnapshot(meta);

    return {
      // swagger ui не справляется с выводом всех значений
      // но пагинацию добавить не можем
      data: registryKeys,
      meta: {
        elBlockSnapshot,
      },
    };
  }

  async getByPubkey(pubkey: string): Promise<KeyListResponse> {
    const { keys, meta } = await this.keyRegistryService.getKeyWithMetaByPubkey(pubkey);
    const chainId = this.configService.get('CHAIN_ID');
    const moduleType = GROUPED_ONCHAIN_V1_TYPE;
    const registryModule = getSRModuleByType(moduleType, chainId);

    if (!registryModule) {
      throw new NotFoundException(`Module with type ${moduleType} not found`);
    }

    if (!meta) {
      return {
        data: [],
        meta: null,
      };
    }

    const registryKeys: KeyWithModuleAddress[] = keys.map(
      (key) => new KeyWithModuleAddress(key, registryModule.stakingModuleAddress),
    );

    const elBlockSnapshot = new ELBlockSnapshot(meta);

    return {
      data: registryKeys,
      meta: {
        elBlockSnapshot,
      },
    };
  }

  async getByPubkeys(pubkeys: string[]): Promise<KeyListResponse> {
    // TODO: In future iteration for staking router here will be method to get keys from all modules
    // TODO: where will we use this method?
    const { keys, meta } = await this.keyRegistryService.getKeysWithMetaByPubkeys(pubkeys);
    const chainId = this.configService.get('CHAIN_ID');
    const moduleType = GROUPED_ONCHAIN_V1_TYPE;
    const registryModule = getSRModuleByType(moduleType, chainId);

    if (!registryModule) {
      throw new NotFoundException(`Module with type ${moduleType} not found`);
    }

    if (!meta) {
      return {
        data: [],
        meta: null,
      };
    }

    const registryKeys: KeyWithModuleAddress[] = keys.map(
      (key) => new KeyWithModuleAddress(key, registryModule.stakingModuleAddress),
    );

    const elBlockSnapshot = new ELBlockSnapshot(meta);

    return {
      data: registryKeys,
      meta: {
        elBlockSnapshot,
      },
    };
  }
}
