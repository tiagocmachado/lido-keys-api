import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService, GROUPED_ONCHAIN_V1_TYPE } from 'common/config';
import { RegistryService } from 'jobs/registry.service';
import { ModuleId } from 'http/common/entities/';
import { ELBlockSnapshot, SRModule, CuratedOperator } from 'http/common/entities/';
import { getSRModule, getSRModuleByType } from 'http/common/sr-modules.utils';
import {
  GroupedByModuleOperatorListResponse,
  SRModuleOperatorListResponse,
  SRModuleOperatorResponse,
} from './entities';

@Injectable()
export class SRModulesOperatorsService {
  constructor(protected configService: ConfigService, protected registryService: RegistryService) {}

  public async getAll(): Promise<GroupedByModuleOperatorListResponse> {
    const { operators, meta } = await this.registryService.getOperatorsWithMeta();

    if (!meta) {
      return {
        data: [],
        meta: null,
      };
    }

    const curatedOperators: CuratedOperator[] = operators.map((op) => new CuratedOperator(op));
    const chainId = this.configService.get('CHAIN_ID');
    const curatedModule = getSRModuleByType(GROUPED_ONCHAIN_V1_TYPE, chainId);
    const elBlockSnapshot = new ELBlockSnapshot(meta);

    return {
      data: [{ operators: curatedOperators, module: new SRModule(meta.keysOpIndex, curatedModule) }],
      meta: {
        elBlockSnapshot,
      },
    };
  }

  public async getByModule(moduleId: ModuleId): Promise<SRModuleOperatorListResponse> {
    // At first we should find module by id in our list, in future without chainId
    const chainId = this.configService.get('CHAIN_ID');
    const module = getSRModule(moduleId, chainId);

    if (!module) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }
    // We supppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (module.type == GROUPED_ONCHAIN_V1_TYPE) {
      const { operators, meta } = await this.registryService.getOperatorsWithMeta();

      if (!meta) {
        return {
          data: null,
          meta: null,
        };
      }

      const curatedOperators: CuratedOperator[] = operators.map((op) => new CuratedOperator(op));
      const elBlockSnapshot = new ELBlockSnapshot(meta);
      return {
        data: { operators: curatedOperators, module: new SRModule(meta.keysOpIndex, module) },
        meta: {
          elBlockSnapshot,
        },
      };
    }
  }

  public async getModuleOperator(moduleId: ModuleId, operatorIndex: number): Promise<SRModuleOperatorResponse> {
    // At first we should find module by id in our list, in future without chainId
    const chainId = this.configService.get('CHAIN_ID');
    const module = getSRModule(moduleId, chainId);

    if (!module) {
      throw new NotFoundException(`Module with moduleId ${moduleId} is not supported`);
    }
    // We supppose if module in list, Keys API knows how to work with it
    // it is also important to have consistent module info and meta

    if (module.type == GROUPED_ONCHAIN_V1_TYPE) {
      const { operator, meta } = await this.registryService.getOperatorByIndex(operatorIndex);

      if (!meta) {
        // todo : add log
        return {
          data: null,
          meta: null,
        };
      }

      if (!operator) {
        throw new NotFoundException(
          `Operator with index ${operatorIndex} is not found for module with moduleId ${moduleId}`,
        );
      }

      const curatedOperator: CuratedOperator = new CuratedOperator(operator);
      const elBlockSnapshot = new ELBlockSnapshot(meta);
      return {
        data: { operator: curatedOperator, module: new SRModule(meta.keysOpIndex, module) },
        meta: {
          elBlockSnapshot,
        },
      };
    }
  }
}