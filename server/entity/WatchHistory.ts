import type { MediaType } from '@server/constants/media';
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

@Entity()
@Index(['userId', 'mediaId', 'watchedAt'])
export class WatchHistory {
  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
  })
  public user: User;

  @Column({ type: 'integer' })
  @Index()
  public userId: number;

  @ManyToOne(() => Media, {
    eager: true,
    onDelete: 'CASCADE',
  })
  public media: Media;

  @Column({ type: 'integer' })
  @Index()
  public mediaId: number;

  @Column({ type: 'varchar' })
  public mediaType: MediaType;

  @Column({ type: 'integer', nullable: true })
  public seasonNumber?: number;

  @Column({ type: 'integer', nullable: true })
  public episodeNumber?: number;

  @Column({ type: 'integer', nullable: true })
  public runtimeMinutes?: number;

  @DbAwareColumn({ type: 'datetime' })
  @Index()
  public watchedAt: Date;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @DbAwareColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  public updatedAt: Date;

  constructor(init?: Partial<WatchHistory>) {
    Object.assign(this, init);
  }
}

export default WatchHistory;
