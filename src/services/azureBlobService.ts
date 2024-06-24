import { BlobItem, BlobServiceClient, ContainerSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';
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


export const generateSasToken = (containerName: string): Promise<string> => {
  const containerClient = blobServiceClient.getContainerClient(containerName);

  const sasToken = containerClient.generateSasUrl({
    permissions: ContainerSASPermissions.parse('r'),
    startsOn: new Date(new Date().valueOf() - 86400),
    expiresOn: new Date(new Date().valueOf() + 86400)
  });

  return sasToken;
};

export const generateSasTokenForBlob = (containerName: string, blobName: string): Promise<string> => {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  const sasToken = blobClient.generateSasUrl({
    permissions: ContainerSASPermissions.parse('r'),
    startsOn: new Date(new Date().valueOf() - 86400),
    expiresOn: new Date(new Date().valueOf() + 86400)
  });

  return sasToken;
}