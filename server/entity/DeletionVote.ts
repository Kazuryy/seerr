import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { DeletionRequest } from './DeletionRequest';
import { User } from './User';

@Entity()
@Unique(['deletionRequest', 'user'])
export class DeletionVote {
  @PrimaryGeneratedColumn()
  public id: number;

  @ManyToOne(() => DeletionRequest, (request) => request.votes, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @Index()
  public deletionRequest: DeletionRequest;

  @ManyToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @Index()
  public user: User;

  @Column({ type: 'boolean' })
  public vote: boolean;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  constructor(init?: Partial<DeletionVote>) {
    Object.assign(this, init);
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      deletionRequestId: this.deletionRequest?.id,
      user: this.user,
      vote: this.vote,
      createdAt: this.createdAt,
    };
  }
}

export default DeletionVote;
