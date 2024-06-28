// generate the routes for the azure services

import { Router } from 'express';
import { generateSasToken } from '../services/azureBlobService';
import dotenv from 'dotenv';
import { deleteCompletedTasks } from '../services/azureBatchService';

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


router.get('/delete-completed-tasks/:jobId', async (req, res) => {
    try {
        const jobId = req.params.jobId as string || 'syncaudio2';

        await deleteCompletedTasks(jobId);
        res.json({ message: 'Completed tasks deleted' });
        
    } catch (error) {
        console.error('Error deleting completed tasks:', error);
        res.status(500).send('Error deleting completed tasks');
    }
});

export default router;
