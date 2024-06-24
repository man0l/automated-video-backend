// generate the routes for the azure services

import { Router } from 'express';
import { generateSasToken } from '../services/azureBlobService';
import dotenv from 'dotenv';

const router = Router();
dotenv.config();

router.get('/sas', async (req, res) => {
    try {
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'azure-blob-container';
        const blobName = 'example.jpg';
        const sasToken = await generateSasToken(containerName);
        res.json({ token: sasToken });
    } catch (error) {
        console.error('Error generating SAS token:', error);
        res.status(500).send('Error generating SAS token');
    }
});

export default router;