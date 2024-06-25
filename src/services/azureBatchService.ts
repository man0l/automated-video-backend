import { BatchServiceClient, BatchSharedKeyCredentials, OutputFileUploadCondition } from '@azure/batch';
import dotenv from 'dotenv';
import path from 'path';
import { generateSasToken } from './azureBlobService';

dotenv.config();

const batchAccountName = process.env.AZURE_BATCH_ACCOUNT_NAME || '';
const batchAccountKey = process.env.AZURE_BATCH_ACCOUNT_KEY || '';
const batchAccountUrl = `https://${batchAccountName}.westeurope.batch.azure.com`;
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'my-container-name';
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'my-account-name';

const credentials = new BatchSharedKeyCredentials(batchAccountName, batchAccountKey);
const batchClient = new BatchServiceClient(credentials, batchAccountUrl);

export const scheduleJob = async (files: { httpUrl: string, filePath: string }[]) => {
  const jobId = 'syncaudio2';
  const poolId = 'pool-sync-audio';
  const taskId = `task-${Date.now()}`;

  const videoFile = files.find(file => file.filePath.startsWith('video'));
  const audioFile = files.find(file => file.filePath.startsWith('audio'));
  const pythonCommand = files.find(file => file.filePath.endsWith('.py'));

  if (!videoFile || !audioFile || !pythonCommand) {
    throw new Error('Missing required files for the job');
  }

  // Determine the output file path based on the video file extension and directory structure
  const videoExtension = path.extname(videoFile.filePath);
  const outputFileName = `output_video_${Date.now()}${videoExtension}`;
  const outputFilePath = outputFileName;

  const containerUrl = await generateSasToken(AZURE_STORAGE_CONTAINER_NAME, 'racwd');

  const task = {
    id: taskId,
    commandLine: `python3 ${pythonCommand.filePath} ${videoFile.filePath} ${audioFile.filePath} ${outputFilePath}`,
    resourceFiles: files,
    outputFiles: [
      {
        filePattern: outputFilePath,
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
    ]
  };

  await batchClient.task.add(jobId, task);
  return { jobId, taskId, task };
};
