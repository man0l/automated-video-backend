import 'reflect-metadata';
import { AppDataSource } from './dataSource';
import express, { Router } from 'express';
import bodyParser from 'body-parser';
import fileRoutes from './routes/fileRoutes';
import azureRoutes from './routes/azureRoutes';
import projectRoutes from './routes/projectRoutes';
import templateRoutes from './routes/templateRoutes';
import scenarioRoutes from './routes/scenarioRoutes';
import dotenv from 'dotenv';
import { AbortController } from 'abort-controller';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';


(global as any).AbortController = AbortController;

dotenv.config(); // Load environment variables from .env file

AppDataSource.initialize().then(async () => {
  const app = express();
  const port = 3000;

  app.use(bodyParser.json());
  app.use(cors());

  const jsonReplacer = (key: any, value: any) => {
    key;
    return typeof value === 'bigint' ? value.toString() : value; 
  };
  
  app.use((req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    res.json = function (data: any) {
        const jsonResponse = JSON.stringify(data, jsonReplacer);
        return originalJson.call(this, JSON.parse(jsonResponse));
    };
    next();
  });

  const apiRouter = Router();
  apiRouter.use(fileRoutes);
  apiRouter.use(azureRoutes);
  apiRouter.use(projectRoutes);
  apiRouter.use(templateRoutes);
  apiRouter.use(scenarioRoutes);

  app.use('/api', apiRouter);

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch(error => console.log(error));
