import { Router } from 'express';
import { AppDataSource } from '../dataSource';
import { File } from '../Entity/File';
import { listFilesInContainer } from '../services/azureBlobService';
import dotenv from 'dotenv';

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

    for (const blobName of blobFiles) {
      const url = `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${blobName}`;
      const date = new Date().toISOString();

      // Check if the file already exists in the database
      const existingFile = await fileRepository.findOneBy({ name: blobName });
      if (!existingFile) {
        const file = new File(blobName, url, 'unknown', date);
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
router.delete('/files/:id', (req, res) => {
  res.status(501).send('Not Implemented');
});

export default router;
