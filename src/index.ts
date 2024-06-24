import 'reflect-metadata';
import { AppDataSource } from './dataSource';
import express from 'express';
import bodyParser from 'body-parser';
import fileRoutes from './routes/fileRoutes';
import dotenv from 'dotenv';
import { AbortController } from 'abort-controller';

(global as any).AbortController = AbortController;

dotenv.config(); // Load environment variables from .env file

AppDataSource.initialize().then(async () => {
  const app = express();
  const port = 3000;

  app.use(bodyParser.json());

  app.use('/api', fileRoutes);

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch(error => console.log(error));
