import 'reflect-metadata';
import { AppDataSource } from './dataSource';
import express, { Router } from 'express';
import bodyParser from 'body-parser';
import fileRoutes from './routes/fileRoutes';
import azureRoutes from './routes/azureRoutes';
import projectRoutes from './routes/projectRoutes';
import dotenv from 'dotenv';
import { AbortController } from 'abort-controller';
import cors from 'cors';

(global as any).AbortController = AbortController;

dotenv.config(); // Load environment variables from .env file

AppDataSource.initialize().then(async () => {
  const app = express();
  const port = 3000;

  app.use(bodyParser.json());
  app.use(cors());

  const apiRouter = Router();
  apiRouter.use(fileRoutes);
  apiRouter.use(azureRoutes);
  apiRouter.use(projectRoutes);

  app.use('/api', apiRouter);

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch(error => console.log(error));
