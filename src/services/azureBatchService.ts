import { BatchServiceClient, BatchSharedKeyCredentials } from '@azure/batch';
import dotenv from 'dotenv';

dotenv.config();

const batchAccountName = process.env.AZURE_BATCH_ACCOUNT_NAME || '';
const batchAccountKey = process.env.AZURE_BATCH_ACCOUNT_KEY || '';
const batchAccountUrl = `https://${batchAccountName}.westeurope.batch.azure.com`;

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

  const task = {
    id: taskId,
    commandLine: `python3 ${pythonCommand.filePath} ${videoFile.filePath} ${audioFile.filePath}`,
    resourceFiles: files
  };

  await batchClient.task.add(jobId, task);
  return { jobId, taskId };
};

