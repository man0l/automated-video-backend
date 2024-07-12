import path from 'path';
import { validate as isUUID } from 'uuid';

export class FileTypeGuesser {
    private static readonly extensionToTypeMap: { [key: string]: string } = {
        'txt': 'text',
        'md': 'text',
        'html': 'text',
        'htm': 'text',
        'json': 'text',
        'csv': 'text',
        'xml': 'text',
        'js': 'text',
        'ts': 'text',
        'css': 'text',
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image',
        'gif': 'image',
        'bmp': 'image',
        'webp': 'image',
        'mp4': 'video',
        'mkv': 'video',
        'webm': 'video',
        'mp3': 'audio',
        'wav': 'audio',
        'ogg': 'audio',
        'm4a': 'audio',
        'pdf': 'document',
        'doc': 'document',
        'docx': 'document',
        'xls': 'document',
        'xlsx': 'document',
        // Add more mappings as needed
    };

    public static guessType(fileName: string): string {
        const extension = this.getExtension(fileName);

        if (fileName.endsWith('json') && fileName.includes('transcription')) {
            return 'transcript';
        }

        if (fileName.endsWith('json')) {            
            return 'transcript';
        }


        return this.extensionToTypeMap[extension] || 'unknown';
    }

    public static getExtension(fileName: string): string {
        const extension = path.extname(fileName).slice(1).toLowerCase();
        return extension;
    }

    public static getRootDirectory(filePath: string): string {
        const parts = filePath.split('/');
        return parts[0];
    }
}
