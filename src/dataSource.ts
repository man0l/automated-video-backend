import { DataSource } from 'typeorm';
import { File } from './Entity/File';
import dotenv from 'dotenv';
import { Project } from './Entity/Project';
import { Job } from './Entity/Job'; 

dotenv.config();

console.log('Initializing data source...');

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.TYPEORM_HOST || 'localhost',
  port: Number(process.env.TYPEORM_PORT) || 5432,
  username: process.env.TYPEORM_USERNAME || 'your-username',
  password: process.env.TYPEORM_PASSWORD || 'your-password',
  database: process.env.TYPEORM_DATABASE || 'your-database',
  synchronize: true,
  logging: false,
  entities: [File, Project, Job],
  migrations: [],
  subscribers: [],
});

console.log('Data source initialized.');
