import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

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
  thumbnail?: string;

  @Column()
  path: string;

  constructor() {
    this.id = uuidv4();
    this.date = new Date().toISOString();
    this.thumbnail = undefined;
    this.path = '';
    this.type = 'unknown';
    this.url = '';
    this.name = '';
  }

}
