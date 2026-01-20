import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './User';

/**
 * Tracks daily activity for users, including partial watches.
 * This is used for streak calculations - any activity on a day counts,
 * not just completed watches.
 */
@Entity()
@Unique(['userId', 'activityDate'])
@Index(['userId', 'activityDate'])
export class DailyActivity {
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

  /**
   * The date of activity (stored as YYYY-MM-DD string for easy comparison)
   */
  @Column({ type: 'varchar', length: 10 })
  @Index()
  public activityDate: string;

  /**
   * Total minutes watched on this day (including partial)
   */
  @Column({ type: 'integer', default: 0 })
  public totalMinutesWatched: number;

  /**
   * Number of sessions started on this day
   */
  @Column({ type: 'integer', default: 0 })
  public sessionsCount: number;

  /**
   * Whether the user had at least one completed watch this day
   */
  @Column({ type: 'boolean', default: false })
  public hasCompletedWatch: boolean;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @DbAwareColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  public updatedAt: Date;

  constructor(init?: Partial<DailyActivity>) {
    Object.assign(this, init);
  }
}

export default DailyActivity;
