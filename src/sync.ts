import 'reflect-metadata';
import { AppDataSource } from './dataSource';
import { File } from './Entity/File';
import { listFilesInContainer } from './services/azureBlobService';
import dotenv from 'dotenv';

dotenv.config();

const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'azure-blob-container';
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';

AppDataSource.initialize().then(async () => {
  const fileRepository = AppDataSource.getRepository(File);

  const blobFiles = await listFilesInContainer(AZURE_STORAGE_CONTAINER_NAME);

  const fileEntities = blobFiles.map(blobName => {
    const file = new File();
    file.name = blobName;
    file.url = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${blobName}`;
    file.type = 'unknown'; // You may need to determine the type based on your requirements
    file.date = new Date().toISOString();
    return file;
  });

  await fileRepository.save(fileEntities);

  console.log('Sync complete');
  process.exit(0);
}).catch(error => console.log(error));
