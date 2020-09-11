import Knex from 'knex';
import database from '../database';
import { Accountability, AbstractServiceOptions } from '../types';
import { DatabaseNotFoundException, ForbiddenException } from '../exceptions';
import env from '../env';

//can't use knex for most of this dbbackups are bashtools and cannot
// call from .raw

export default class DatabaseBackupService {
	accountability: Accountability | null;
	knex: Knex;

	constructor(options?: AbstractServiceOptions) {
		this.accountability = options?.accountability || null;
		this.knex = options?.knex || database;
	}

	exportDb() {
		let backup = './backup/dump.sql';

		switch (env.DB_CLIENT) {
			case 'sqlite3':
				backup = './backup/dump.db';
				const fs = require('fs');

				fs.copyFile(env.DB_FILENAME, backup, (err: string) => {
					if (err) {
						throw new DatabaseNotFoundException(err);
					}
				});
				break;

			case 'pg':
				//need to rewrite as creates empty file
				const { PostgreSql } = require('@shagital/db-dumper');
				PostgreSql.create()
					.setDbName(env.DB_NAME)
					.setUserName(env.DB_USER)
					.setPassword(env.DB_PASSWORD)
					.dumpToFile(backup);
				break;

			case 'mysql':
				const { MySql } = require('@shagital/db-dumper');
				MySql.create()
					.setDbName(env.DB_NAME)
					.setUserName(env.DB_USER)
					.setPassword(env.DB_PASSWORD)
					.dumpToFile(backup);

				break;

			case 'oracledb':
				//need to do - thinking of best way
				const oracle = require('oracledb');
				break;

			case 'mssql':
				// need to use SQL for this

				const backupSQL = `BACKUP DATABASE [${env.DB_DATABASE}] TO DISK = N'${env.STORAGE_LOCAL_ROOT}/dump.bak' WITH NOFORMAT, NOINIT, NAME = N'SQLTestDB-Full Database Backup', SKIP, NOREWIND, NOUNLOAD,  STATS = 10 GO`;
				this.knex.raw(backupSQL);
				backup = './backup/dump.bak';
				break;

			default:
				backup = 'none';
				break;
		}

		return backup;
	}

	async cleanUp(fileName: string) {
		//this is needed as lots of exports only support export to local disk and then need to stream
		const fs = require('fs');

		try {
			if (fs.existsSync(fileName)) {
				//file exists

				fs.unlinkSync(fileName);
			}
		} catch (err) {
			throw new DatabaseNotFoundException('Cleanup failed');
		}
	}
}