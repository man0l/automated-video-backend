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
  const missingFiles = requiredFileTypes
                          .filter(
                            type => 
                              !files.some(
                                  file => file.filePath.startsWith(type) ||
                                  file.filePath.endsWith(type) ||
                                  file.filePath.includes(type)
                              )
                          );
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
  matchingPattern?: string
) => {
  const containerUrl = await generateSasToken(AZURE_STORAGE_CONTAINER_NAME, 'racwd');

  const taskConfig: any = {
    id: taskId,
    commandLine,
    resourceFiles: files,
    environmentSettings: envSettings,
    deleteTaskOnCompletion: true
  };

  if (matchingPattern) {
    taskConfig.outputFiles = [
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
    ];
  }

  return taskConfig;
};


export const scheduleMergeAudioJob = async (files: { httpUrl: string, filePath: string }[], outputFilePath: string) => {
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
  const filePath = `output_video_${Date.now()}${videoExtension}`;

  const commandLine = `python3 ${pythonCommand.filePath} ${videoFile.filePath} ${audioFile.filePath} ${filePath}`;
  const task = await createTask(taskId, commandLine, files, outputFilePath, [], 'output_video*');

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

  validateFiles(files, ['video', '.py']);

  const pythonCommand = files.find(file => file.filePath.endsWith('.py'));
  const videoFile = files.find(file => file.filePath.startsWith('video'));

  if (!videoFile || !pythonCommand) {
    throw new Error('Missing required files');
  }

  const commandLine = `python3 ${pythonCommand.filePath} ${videoFile.filePath}`;
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
  undefined
);

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

export const scheduleVideoEditingJob = async (files: { httpUrl: string, filePath: string }[], outputFileKey: string, outputFilePath: string) => {
  const jobId = 'syncaudio2';
  const taskId = `task-${Date.now()}`;

  validateFiles(files, ['video', '.py']);

  const pythonCommand = files.find(file => file.filePath.endsWith('.py'));
  const videoFile = files.find(file => file.filePath.startsWith('video'));

  if (!videoFile || !pythonCommand) {
    throw new Error('Missing required files');
  }

  const commandLine = `python3 ${pythonCommand.filePath} ${videoFile.filePath} ${outputFileKey}`;
  const task = await createTask(taskId, commandLine, files, outputFilePath, [], '*.mp4');

  const result = await batchClient.task.add(jobId, task);
  return { jobId, taskId, task, result };
}

export const scheduleThumbnailExtractionJob = async (files: { httpUrl: string, filePath: string }[], outputFilePath: string) => {
  const jobId = 'syncaudio2';
  const taskId = `task-${Date.now()}`;

  validateFiles(files, ['compressed']);

  const videoFile = files.find(file => file.filePath.startsWith('compressed'));

  if (!videoFile) {
    throw new Error('Missing required video file');
  }

  const ext = path.extname(videoFile.filePath);
  const jpegPath = "thumbnail_" + videoFile.filePath.replace(ext, '.jpg');

  const commandLine = `ffmpeg -i ${videoFile.filePath} -ss 00:00:10 -vframes 1 ${jpegPath}`;
  const task = await createTask(taskId, commandLine, files, outputFilePath, [], '*.jpg');

  await batchClient.task.add(jobId, task);
  return { jobId, taskId, task };
};

export const scheduleCompressionJob = async (files: { httpUrl: string, filePath: string }[], outputFileKey: string, outputFilePath: string) => {
  const jobId = 'syncaudio2';
  const taskId = `task-${Date.now()}`;

  validateFiles(files, ['for_compression']);
  const videoFile = files.find(file => file.filePath.startsWith('for_compression'));

  if (!videoFile) {
    throw new Error('Missing required files');
  }

  const ext = path.extname(videoFile.filePath);
  const outputFile = `compressed_${outputFileKey}${ext}`;

  const commandLine = `ffmpeg -i ${videoFile.filePath} -vf "scale=1080:1920" -c:v libx264 -crf 18 -preset medium -c:a copy ${outputFile} -y`
  const task = await createTask(taskId, commandLine, files, outputFilePath, [], outputFile);

  const result = await batchClient.task.add(jobId, task);
  return { jobId, taskId, task, result };
};

export const scheduleTrimVideoJob = async (files: { httpUrl: string, filePath: string }[], outputFileKey: string, outputFilePath: string) => {
  const jobId = 'syncaudio2';
  const taskId = `task-${Date.now()}`;

  validateFiles(files, ['trimmed_video_', '.py']);

  const pythonCommand = files.find(file => file.filePath.endsWith('.py'));
  const videoFile = files.find(file => file.filePath.startsWith('trimmed_video_'));

  if (!videoFile || !pythonCommand) {
    throw new Error('Missing required files');
  }

  const noiseThreshold = -30;
  const durationThreshold = 0.5;
  const commandLine = `python3 ${pythonCommand.filePath} ${videoFile.filePath} ${noiseThreshold} ${durationThreshold} ${outputFileKey}`;
  const task = await createTask(taskId, commandLine, files, outputFilePath, [], 'non_silent_*');

  const result = await batchClient.task.add(jobId, task);
  return { jobId, taskId, task, result };
};

export const scheduleGenerateSubtitlesJob = async (files: { httpUrl: string, filePath: string }[], outputFileKey: string, outputFilePath: string) => {
  return scheduleSpeechServiceJob(files, outputFileKey, outputFilePath);
};

export const scheduleAddSubtitlesJob = async (files: { httpUrl: string, filePath: string }[], outputFileKey: string, outputFilePath: string) => {
  const jobId = 'syncaudio2';
  const taskId = `task-${Date.now()}`;

  validateFiles(files, ['video', '.py']);

  const pythonCommand = files.find(file => file.filePath.endsWith('.py'));
  const videoFile = files.find(file => file.filePath.startsWith('video'));

  if (!videoFile || !pythonCommand) {
    throw new Error('Missing required files');
  }

  const commandLine = `python3 ${pythonCommand.filePath} ${videoFile.filePath} ${outputFileKey}`;
  const task = await createTask(taskId, commandLine, files, outputFilePath, [], '*.mp4');

  const result = await batchClient.task.add(jobId, task);
  return { jobId, taskId, task, result };
};
