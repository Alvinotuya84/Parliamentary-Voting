import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'db',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'parliament_voting',

    // Entities configuration
    entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],

    // Auto-loading of entities
    autoLoadEntities: true,

    // Synchronize should be false in production
    synchronize: process.env.NODE_ENV === 'development',

    // Migrations configuration
    migrations: [join(__dirname, '..', 'database', 'migrations', '*{.ts,.js}')],
    migrationsRun: process.env.NODE_ENV === 'production',
    migrationsTableName: 'migrations',

    // Logging configuration
    logging: process.env.NODE_ENV === 'development',
    logger: 'file',

    // Connection pool settings
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE, 10) || 10,
    maxQueryExecutionTime: 10000, // Log queries taking more than 10 seconds

    // SSL configuration for production
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,

    // Cache configuration
    cache: {
      duration: 60000, // Cache for 1 minute
    },
  }),
);
