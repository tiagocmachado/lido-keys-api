/* eslint-disable @typescript-eslint/no-var-requires  */
import { Options, Utils } from '@mikro-orm/core';
import * as dotenv from 'dotenv';
import * as glob from 'glob';
import * as path from 'path';
import { MigrationObject } from '@mikro-orm/core/typings';
import { RegistryMeta, RegistryOperator, RegistryKey } from '@lido-nestjs/registry';
import { ConsensusMetaEntity } from '@lido-nestjs/validators-registry/dist/storage/consensus-meta.entity';
import { ConsensusValidatorEntity } from '@lido-nestjs/validators-registry/dist/storage/consensus-validator.entity';
import { readFileSync } from 'fs';

dotenv.config();

// https://github.com/mikro-orm/mikro-orm/issues/1842
// disableForeignKeys = false
// default — true
const MIKRO_ORM_DISABLE_FOREIGN_KEYS =
  process.env.MIKRO_ORM_DISABLE_FOREIGN_KEYS === 'true' || process.env.MIKRO_ORM_DISABLE_FOREIGN_KEYS === undefined
    ? true
    : false;

// TODO move this to nestjs packages
const findMigrations = (mainFolder: string, npmPackageNames: string[]): MigrationObject[] => {
  const cwd = process.cwd();
  const folders = [mainFolder, ...npmPackageNames.map((npmPackage) => `./node_modules/${npmPackage}/dist/migrations/`)];
  const filenames = folders
    .map((folder) => {
      const extPattern = Utils.detectTsNode() ? '!(*.d).{js,ts}' : '*.js';
      const filePathPattern = `${path.isAbsolute(folder) ? folder : path.join(cwd, folder)}/Migration${extPattern}`;
      return glob.sync(filePathPattern);
    })
    .flat();

  const isNullOrUndefined = (val: unknown): val is null | undefined => val === null || typeof val === 'undefined';
  const isNotNullOrUndefined = <T>(val: T | undefined | null): val is T => !isNullOrUndefined(val);

  const migrations = filenames
    .map((filename) => {
      const module = require(filename);
      const ext = path.extname(filename);
      const fileNameWithoutExt = path.basename(filename, ext);
      // TODO: readable var name
      const migrationClass = module[fileNameWithoutExt];

      if (migrationClass) {
        return { name: fileNameWithoutExt, class: migrationClass };
      }

      return null;
    })
    .filter(isNotNullOrUndefined);

  // TODO think about Nest.js logger
  console.log(`Found [${migrations.length}] DB migration files.`);

  return migrations;
};

// TODO move this to nestjs packages
const getMigrationOptions = (mainMigrationsFolder: string, npmPackageNames: string[]): Options['migrations'] => {
  return {
    tableName: 'mikro_orm_migrations', // name of database table with log of executed transactions
    path: mainMigrationsFolder, // path to the folder with migrations
    transactional: true, // wrap each migration in a transaction
    disableForeignKeys: MIKRO_ORM_DISABLE_FOREIGN_KEYS, // wrap statements with `set foreign_key_checks = 0` or equivalent
    allOrNothing: true, // wrap all migrations in master transaction
    dropTables: true, // allow to disable table dropping
    safe: false, // allow to disable table and column dropping
    snapshot: false, // save snapshot when creating new migrations
    emit: 'ts', // migration generation mode,
    migrationsList: findMigrations(mainMigrationsFolder, npmPackageNames),
  };
};

const DB_PASSWORD =
  process.env.DB_PASSWORD ||
  (process.env.DB_PASSWORD_FILE &&
    readFileSync(process.env.DB_PASSWORD_FILE, 'utf-8')
      .toString()
      .replace(/(\r\n|\n|\r)/gm, '')
      .trim());

if (!DB_PASSWORD) {
  console.error('Please set postgres password in DB_PASSWORD or in file DB_PASSWORD_FILE');
  process.exit(1);
}

const config: Options = {
  type: 'postgresql',
  dbName: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: parseInt(process?.env?.DB_PORT ?? '', 10),
  user: process.env.DB_USER,
  password: DB_PASSWORD,
  entities: [RegistryKey, RegistryOperator, RegistryMeta, ConsensusValidatorEntity, ConsensusMetaEntity],
  migrations: getMigrationOptions(path.join(__dirname, 'migrations'), [
    '@lido-nestjs/registry',
    '@lido-nestjs/validators-registry',
  ]),
};

export default config;
