import { BlobItem, BlobServiceClient, ContainerSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';
import dotenv from 'dotenv';
import { AppDataSource } from '../dataSource';
import { File } from '../Entity/File';

dotenv.config();

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error('Azure Storage connection string not found');
}

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

export const listFilesInContainer = async (containerName: string): Promise<BlobItem[]> => {

  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobNames: BlobItem[] = [];

  for await (const blob of containerClient.listBlobsFlat()) {
    blobNames.push(blob);
  }

  return blobNames;
};


export const generateSasToken = (containerName: string, permissions: string = 'r'): Promise<string> => {
  const containerClient = blobServiceClient.getContainerClient(containerName);

  const sasToken = containerClient.generateSasUrl({
    permissions: ContainerSASPermissions.parse(permissions),
    startsOn: new Date(new Date().valueOf() - 86400),
    expiresOn: new Date(new Date().valueOf() + 86400)
  });

  return sasToken;
};

export const generateSasTokenForBlob = (containerName: string, blobName: string, permissions= 'r'): Promise<string> => {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  const sasToken = blobClient.generateSasUrl({
    permissions: ContainerSASPermissions.parse(permissions),
    startsOn: new Date(new Date().valueOf() - 86400),
    expiresOn: new Date(new Date().valueOf() + 86400)
  });

  return sasToken;
}

export const uploadFileToBlob = async (containerName: string, filePath: string, blobName: string) => {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlockBlobClient(blobName);

  const uploadBlobResponse = await blobClient.uploadFile(filePath);
  return uploadBlobResponse;
}

export const deleteMissingFilesFromDatabase = async (blobPaths: Set<string>) => {
  const fileRepository = AppDataSource.getRepository(File);
  const batchSize = 100;
  let pageIndex = 0;
  let filesToDelete: File[] = [];

  while (true) {
    const [files, totalFiles] = await fileRepository.findAndCount({
      skip: pageIndex * batchSize,
      take: batchSize,
    });

    if (files.length === 0) {
      break;
    }

    const filesInBatchToDelete = files.filter(file => !blobPaths.has(file.path));
    
    filesToDelete = filesToDelete.concat(filesInBatchToDelete);

    if (filesInBatchToDelete.length > 0) {
      await fileRepository.remove(filesInBatchToDelete);
    }

    pageIndex++;

    if (pageIndex * batchSize >= totalFiles) {
      break;
    }
  }

  return filesToDelete;
};
