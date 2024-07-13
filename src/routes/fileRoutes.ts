import { Router } from 'express';
import { deleteMissingFilesFromDatabase, generateSasToken, listFilesInContainer } from '../services/azureBlobService';
import { AppDataSource } from '../dataSource';
import { File } from '../Entity/File';
import dotenv from 'dotenv';
import * as path from 'path';
import { FileTypeGuesser } from '../helpers/FileTypeGuesser';
import { generateSasTokenForBlob } from '../services/azureBlobService';
import { scheduleMergeAudioJob, scheduleThumbnailExtractionJob, scheduleTranscriptionJob } from '../services/azureBatchService';
import { In } from 'typeorm/find-options/operator/In';
import { Project } from '../Entity/Project';
import { validate as isUUID } from 'uuid';
import { Job } from '../Entity/Job';

const router = Router();
dotenv.config();

const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'azure-blob-container';
const AZURE_STORAGE_PYTHON_SCRIPT_PATH = "sync_audio.py";
const AZURE_STORAGE_TRANSCRIBE_PYTHON_SCRIPT_PATH = "transcribe_audio.py";

router.get('/files', async (req, res) => {
  try {
    const fileRepository = AppDataSource.getRepository(File);

    // Extract and parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage as string) || 5;
    const type = req.query.type as string;
    const search = req.query.search as string;
    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;
    const project = req.query.project as string;

    // Build query with pagination, filtering, and search
    let query = fileRepository.createQueryBuilder('file')
      .leftJoinAndSelect('file.project', 'project'); // Include the Project relation


    if (type) {
      query = query.andWhere('file.type = :type', { type });
    }

    if (search) {
      query = query.andWhere('file.name LIKE :search', { search: `%${search}%` });
    }

    if (fromDate) {
      const fromDateTime = new Date(fromDate);
      fromDateTime.setHours(0, 0, 0, 0); // Set to the start of the day
      query = query.andWhere('file.date >= :fromDate', { fromDate: fromDateTime.toISOString() });
    }

    if (toDate) {
      const toDateTime = new Date(toDate);
      toDateTime.setHours(23, 59, 59, 999); // Set to the end of the day
      query = query.andWhere('file.date <= :toDate', { toDate: toDateTime.toISOString() });
    }

    if (project) {
      query = query.andWhere('project.id = :projectId', { projectId: project });
    }

    const totalItems = await query.getCount();
    const files = await query
      .skip((page - 1) * itemsPerPage)
      .take(itemsPerPage)
      .getMany();

    // Use Promise.all to handle the asynchronous map operation
    const filesWithSasUrl = await Promise.all(
      files.map(async (file) => {
        file.url = await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, file.path);
        return file;
      })
    );

    res.json({ files: filesWithSasUrl, totalItems });
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
    const projectRepository = AppDataSource.getRepository(Project);
    const blobItems = await listFilesInContainer(AZURE_STORAGE_CONTAINER_NAME);

    const fileEntities: File[] = [];
    const projectEntities: Project[] = [];

    // Track paths of files from the blob storage
    const blobPaths = new Set(blobItems.map(blob => blob.name));

    for (const blob of blobItems) {
      if (blob.name.endsWith('py')) {
        continue;
      }
      const blobPath = blob.name;
      const url = `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${blobPath}`;
      const date = new Date().toISOString();

      // Ensure that the blob path contains more than one segment to be considered a directory
      const pathSegments = blobPath.split('/');
      if (pathSegments.length < 2) {
        continue;
      }
      
      const baseDirectory = pathSegments[0];

      // Check if the project already exists in the database
      let project = await projectRepository.findOneBy({ name: baseDirectory });
      if (!project && baseDirectory !== AZURE_STORAGE_CONTAINER_NAME) {
        project = new Project();
        project.name = baseDirectory;
        project.color = '#000000'; // Default color or generate dynamically if needed
        await projectRepository.save(project);
        projectEntities.push(project);
      }

      // Check if the file already exists in the database
      let existingFile = await fileRepository.findOneBy({ path: blobPath });

      // Check if incoming file is a thumbnail
      if (path.basename(blobPath).startsWith('thumbnail_') && blobPath.endsWith('.jpg')) {
        const fileId = path.basename(blobPath).replace('thumbnail_', '').replace('.jpg', '');
        existingFile = await fileRepository.findOneBy({ id: fileId });
        if (existingFile) {
          existingFile.thumbnail = url;
          await fileRepository.save(existingFile);
        }
        continue;
      }
      
      if (!existingFile) {
        const file = new File();
        file.name = path.basename(blobPath); // Extract file name from the path
        file.url = url;
        file.path = blobPath;
        file.size = BigInt(blob.properties.contentLength ?? 0);
        file.type = FileTypeGuesser.guessType(file.name);
        file.project = project || undefined; // Associate the file with the project

        // Schedule thumbnail generation if the file is a video and doesn't have a thumbnail
        if (file.type === 'video') {
          const outputDir = FileTypeGuesser.getRootDirectory(file.path);

          const httpUrl = await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, file.path);
          await scheduleThumbnailExtractionJob([{ httpUrl, filePath: file.name }], outputDir);
        }
        
        fileEntities.push(file);
      }
    }

    if (fileEntities.length > 0) {
      await fileRepository.save(fileEntities);
    }

    const filesToDelete = await deleteMissingFilesFromDatabase(blobPaths);
    res.json({ 
        message: 'Sync complete', 
        addedFiles: fileEntities, 
        deletedFiles: filesToDelete, 
        projects: projectEntities 
      }
    );
  } catch (error) {
    console.error('Error syncing files:', error);
    res.status(500).send('Error syncing files');
  }
});

