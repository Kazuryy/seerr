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
import { DeletionVote } from './DeletionVote';
import { User } from './User';

export enum DeletionRequestStatus {
  PENDING = 'pending',
  VOTING = 'voting',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity()
export class DeletionRequest {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'integer' })
  public mediaId: number;

  @Column({ type: 'varchar' })
  public mediaType: MediaType;

  @Column()
  @Index()
  public tmdbId: number;

  @Column({ type: 'varchar' })
  public title: string;

  @Column({ type: 'varchar', nullable: true })
  public posterPath?: string | null;

  @Column({ type: 'varchar' })
  @Index()
  public status: DeletionRequestStatus;

  @Column({ type: 'text', nullable: true })
  public reason?: string | null;

  @ManyToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
  })
  public requestedBy: User;

  @DbAwareColumn({ type: 'datetime' })
  public votingEndsAt: Date;

  @Column({ type: 'integer', default: 0 })
  public votesFor: number;

  @Column({ type: 'integer', default: 0 })
  public votesAgainst: number;

  @OneToMany(() => DeletionVote, (vote) => vote.deletionRequest, {
    cascade: true,
  })
  public votes: DeletionVote[];

  @DbAwareColumn({ type: 'datetime', nullable: true })
  public processedAt?: Date | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  public processedBy?: User | null;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @DbAwareColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  public updatedAt: Date;

  constructor(init?: Partial<DeletionRequest>) {
    Object.assign(this, init);
  }

  public isVotingActive(): boolean {
    return (
      this.status === DeletionRequestStatus.VOTING &&
      new Date() < new Date(this.votingEndsAt)
    );
  }

  public getTotalVotes(): number {
    return this.votesFor + this.votesAgainst;
  }

  /**
   * Get the percentage of votes FOR deletion
   * @returns Percentage of votes in favor of deletion (0-100)
   */
  public getVotePercentage(): number {
    const total = this.getTotalVotes();
    if (total === 0) {
      return 0;
    }
    // votesFor = votes FOR deletion (true votes)
    return (this.votesFor / total) * 100;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      mediaId: this.mediaId,
      mediaType: this.mediaType,
      tmdbId: this.tmdbId,
      title: this.title,
      posterPath: this.posterPath,
      status: this.status,
      reason: this.reason,
      requestedBy: this.requestedBy,
      votingEndsAt: this.votingEndsAt,
      votesFor: this.votesFor,
      votesAgainst: this.votesAgainst,
      processedAt: this.processedAt,
      processedBy: this.processedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isVotingActive: this.isVotingActive(),
      votePercentage: this.getVotePercentage(),
      totalVotes: this.getTotalVotes(),
    };
  }
}

export default DeletionRequest;
