// generate the routes for the azure services

import { Router } from 'express';
import { generateSasToken } from '../services/azureBlobService';
import dotenv from 'dotenv';
import { deleteCompletedTasks, scheduleSpeechServiceJob } from '../services/azureBatchService';
import { AppDataSource } from '../dataSource';
import { FileTypeGuesser } from '../helpers/FileTypeGuesser';
import { scheduleTranscriptionJob } from '../services/azureBatchService';
import { File } from '../Entity/File';
import { Job } from '../Entity/Job';
import { generateSasTokenForBlob } from '../services/azureBlobService';
import { handleTranscriptions } from '../services/azureSpeechService';

const router = Router();
dotenv.config();

const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'azure-blob-container';
const AZURE_STORAGE_TRANSCRIBE_PYTHON_SCRIPT_PATH = "transcribe_speech_service.py";


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

router.post('/azure/schedule-speech-job', async (req, res) => {
    const fileId = req.body.fileId;
    
    try {
        const fileRepository = AppDataSource.getRepository(File);
        const audioFile = await fileRepository.findOneBy({ id: fileId, type: 'audio' });
    
        if (!audioFile) {
        return res.status(400).json({ message: 'No audio files found' });
        }
    
        const resourceFiles = [];
        const fileExtension = FileTypeGuesser.getExtension(audioFile.name);
        const newFilePath = `audio_${audioFile.id}.${fileExtension}`;
        
    
        resourceFiles.push({
        httpUrl: await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, audioFile.path),
        filePath: newFilePath
        });
    
        const pythonSasUrl = await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, AZURE_STORAGE_TRANSCRIBE_PYTHON_SCRIPT_PATH);
    
        resourceFiles.push({
        httpUrl: pythonSasUrl,
        filePath: AZURE_STORAGE_TRANSCRIBE_PYTHON_SCRIPT_PATH
        });
    
        const outputDir = FileTypeGuesser.getRootDirectory(audioFile.path);
    
        const jobDetails = await scheduleSpeechServiceJob(resourceFiles, audioFile.id, outputDir);
        const repository = AppDataSource.getRepository(Job);
        await repository.insert({
        type: 'transcribe',
        data: jobDetails.task,
        project: audioFile?.project,
        status: 'processing',
        name: 'Transcription Azure Speech Services Job',
        createdAt: new Date(),
        updatedAt: new Date(),
        });
    
        res.json({ message: 'Files scheduled for transcription', jobDetails });
    } catch (error) {
        console.error('Error transcribing files:', error);
        res.status(500).send('Error transcribing files');
    }      
});

router.post('/azure/download-transcriptions', async (req, res) => {
    try {
        const status = req.body.status || 'Succeeded';
        await handleTranscriptions(status);
        res.json({ message: 'Transcriptions downloaded' });
    } catch (error) {
        console.error('Error downloading transcriptions:', error);
        res.status(500).send('Error downloading transcriptions');
    }
});

export default router;
