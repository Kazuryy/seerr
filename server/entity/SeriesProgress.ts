import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import Media from './Media';
import { User } from './User';

export type SeriesProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'abandoned';

@Entity()
@Index(['userId', 'mediaId'], { unique: true })
export class SeriesProgress {
  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(() => User, {
    eager: false,
    onDelete: 'CASCADE',
  })
  public user: User;

  @Column({ type: 'integer' })
  @Index()
  public userId: number;

  @ManyToOne(() => Media, {
    eager: false,
    onDelete: 'CASCADE',
  })
  public media: Media;

  @Column({ type: 'integer' })
  @Index()
  public mediaId: number;

  @Column({ type: 'integer' })
  public tmdbId: number;

  @Column({ type: 'integer', default: 0 })
  public totalEpisodes: number;

  @Column({ type: 'integer', default: 0 })
  public totalSeasons: number;

  @Column({ type: 'integer', default: 0 })
  public watchedEpisodes: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  public completionPercentage: number;

  @Column({ type: 'varchar', default: 'not_started' })
  public status: SeriesProgressStatus;

  @Column({ type: 'boolean', default: false })
  public isOngoing: boolean;

  @Column({ type: 'integer', default: 0 })
  public completionCount: number;

  @DbAwareColumn({ type: 'datetime', nullable: true })
  public completedAt: Date | null;

  @DbAwareColumn({ type: 'datetime', nullable: true })
  public lastWatchedAt: Date | null;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @DbAwareColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  public updatedAt: Date;

  constructor(init?: Partial<SeriesProgress>) {
    Object.assign(this, init);
  }
}

export default SeriesProgress;
