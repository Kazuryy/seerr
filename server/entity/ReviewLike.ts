import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MediaReview } from './MediaReview';
import { User } from './User';

@Entity()
@Index(['userId', 'reviewId'], { unique: true })
export class ReviewLike {
  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
  })
  public user: User;

  @Column({ type: 'integer' })
  public userId: number;

  @ManyToOne(() => MediaReview, {
    onDelete: 'CASCADE',
  })
  public review: MediaReview;

  @Column({ type: 'integer' })
  public reviewId: number;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  constructor(init?: Partial<ReviewLike>) {
    Object.assign(this, init);
  }
}

export default ReviewLike;
