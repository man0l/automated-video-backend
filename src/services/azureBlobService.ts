import { BlobItem, BlobServiceClient } from '@azure/storage-blob';
import dotenv from 'dotenv';

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
