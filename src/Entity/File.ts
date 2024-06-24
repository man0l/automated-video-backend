import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity()
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column()
  type: string;

  @Column()
  date: string;

  @Column({ nullable: true })
  thumbnail?: string; // Marked as optional

  constructor(name: string, url: string, type: string, date: string, thumbnail?: string) {
    this.id = uuidv4(); // Initialize the ID with a UUID
    this.name = name;
    this.url = url;
    this.type = type;
    this.date = date;
    if (thumbnail) {
      this.thumbnail = thumbnail;
    }
  }
}
