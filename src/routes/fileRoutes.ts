import { Router } from 'express';
import { File } from '../models/file';
import { listFilesInContainer } from '../services/azureBlobService';
import dotenv from 'dotenv';

const router = Router();
dotenv.config();



const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'azure-blob-container';

// Get all files
router.get('/files', async (req, res) => {
  try {
    const blobFiles = await listFilesInContainer(AZURE_STORAGE_CONTAINER_NAME);
    res.json(blobFiles);
  } catch (error) {
    console.error('Error fetching files from Azure Blob Storage:', error);
    res.status(500).send('Error fetching files from Azure Blob Storage');
  }
});

// Get a file by id
router.get('/files/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const blobFiles = await listFilesInContainer(AZURE_STORAGE_CONTAINER_NAME);
    const file = blobFiles.find(f => f === id);
    if (file) {
      res.json({ name: file });
    } else {
      res.status(404).send('File not found');
    }
  } catch (error) {
    console.error('Error fetching file from Azure Blob Storage:', error);
    res.status(500).send('Error fetching file from Azure Blob Storage');
  }
});

// Create a new file - Note: This assumes files are uploaded via some other mechanism
router.post('/files', (req, res) => {
  res.status(501).send('Not Implemented');
});

// Update a file by id - Note: This assumes files are updated via some other mechanism
router.put('/files/:id', (req, res) => {
  res.status(501).send('Not Implemented');
});

// Delete a file by id - Note: This assumes files are deleted via some other mechanism
router.delete('/files/:id', (req, res) => {
  res.status(501).send('Not Implemented');
});

export default router;
