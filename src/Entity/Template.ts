import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Scenario } from './Scenario';
import { v4 as uuidv4 } from 'uuid';

@Entity()
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @OneToMany(() => Scenario, (scenario) => scenario.template, { nullable: true })
  scenarios?: Scenario[] | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  constructor() {
    this.id = uuidv4();
    this.title = '';
    this.content = '';
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
