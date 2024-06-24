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
      'pdf': 'document',
      'doc': 'document',
      'docx': 'document',
      'xls': 'document',
      'xlsx': 'document',
      // Add more mappings as needed
    };
  
    public static guessType(fileName: string): string {
      const extension = fileName.split('.').pop()?.toLowerCase();
      if (!extension) {
        return 'unknown';
      }
      return this.extensionToTypeMap[extension] || 'unknown';
    }
  }
  