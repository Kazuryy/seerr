import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MediaReview } from './MediaReview';
import { User } from './User';

@Entity()
export class ReviewComment {
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

  @Column({ type: 'text' })
  public content: string;

  // Support for threading (replies)
  @Column({ type: 'integer', nullable: true })
  public parentCommentId?: number;

  @ManyToOne(() => ReviewComment, (comment) => comment.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  public parentComment?: ReviewComment;

  @OneToMany(() => ReviewComment, (comment) => comment.parentComment)
  public replies: ReviewComment[];

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @DbAwareColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  public updatedAt: Date;

  constructor(init?: Partial<ReviewComment>) {
    Object.assign(this, init);
  }
}

export default ReviewComment;
