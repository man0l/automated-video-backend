import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Project } from './Project';

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

  @Column({ type: 'bigint', nullable: true })
  size?: bigint;

  @Column({ default: false })
  locked: boolean;

  @ManyToOne(() => Project, (project) => project.files, { nullable: true })
  project?: Project | null;

  constructor() {
    this.id = uuidv4();
    this.date = new Date().toISOString();
    this.thumbnail = undefined;
    this.path = '';
    this.type = 'unknown';
    this.url = '';
    this.name = '';
    this.size = BigInt(0);
    this.locked = false;
    this.project = null;
  }
}
