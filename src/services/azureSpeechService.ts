import { BlobServiceClient } from '@azure/storage-blob';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../dataSource';
import { Job } from '../Entity/Job';
import { File } from '../Entity/File';
import { Project } from '../Entity/Project';
import { validate as isUUID } from 'uuid';
import { deleteFileFromBlob } from './azureBlobService';

dotenv.config();

const speechKey = process.env.AZURE_SPEECH_SERVICE_API_KEY;
const serviceRegion = process.env.AZURE_SPEECH_SERVICE_REGION;
const AZURE_SPEECH_SERVICE_BASE_URL = `https://${serviceRegion}.api.cognitive.microsoft.com/speechtotext/v3.2/transcriptions`;
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || '';

// Headers for the request
const headers = {
  'Ocp-Apim-Subscription-Key': speechKey,
  'Content-Type': 'application/json'
};

// Assuming blobServiceClient is globally available and initialized
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING || '');

type TranscriptionFiles = {
  kind: 'TranscriptionReport' | 'Transcription',
  links: {
    contentUrl: string;
  }
};

type TranscriptionReportKind = {
    successfulTranscriptionsCount: number;
    failedTranscriptionsCount: number;
    details: Array<{
      source: string;
      status: string;
    }>;
  };

// Function to list transcriptions
export const listTranscriptions = async (status: string = 'Succeeded') => {
    const listTranscriptionsUrl = `${AZURE_SPEECH_SERVICE_BASE_URL}?status=${status}`;
    const response = await axios.get(listTranscriptionsUrl, { headers });
    // return only with the status required
    return response.data;
}

// Function to delete a transcription by ID
export const deleteTranscription = async (transcriptionId: string) => {
    const deleteTranscriptionUrl = `${AZURE_SPEECH_SERVICE_BASE_URL}/${transcriptionId}`;
    await axios.delete(deleteTranscriptionUrl, { headers });
}

// Function to list files in a transcription
export const listFilesInTranscription = async (transcriptionId: string): Promise<TranscriptionFiles[]> => {
    const getTranscriptionUrl = `${AZURE_SPEECH_SERVICE_BASE_URL}/${transcriptionId}/files`;
    const response = await axios.get(getTranscriptionUrl, { headers });
    return response.data.values;
}

/**
 * @desc checks if the transcription has any successful transcriptions and downloads the FIRST of them. 
 * @param transcriptionId 
 * @param files 
 * @returns an array of file paths that were downloaded
 */
export const downloadTranscription = async (transcriptionId: string, files: TranscriptionFiles[]): Promise<string> => {
    if (files.length === 0) {
        throw new Error('No files found in transcription');   
    }

    // returns always the first transcription file
    const transcription = files.find(file => file.kind === 'Transcription');

    if (!transcription) {
        throw new Error('Transcription files not found');
    }
    
    const contentUrl = transcription.links.contentUrl;
    const json = await axios.get(contentUrl, { headers });
    let fileName = extractFileNameFromURL(json.data.source);
    let originalFileName = fileName;
    
    fileName = fileName.split('prepared_video_').pop() || fileName;

    const videoFileId = fileName = fileName.split('.').shift() || fileName;
    fileName = `${fileName}.json`;

    if (!isUUID(videoFileId)) {
        return '';
    }

    const fileRepository = AppDataSource.getRepository(File);
    const file = await fileRepository.findOne({
        where: {
            id: videoFileId
        },
        relations: ['project']
    });
    
    if (!file || !file.project) {
        throw new Error('File not found: ' + videoFileId);
    }

    // upload the transcripption json file to the proper directory by using the project name as a directory
    await saveTranscriptionToFile(contentUrl, path.join(__dirname, `../../data/${fileName}`));
    await uploadFileToBlob(AZURE_STORAGE_CONTAINER_NAME, path.join(__dirname, `../../data/${fileName}`), `${file.project.name}/${fileName}`);
    await deleteFileFromBlob(AZURE_STORAGE_CONTAINER_NAME, originalFileName);
    // after successfully uploaded, mark the job as completed 

    return `${file.project.name}/${fileName}`;
}

// Function to upload a file to Blob storage
export const uploadFileToBlob = async (containerName: string, filePath: string, blobName: string) => {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlockBlobClient(blobName);

  const uploadBlobResponse = await blobClient.uploadFile(filePath);
  return uploadBlobResponse;
}

// Main logic function to handle listing, downloading, and uploading
export const handleTranscriptions = async (status: string = 'Succeeded') => {
    const transcriptions = await listTranscriptions(status);
    
    if ('values' in transcriptions) {
        for (const transcription of transcriptions.values) {
            if (transcription.status !== status) {
                continue;
            }

            const transcriptionId = transcription.self.split('/').pop();
            console.log(`Processing Transcription ID: ${transcriptionId}, Status: ${transcription.status}`);

            try {
                // List the files in the transcription
                const files = await listFilesInTranscription(transcriptionId);
                const downloadedFile = await downloadTranscription(transcriptionId, files);                
                // Optionally delete the transcription job after processing
                await deleteTranscription(transcriptionId);
            } catch (error: any) {
                console.error(`Failed to process transcription ${transcriptionId}: ${error.message}`);
            }
        }
    } else {
        console.log("No transcriptions found with the specified status.");
    }
}

const extractFileNameFromURL = (url: string): string => {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname; // Gets the path part of the URL
    const fileName = pathname.substring(pathname.lastIndexOf('/') + 1); // Extracts the file name
    return fileName.split('?')[0]; // Removes any query parameters
};

const saveTranscriptionToFile = async (contentUrl: string, filePath: string) => {    
    const fileResponse = await axios.get(contentUrl);
    fs.writeFileSync(filePath, JSON.stringify(fileResponse.data, null, 2));
}
function deleteBlobFile(AZURE_STORAGE_CONTAINER_NAME: string, arg1: string) {
    throw new Error('Function not implemented.');
}

