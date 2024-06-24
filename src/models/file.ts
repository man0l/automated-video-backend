export interface File {
    id: number;
    name: string;
    url: string;
    type: 'text' | 'video' | 'audio';
    date: string;
    thumbnail: string | null;
  }
  