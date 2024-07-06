import { Command } from 'commander';
import axios from 'axios';

const program = new Command();

const API_BASE_URL = `http://${process.env.API_BASE_URL}:3000/api` || 'http://localhost:3000/api';

program
  .name('file-cli')
  .description('CLI to manage files')
  .version('1.0.0');

program
  .command('list')
  .description('List all files')
  .action(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/files`);
      console.log(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error fetching files:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }
    }
  });

program
  .command('get <id>')
  .description('Get a file by id')
  .action(async (id: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/files/${id}`);
      console.log(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error fetching file:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }
    }
  });

program
  .command('delete <id>')
  .description('Delete a file by id')
  .action(async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/files/${id}`);
      console.log(`File with id ${id} deleted.`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error deleting file:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }
    }
  });

program
  .command('sync')
  .description('Sync files from Azure Blob Storage to the database')
  .action(async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/sync`);
      console.log(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error syncing files:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }
    }
  });

program
  .command('sas')
  .description('Generate a SAS token')
  .action(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sas`);
      console.log(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error generating SAS token:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }
    }
  });

program
  .command('delete-completed-tasks <jobId>')
  .description('Delete completed tasks for a job')
  .action(async (jobId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/delete-completed-tasks/${jobId}`);
      console.log(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error deleting completed tasks:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }
    }
  }
);

program
  .command('download-transcriptions')
  .description('Download transcriptions')
  .action(async () => {
    try {      
      const response = await axios.post(`${API_BASE_URL}/azure/download-transcriptions`);
      console.log(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error downloading transcriptions:', error.message);
      }
    }
  }
);

  
program.parse(process.argv);

 