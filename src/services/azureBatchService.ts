import { BatchServiceClient, BatchSharedKeyCredentials, CloudTask, EnvironmentSetting, OutputFileUploadCondition } from '@azure/batch';
import dotenv from 'dotenv';
import path from 'path';
import { generateSasToken } from './azureBlobService';
import { env } from 'process';

dotenv.config();

const batchAccountName = process.env.AZURE_BATCH_ACCOUNT_NAME || '';
const batchAccountKey = process.env.AZURE_BATCH_ACCOUNT_KEY || '';
const batchAccountUrl = `https://${batchAccountName}.westeurope.batch.azure.com`;
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'my-container-name';
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'my-account-name';

const credentials = new BatchSharedKeyCredentials(batchAccountName, batchAccountKey);
const batchClient = new BatchServiceClient(credentials, batchAccountUrl);

const validateFiles = (files: { httpUrl: string, filePath: string }[], requiredFileTypes: string[]) => {
  const missingFiles = requiredFileTypes.filter(type => !files.some(file => file.filePath.startsWith(type) || file.filePath.endsWith(type)));
  if (missingFiles.length) {
    throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
  }
};

const createTask = async (
  taskId: string, 
  commandLine: string, 
  files: { httpUrl: string, filePath: string }[], 
  outputFilePath: string, 
  envSettings: EnvironmentSetting[] = [],
  matchingPattern = '*'
) => {
  const containerUrl = await generateSasToken(AZURE_STORAGE_CONTAINER_NAME, 'racwd');
  return {
    id: taskId,
    commandLine,
    resourceFiles: files,
    environmentSettings: envSettings,
    outputFiles: [
      {
        filePattern: matchingPattern,
        destination: {
          container: {
            containerUrl: containerUrl,
            path: outputFilePath
          }
        },
        uploadOptions: {
          uploadCondition: 'taskSuccess' as OutputFileUploadCondition
        }
      }
    ],
    deleteTaskOnCompletion: true
  };
};

export const scheduleJob = async (files: { httpUrl: string, filePath: string }[]) => {
  const jobId = 'syncaudio2';
  const taskId = `task-${Date.now()}`;

  validateFiles(files, ['video', 'audio', '.py']);

  const videoFile = files.find(file => file.filePath.startsWith('video'));
  const audioFile = files.find(file => file.filePath.startsWith('audio'));
  const pythonCommand = files.find(file => file.filePath.endsWith('.py'));

  if (!videoFile || !audioFile || !pythonCommand) {
    throw new Error('Missing required files');
  }

  const videoExtension = path.extname(videoFile.filePath);
  const outputFilePath = `output_video_${Date.now()}${videoExtension}`;

  const commandLine = `python3 ${pythonCommand.filePath} ${videoFile.filePath} ${audioFile.filePath} ${outputFilePath}`;
  const task = await createTask(taskId, commandLine, files, outputFilePath, [], outputFilePath);

  await batchClient.task.add(jobId, task);
  return { jobId, taskId, task };
};

export const scheduleTranscriptionJob = async (files: { httpUrl: string, filePath: string }[], outputFileKey: string, outputFilePath: string) => {
  const jobId = 'syncaudio2';
  const taskId = `task-${Date.now()}`;

  validateFiles(files, ['audio', '.py']);

  const pythonCommand = files.find(file => file.filePath.endsWith('.py'));
  const audioFile = files.find(file => file.filePath.startsWith('audio'));

  if (!audioFile || !pythonCommand) {
    throw new Error('Missing required files');
  }
  
  const commandLine = `python3 ${pythonCommand.filePath} ${audioFile.filePath}`;
  const task = await createTask(taskId, commandLine, files, outputFilePath, [
    {
    name: 'OPENAI_API_KEY',
    value: process.env.OPENAI_API_KEY || ''
  },
  {
    name: 'OPENAI_AZURE_ENDPOINT',
    value: process.env.OPENAI_AZURE_ENDPOINT || ''
  }
  ],
  '*.json');

  await batchClient.task.add(jobId, task);
  return { jobId, taskId, task };
};

export const scheduleSpeechServiceJob = async (files: { httpUrl: string, filePath: string }[], outputFileKey: string, outputFilePath: string) => {
  const jobId = 'syncaudio2';
  const taskId = `task-${Date.now()}`;

  validateFiles(files, ['audio', '.py']);

  const pythonCommand = files.find(file => file.filePath.endsWith('.py'));
  const audioFile = files.find(file => file.filePath.startsWith('audio'));

  if (!audioFile || !pythonCommand) {
    throw new Error('Missing required files');
  }

  const commandLine = `python3 ${pythonCommand.filePath} ${audioFile.filePath}`;
  const task = await createTask(taskId, commandLine, files, outputFilePath, [
    {
      name: 'AZURE_SPEECH_SERVICE_API_KEY',
      value: process.env.AZURE_SPEECH_SERVICE_API_KEY || ''
    },
    {
      name: 'AZURE_SPEECH_SERVICE_REGION',
      value: process.env.AZURE_SPEECH_SERVICE_REGION || ''
    },
    {
      name: 'LOCALE',
      value: process.env.LOCALE || ''
    },
    {
      name: 'AZURE_STORAGE_CONNECTION_STRING',
      value: process.env.AZURE_STORAGE_CONNECTION_STRING || ''
    },
    {
      name: 'AZURE_STORAGE_CONTAINER_NAME',
      value: process.env.AZURE_STORAGE_CONTAINER_NAME || ''
    },
    {
      name: 'AZURE_STORAGE_ACCOUNT_NAME',
      value: process.env.AZURE_STORAGE_ACCOUNT_NAME || ''
    }
  ],
  '*.wav');

  await batchClient.task.add(jobId, task);
  return { jobId, taskId, task };
}

export const deleteCompletedTasks = async (jobId: string | undefined) => {
  if (!jobId) {
    throw new Error("jobId is required and must be a string");
  }
  
  const tasks = await batchClient.task.list(jobId);
  
  if (!tasks || !Array.isArray(tasks)) {
    throw new Error("Failed to retrieve tasks or tasks is not an array");
  }

  const completedTasks = tasks.filter((task: CloudTask) => task.state === 'completed');
  
  if (!completedTasks.length) {
    return;
  }
  
  await Promise.all(completedTasks.map(task => batchClient.task.deleteMethod(jobId, task.id ?? '')));
};
