import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import databaseConfig from './database.config';

config(); // Load .env file

const configService = new ConfigService();
const dbConfig = databaseConfig();

export const dataSource = new DataSource({
  ...(dbConfig as DataSourceOptions),
  migrations: ['src/database/migrations/*.ts'],
  entities: ['src/**/*.entity.ts'],
});
