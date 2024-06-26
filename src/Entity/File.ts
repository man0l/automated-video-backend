import metadata from 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Project } from './Project';  // Ensure the correct import path

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

  @Column({ nullable: true })
  size?: number;

  @Column({ default: false })
  locked: boolean;

  @ManyToOne(() => Project, (project) => project.files, { nullable: true })
  project?: Project;

  constructor() {
    this.id = uuidv4();
    this.date = new Date().toISOString();
    this.thumbnail = undefined;
    this.path = '';
    this.type = 'unknown';
    this.url = '';
    this.name = '';
    this.size = 0;
    this.locked = false;
  }
}
