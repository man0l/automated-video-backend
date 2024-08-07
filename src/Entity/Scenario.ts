import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Template } from './Template';
import { v4 as uuidv4 } from 'uuid';

@Entity()
export class Scenario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('text')
  content: string;

  @Column()
  status: string;

  @Column('simple-array')
  tags: string[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @ManyToOne(() => Template, (template) => template.scenarios, { nullable: true })
  template?: Template | null;

  constructor() {
    this.id = uuidv4();
    this.title = '';
    this.description = '';
    this.content = '';
    this.status = 'draft';
    this.tags = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
