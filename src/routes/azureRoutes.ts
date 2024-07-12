// generate the routes for the azure services

import { Router } from 'express';
import { generateSasToken } from '../services/azureBlobService';
import dotenv from 'dotenv';
import { deleteCompletedTasks, scheduleSpeechServiceJob, scheduleVideoEditingJob, scheduleCompressionJob, scheduleMergeAudioJob, scheduleTrimVideoJob, scheduleGenerateSubtitlesJob, scheduleAddSubtitlesJob } from '../services/azureBatchService';
import { AppDataSource } from '../dataSource';
import { FileTypeGuesser } from '../helpers/FileTypeGuesser';
import { File } from '../Entity/File';
import { Job } from '../Entity/Job';
import { generateSasTokenForBlob } from '../services/azureBlobService';
import { handleTranscriptions } from '../services/azureSpeechService';

const router = Router();
dotenv.config();

const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'azure-blob-container';
const AZURE_STORAGE_TRANSCRIBE_PYTHON_SCRIPT_PATH = "transcribe_speech_service.py";
const AZURE_STORAGE_VIDEO_EDITING_PYTHON_SCRIPT_PATH = "video_editing.py";
const AZURE_STORAGE_MERGE_AUDIO_PYTHON_SCRIPT_PATH = "merge_audio.py";
const AZURE_STORAGE_TRIM_VIDEO_PYTHON_SCRIPT_PATH = "trim_video.py";
const AZURE_STORAGE_GENERATE_SUBTITLES_PYTHON_SCRIPT_PATH = "generate_subtitles.py";
const AZURE_STORAGE_ADD_SUBTITLES_PYTHON_SCRIPT_PATH = "add_subtitles.py";


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

router.post('/azure/schedule-video-editing-job', async (req, res) => {
    const fileId = req.body.fileId;

    try {
        const fileRepository = AppDataSource.getRepository(File);
        
        const videoFile = await fileRepository.findOne({
            where: { id: fileId, type: 'video' },
            relations: ['project'],
        });

        if (!videoFile) {
            return res.status(400).json({ message: 'No video file found' });
        }

        const resourceFiles = [];
        
        // find the latest transcription file for this video file from the same project
        if (videoFile.project) {
            const transcriptionFile = await fileRepository.findOne({
                where: { project: videoFile.project, type: 'transcript' },
                order: { date: 'DESC' },
            });

            if (transcriptionFile) {
                resourceFiles.push({
                    httpUrl: await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, transcriptionFile.path),
                    filePath: transcriptionFile.name
                });
            }
        }

        const fileExtension = FileTypeGuesser.getExtension(videoFile.name);
        const newFilePath = `video_${videoFile.id}.${fileExtension}`;

        resourceFiles.push({
            httpUrl: await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, videoFile.path),
            filePath: newFilePath
        });

        const pythonSasUrl = await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, AZURE_STORAGE_VIDEO_EDITING_PYTHON_SCRIPT_PATH);

        resourceFiles.push({
            httpUrl: pythonSasUrl,
            filePath: AZURE_STORAGE_VIDEO_EDITING_PYTHON_SCRIPT_PATH
        });

        const outputDir = FileTypeGuesser.getRootDirectory(videoFile.path);

        const jobDetails = await scheduleVideoEditingJob(resourceFiles, videoFile.id, outputDir);
        const repository = AppDataSource.getRepository(Job);
        await repository.insert({
            type: 'video_edit',
            data: jobDetails.task,
            project: videoFile?.project,
            status: 'processing',
            name: 'Video Editing Azure Batch Job',
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        res.json({ message: 'Video file scheduled for editing', jobDetails });
    } catch (error) {
        console.error('Error scheduling video editing job:', error);
        res.status(500).send('Error scheduling video editing job');
    }
});

