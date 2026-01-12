import type { MediaType } from '@server/constants/media';
import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import Media from './Media';
import { ReviewComment } from './ReviewComment';
import { ReviewLike } from './ReviewLike';
import { User } from './User';

@Entity()
@Index(['userId', 'mediaId', 'seasonNumber'], { unique: true })
@Index(['mediaId', 'isPublic'])
export class MediaReview {
  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
  })
  public user: User;

  @Column({ type: 'integer' })
  public userId: number;

  @ManyToOne(() => Media, {
    eager: true,
    onDelete: 'CASCADE',
  })
  public media: Media;

  @Column({ type: 'integer' })
  public mediaId: number;

  @Column({ type: 'varchar' })
  public mediaType: MediaType;

  @Column({ type: 'integer', nullable: true })
  public seasonNumber?: number;

  @Column({ type: 'int', nullable: true })
  public rating?: number;

  @Column({ type: 'text', nullable: true })
  public content?: string;

  @Column({ type: 'boolean', default: false })
  public containsSpoilers: boolean;

  @Column({ type: 'boolean', default: true })
  public isPublic: boolean;

  @DbAwareColumn({ type: 'datetime', nullable: true })
  public watchedAt?: Date;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @DbAwareColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  public updatedAt: Date;

  @OneToMany(() => ReviewLike, (like) => like.review)
  public likes: ReviewLike[];

  @OneToMany(() => ReviewComment, (comment) => comment.review)
  public comments: ReviewComment[];

  constructor(init?: Partial<MediaReview>) {
    Object.assign(this, init);
  }
}

export default MediaReview;
