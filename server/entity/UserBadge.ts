import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User';

export enum BadgeType {
  // Watching milestones - Movies
  MOVIES_WATCHED_10 = 'MOVIES_WATCHED_10',
  MOVIES_WATCHED_50 = 'MOVIES_WATCHED_50',
  MOVIES_WATCHED_100 = 'MOVIES_WATCHED_100',
  MOVIES_WATCHED_250 = 'MOVIES_WATCHED_250',
  MOVIES_WATCHED_500 = 'MOVIES_WATCHED_500',
  MOVIES_WATCHED_1000 = 'MOVIES_WATCHED_1000',

  // Watching milestones - TV Episodes
  TV_EPISODES_100 = 'TV_EPISODES_100',
  TV_EPISODES_500 = 'TV_EPISODES_500',
  TV_EPISODES_1000 = 'TV_EPISODES_1000',
  TV_EPISODES_5000 = 'TV_EPISODES_5000',

  // Series completion milestones
  SERIES_COMPLETED_1 = 'SERIES_COMPLETED_1',
  SERIES_COMPLETED_5 = 'SERIES_COMPLETED_5',
  SERIES_COMPLETED_10 = 'SERIES_COMPLETED_10',
  SERIES_COMPLETED_25 = 'SERIES_COMPLETED_25',
  SERIES_COMPLETED_50 = 'SERIES_COMPLETED_50',

  // Review milestones
  REVIEWS_WRITTEN_1 = 'REVIEWS_WRITTEN_1',
  REVIEWS_WRITTEN_10 = 'REVIEWS_WRITTEN_10',
  REVIEWS_WRITTEN_50 = 'REVIEWS_WRITTEN_50',
  REVIEWS_WRITTEN_100 = 'REVIEWS_WRITTEN_100',

  // Social engagement
  REVIEW_LIKES_RECEIVED_1 = 'REVIEW_LIKES_RECEIVED_1',
  REVIEW_LIKES_RECEIVED_50 = 'REVIEW_LIKES_RECEIVED_50',
  REVIEW_LIKES_RECEIVED_100 = 'REVIEW_LIKES_RECEIVED_100',
  REVIEW_LIKES_RECEIVED_500 = 'REVIEW_LIKES_RECEIVED_500',

  // Streaks
  WATCHING_STREAK_7 = 'WATCHING_STREAK_7',
  WATCHING_STREAK_30 = 'WATCHING_STREAK_30',
  WATCHING_STREAK_100 = 'WATCHING_STREAK_100',

  // Special achievements
  BINGE_WATCHER = 'BINGE_WATCHER', // Watched full season in 24h
  COMPLETIONIST = 'COMPLETIONIST', // Completed 10 series
  REWATCH_KING = 'REWATCH_KING', // Rewatched 20 different items
  EARLY_ADOPTER = 'EARLY_ADOPTER', // One of first users of tracking system
  COMMUNITY_HERO = 'COMMUNITY_HERO', // Admin-granted
  TOP_REVIEWER_MONTH = 'TOP_REVIEWER_MONTH',
  TOP_REVIEWER_YEAR = 'TOP_REVIEWER_YEAR',
}

@Entity()
@Index(['userId', 'badgeType'], { unique: true })
export class UserBadge {
  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(() => User, (user) => user.badges, {
    onDelete: 'CASCADE',
  })
  public user: User;

  @Column()
  public userId: number;

  @Column({ type: 'varchar' })
  public badgeType: BadgeType;

  @Column({ type: 'text', nullable: true })
  public metadata?: string; // JSON for additional data (e.g., count for milestones)

  @CreateDateColumn()
  public earnedAt: Date;

  constructor(init?: Partial<UserBadge>) {
    Object.assign(this, init);
  }
}

export default UserBadge;