router.post('/merge', async (req, res) => {
  const fileIds = req.body.fileIds;
  try {
      const fileRepository = AppDataSource.getRepository(File);
      const files = await fileRepository.find({ where: { id: In(fileIds) } });
      if (files.length < 2) {
          res.status(400).send('At least two files are required to merge');
          return;
      }

      const resourceFiles = await Promise.all(files.map(async file => {
          const sasToken = await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, file.path);
          const fileExtension = FileTypeGuesser.getExtension(file.name);
          let newFilePath;
          
          switch (file.type) {
              case 'video':
                  newFilePath = 'video.';
                  break;
              case 'audio':
                  newFilePath = 'audio.';
                  break;
              default:
                  throw new Error('Unsupported file type');
          }

          newFilePath += fileExtension;

          return {
              httpUrl: sasToken,
              filePath: newFilePath
          };
      }));

      const pythonSasUrl = await generateSasTokenForBlob(AZURE_STORAGE_CONTAINER_NAME, AZURE_STORAGE_PYTHON_SCRIPT_PATH);

      resourceFiles.push({
        httpUrl: pythonSasUrl,
        filePath: AZURE_STORAGE_PYTHON_SCRIPT_PATH
      });

      const jobDetails = await scheduleMergeAudioJob(resourceFiles);

      const job = new Job();
      job.type = 'merge';      
      job.data = jobDetails.task;
      job.status = 'processing';

      await AppDataSource.getRepository(Job).save(job);

      res.json({ message: 'Files scheduled for merging', jobDetails });
  } catch (error) {
      console.error('Error merging files:', error);
      res.status(500).send('Error merging files');
  }
});


router.post('/files/updateProject', async (req, res) => {
  const fileIds = req.body.fileIds;
  const projectId = req.body.projectId;

  try {
    if (!isUUID(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID format' });
    }

    const fileRepository = AppDataSource.getRepository(File);
    
    // Ensure the project exists before updating files
    const project = await AppDataSource.getRepository(Project).findOneBy({ id: projectId });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    await fileRepository.update(
      { id: In(fileIds) },
      { project: project } // Correctly referencing the project relation
    );
    
    res.json({ message: 'Project updated' });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).send('Error updating project');
  }
});

router.post('/files/transcribe', async (req, res) => {
  const fileId = req.body.fileId;

  try {
    const fileRepository = AppDataSource.getRepository(File);
    const audioFile = await fileRepository.findOneBy({ id: fileId, type: 'audio' });

    if (!audioFile) {
      return res.status(400).json({ message: 'No audio files found' });
    }

    const resourceFiles = [];
    const fileExtension = FileTypeGuesser.getExtension(audioFile.name);
    let newFilePath = 'audio.';
    newFilePath += fileExtension;

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

    const jobDetails = await scheduleTranscriptionJob(resourceFiles, audioFile.id, outputDir);
    const repository = AppDataSource.getRepository(Job);
    await repository.insert({
      type: 'transcribe',
      data: jobDetails.task,
      status: 'processing',
      name: 'Transcription Job',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({ message: 'Files scheduled for transcription', jobDetails });
  } catch (error) {
    console.error('Error transcribing files:', error);
    res.status(500).send('Error transcribing files');
  }
});

export default router;
