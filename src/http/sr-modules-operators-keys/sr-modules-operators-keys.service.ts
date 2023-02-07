import { Injectable, NotFoundException } from '@nestjs/common';
import { ELBlockSnapshot, ModuleId, SRModule } from 'http/common/entities';
import { CuratedOperator, RegistryKey as CuratedKey } from 'http/common/entities';
import { KeyQuery } from 'http/common/entities';
import { RegistryService } from 'jobs/registry.service';
import { ConfigService, GROUPED_ONCHAIN_V1_TYPE } from 'common/config';
import { getSRModule } from 'http/common/sr-modules.utils';
import { SRModuleOperatorsKeysResponse } from './entities';

@Injectable()
export class SRModulesOperatorsKeysService {
  constructor(protected readonly registry: RegistryService, protected readonly configService: ConfigService) {}

  public async get(moduleId: ModuleId, filters: KeyQuery): Promise<SRModuleOperatorsKeysResponse> {
    // At first we should find module by id in our list, in future without chainId
    const chainId = this.configService.get('CHAIN_ID');
    const module = getSRModule(moduleId, chainId);

    if (!module) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }
    // We supppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (module.type == GROUPED_ONCHAIN_V1_TYPE) {
      const { keys, operators, meta } = await this.registry.getData(filters);

      if (!meta) {
        return {
          data: null,
          meta: null,
        };
      }

      const curatedKeys: CuratedKey[] = keys.map((key) => new CuratedKey(key));
      const curatedOperators: CuratedOperator[] = operators.map((op) => new CuratedOperator(op));
      const elBlockSnapshot = new ELBlockSnapshot(meta);

      return {
        data: {
          operators: curatedOperators,
          keys: curatedKeys,
          module: new SRModule(meta.keysOpIndex, module),
        },

        meta: {
          elBlockSnapshot,
        },
      };
    }
  }
}