router.post('/azure/compress-video', async (req, res) => {
    const fileId = req.body.fileId;
  
    try {
      const fileRepository = AppDataSource.getRepository(File);
      const videoFile = await fileRepository.findOneBy({ id: fileId, type: 'video' });
  
      if (!videoFile) {
        return res.status(400).json({ message: 'No video file found' });
      }
  
      const resourceFiles = [];
      const fileExtension = FileTypeGuesser.getExtension(videoFile.name);
      const newFilePath = `compressed_video_${videoFile.id}.${fileExtension}`;
  
      resourceFiles.push({
        httpUrl: await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, videoFile.path),
        filePath: newFilePath
      });
    
      const outputDir = FileTypeGuesser.getRootDirectory(videoFile.path);
  
      const jobDetails = await scheduleCompressionJob(resourceFiles, videoFile.id, outputDir);
      const repository = AppDataSource.getRepository(Job);
      await repository.insert({
        type: 'compress',
        data: jobDetails.task,
        project: videoFile?.project,
        status: 'processing',
        name: 'Video Compression Azure Batch Job',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  
      res.json({ message: 'Video file scheduled for compression', jobDetails });
    } catch (error) {
      console.error('Error scheduling video compression job:', error);
      res.status(500).send('Error scheduling video compression job');
    }
  });
  
  router.post('/azure/merge-audio', async (req, res) => {
    const { audioFileId, videoFileId } = req.body;
  
    try {
      const fileRepository = AppDataSource.getRepository(File);
  
      const audioFile = await fileRepository.findOneBy({ id: audioFileId, type: 'audio' });
      const videoFile = await fileRepository.findOneBy({ id: videoFileId, type: 'video' });
  
      if (!audioFile || !videoFile) {
        return res.status(400).json({ message: 'Audio or Video file not found' });
      }
  
      const resourceFiles = [];
  
      resourceFiles.push({
        httpUrl: await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, audioFile.path),
        filePath: `audio_${audioFile.id}.${FileTypeGuesser.getExtension(audioFile.name)}`
      });
  
      resourceFiles.push({
        httpUrl: await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, videoFile.path),
        filePath: `video_${videoFile.id}.${FileTypeGuesser.getExtension(videoFile.name)}`
      });
  
      const pythonSasUrl = await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, AZURE_STORAGE_MERGE_AUDIO_PYTHON_SCRIPT_PATH);
  
      resourceFiles.push({
        httpUrl: pythonSasUrl,
        filePath: AZURE_STORAGE_MERGE_AUDIO_PYTHON_SCRIPT_PATH
      });
  
      const outputDir = FileTypeGuesser.getRootDirectory(videoFile.path);
  
      const jobDetails = await scheduleMergeAudioJob(resourceFiles);
      const repository = AppDataSource.getRepository(Job);
      await repository.insert({
        type: 'merge',
        data: jobDetails.task,
        project: videoFile?.project,
        status: 'processing',
        name: 'Audio Merge Azure Batch Job',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  
      res.json({ message: 'Audio and Video files scheduled for merging', jobDetails });
    } catch (error) {
      console.error('Error scheduling audio merge job:', error);
      res.status(500).send('Error scheduling audio merge job');
    }
  });
  
  router.post('/azure/trim-video', async (req, res) => {
    const fileId = req.body.fileId;
  
    try {
      const fileRepository = AppDataSource.getRepository(File);
      const videoFile = await fileRepository.findOneBy({ id: fileId, type: 'video' });
  
      if (!videoFile) {
        return res.status(400).json({ message: 'No video file found' });
      }
  
      const resourceFiles = [];
      const fileExtension = FileTypeGuesser.getExtension(videoFile.name);
      const newFilePath = `trimmed_video_${videoFile.id}.${fileExtension}`;
  
      resourceFiles.push({
        httpUrl: await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, videoFile.path),
        filePath: newFilePath
      });
  
      const pythonSasUrl = await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, AZURE_STORAGE_TRIM_VIDEO_PYTHON_SCRIPT_PATH);
  
      resourceFiles.push({
        httpUrl: pythonSasUrl,
        filePath: AZURE_STORAGE_TRIM_VIDEO_PYTHON_SCRIPT_PATH
      });
  
      const outputDir = FileTypeGuesser.getRootDirectory(videoFile.path);
  
      const jobDetails = await scheduleTrimVideoJob(resourceFiles, videoFile.id, outputDir);
      const repository = AppDataSource.getRepository(Job);
      await repository.insert({
        type: 'trim',
        data: jobDetails.task,
        project: videoFile?.project,
        status: 'processing',
        name: 'Video Trimming Azure Batch Job',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  
      res.json({ message: 'Video file scheduled for trimming', jobDetails });
    } catch (error) {
      console.error('Error scheduling video trimming job:', error);
      res.status(500).send('Error scheduling video trimming job');
    }
  });
  
  router.post('/azure/generate-subtitles', async (req, res) => {
    const fileId = req.body.fileId;
  
    try {
      const fileRepository = AppDataSource.getRepository(File);
      const audioFile = await fileRepository.findOneBy({ id: fileId, type: 'audio' });
  
      if (!audioFile) {
        return res.status(400).json({ message: 'No audio file found' });
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
  
      const jobDetails = await scheduleGenerateSubtitlesJob(resourceFiles, audioFile.id, outputDir);
      const repository = AppDataSource.getRepository(Job);
      await repository.insert({
        type: 'generate_subtitles',
        data: jobDetails.task,
        project: audioFile?.project,
        status: 'processing',
        name: 'Generate Subtitles Azure Batch Job',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  
      res.json({ message: 'Audio file scheduled for subtitle generation', jobDetails });
    } catch (error) {
      console.error('Error scheduling subtitle generation job:', error);
      res.status(500).send('Error scheduling subtitle generation job');
    }
  });
  
  router.post('/azure/add-subtitles', async (req, res) => {
    const fileId = req.body.fileId;
  
    try {
      const fileRepository = AppDataSource.getRepository(File);
      const videoFile = await fileRepository.findOneBy({ id: fileId, type: 'video' });
  
      if (!videoFile) {
        return res.status(400).json({ message: 'No video file found' });
      }
  
      const resourceFiles = [];
      const fileExtension = FileTypeGuesser.getExtension(videoFile.name);
      const newFilePath = `video_with_subtitles_${videoFile.id}.${fileExtension}`;
  
      resourceFiles.push({
        httpUrl: await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, videoFile.path),
        filePath: newFilePath
      });
  
      const pythonSasUrl = await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, AZURE_STORAGE_ADD_SUBTITLES_PYTHON_SCRIPT_PATH);
  
      resourceFiles.push({
        httpUrl: pythonSasUrl,
        filePath: AZURE_STORAGE_ADD_SUBTITLES_PYTHON_SCRIPT_PATH
      });
  
      const outputDir = FileTypeGuesser.getRootDirectory(videoFile.path);
  
      const jobDetails = await scheduleAddSubtitlesJob(resourceFiles, videoFile.id, outputDir);
      const repository = AppDataSource.getRepository(Job);
      await repository.insert({
        type: 'add_subtitles',
        data: jobDetails.task,
        project: videoFile?.project,
        status: 'processing',
        name: 'Add Subtitles Azure Batch Job',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  
      res.json({ message: 'Video file scheduled for adding subtitles', jobDetails });
    } catch (error) {
      console.error('Error scheduling add subtitles job:', error);
      res.status(500).send('Error scheduling add subtitles job');
    }
  });
  

export default router;
