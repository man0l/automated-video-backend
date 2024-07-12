import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { File } from './File';
import { Project } from './Project';

@Entity()
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'processing', 'done'],
    default: 'draft'
  })
  status: 'draft' | 'processing' | 'done';

  @Column({
    type: 'enum',
    enum: ['transcribe', 'merge', 'compress', 'trim', 'generate_subtitles', 'add_subtitles', 'video_edit'],
    nullable: true
  })
  type: 'transcribe' | 'merge' | 'compress' | 'trim' | 'generate_subtitles' | 'add_subtitles' | 'video_edit' | null;

  @Column({
    type: 'json',
    nullable: true
  })
  data: object;

  @ManyToOne(() => Project, (project) => project.files, { nullable: true })
  project?: Project | null;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;

  constructor() {
    this.id = uuidv4();
    this.name = '';
    this.createdAt = new Date();
    this.updatedAt = new Date();    
    this.status = 'draft';
    this.type = null;
    this.data = {};
    this.project = null;
  }
}
