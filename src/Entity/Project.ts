import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { File } from './File';  // Ensure the correct import path

export enum ProjectStatus {
  INITIAL = 'initial',
  COMPRESSED = 'compressed',
  MERGED = 'merged',
  TRIMMED = 'trimmed',
  SUBTITLES_GENERATED = 'subtitlesGenerated',
  COMPLETED = 'completed',
}

@Entity()
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  color: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.INITIAL,
  })
  status: ProjectStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => File, (file) => file.project, { nullable: true })
  files!: File[];

  constructor() {
    this.id = uuidv4();
    this.name = '';
    this.color = '';
    this.status = ProjectStatus.INITIAL;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
