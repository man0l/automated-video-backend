import { Router } from 'express';
import { listFilesInContainer } from '../services/azureBlobService';
import { AppDataSource } from '../dataSource';
import { File } from '../Entity/File';
import dotenv from 'dotenv';
import * as path from 'path';

const router = Router();
dotenv.config();

const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'azure-blob-container';

// Get all files
router.get('/files', async (req, res) => {
  try {
    const fileRepository = AppDataSource.getRepository(File);
    const files = await fileRepository.find();
    res.json(files);
  } catch (error) {
    console.error('Error fetching files from the database:', error);
    res.status(500).send('Error fetching files from the database');
  }
});

// Get a file by id
router.get('/files/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const fileRepository = AppDataSource.getRepository(File);
    const file = await fileRepository.findOneBy({ id });
    if (file) {
      res.json(file);
    } else {
      res.status(404).send('File not found');
    }
  } catch (error) {
    console.error('Error fetching file from the database:', error);
    res.status(500).send('Error fetching file from the database');
  }
});

// Sync files from Azure Blob Storage to the database
router.post('/sync', async (req, res) => {
  try {
    const fileRepository = AppDataSource.getRepository(File);
    const blobFiles = await listFilesInContainer(AZURE_STORAGE_CONTAINER_NAME);

    const fileEntities = [];

    for (const blobPath of blobFiles) {
      if (!blobPath) {
        console.error('Invalid blobPath:', blobPath);
        continue;
      }
      const url = `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${blobPath}`;
      const date = new Date().toISOString();

      // Check if the file already exists in the database
      const existingFile = await fileRepository.findOneBy({ path: blobPath });
      if (!existingFile) {
        const file = new File();
        file.name = path.basename(blobPath); // Extract file name from the path
        file.url = url;
        file.path = blobPath;

        fileEntities.push(file);
      }
    }

    if (fileEntities.length > 0) {
      await fileRepository.save(fileEntities);
    }

    res.json({ message: 'Sync complete', files: fileEntities });
  } catch (error) {
    console.error('Error syncing files:', error);
    res.status(500).send('Error syncing files');
  }
});

// Delete a file by id - Note: This assumes files are deleted via some other mechanism
router.delete('/api/files/:id', (req, res) => {
  res.status(501).send('Not Implemented');
});

export default router;
