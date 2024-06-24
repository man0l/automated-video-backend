import { Command } from 'commander';
import axios from 'axios';

const program = new Command();

const API_BASE_URL = 'http://localhost:3000/api';

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
  .command('create')
  .description('Create a new file')
  .requiredOption('--name <name>', 'Name of the file')
  .requiredOption('--url <url>', 'URL of the file')
  .requiredOption('--type <type>', 'Type of the file (text, video, audio)')
  .requiredOption('--date <date>', 'Date of the file')
  .option('--thumbnail <thumbnail>', 'Thumbnail of the file')
  .action(async (options) => {
    const newFile = {
      id: Date.now(), // or use any other id generation strategy
      name: options.name,
      url: options.url,
      type: options.type,
      date: options.date,
      thumbnail: options.thumbnail || null,
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/files`, newFile);
      console.log('File created:', response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error creating file:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }
    }
  });

program
  .command('update <id>')
  .description('Update a file by id')
  .requiredOption('--name <name>', 'Name of the file')
  .requiredOption('--url <url>', 'URL of the file')
  .requiredOption('--type <type>', 'Type of the file (text, video, audio)')
  .requiredOption('--date <date>', 'Date of the file')
  .option('--thumbnail <thumbnail>', 'Thumbnail of the file')
  .action(async (id: string, options) => {
    const updatedFile = {
      id: parseInt(id, 10),
      name: options.name,
      url: options.url,
      type: options.type,
      date: options.date,
      thumbnail: options.thumbnail || null,
    };

    try {
      const response = await axios.put(`${API_BASE_URL}/files/${id}`, updatedFile);
      console.log('File updated:', response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error updating file:', error.message);
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

program.parse(process.argv);
