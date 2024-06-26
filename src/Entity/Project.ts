import metadata from 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { File } from './File';  // Ensure the correct import path

@Entity()
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  color: string;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;

  @OneToMany(() => File, (file) => file.project, { nullable: true })
  files!: File[];

  constructor() {
    this.id = uuidv4();
    this.name = '';
    this.color = '';
    this.createdAt = new Date();
    this.updatedAt = new Date();    
  }
}
