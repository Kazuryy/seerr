import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class CalendarCache {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'varchar' })
  @Index()
  public type: string;

  @Column({ type: 'integer' })
  @Index()
  public tmdbId: number;

  @Column({ type: 'integer', nullable: true })
  public tvdbId?: number;

  @Column({ type: 'varchar' })
  public title: string;

  @Column({ type: 'integer', nullable: true })
  public seasonNumber?: number;

  @Column({ type: 'integer', nullable: true })
  public episodeNumber?: number;

  @Column({ type: 'varchar', nullable: true })
  public episodeTitle?: string;

  @DbAwareColumn({ type: 'datetime' })
  @Index()
  public releaseDate: Date;

  @Column({ type: 'text', nullable: true })
  public overview?: string;

  @Column({ type: 'varchar' })
  public status: string;

  @Column({ type: 'boolean' })
  public monitored: boolean;

  @Column({ type: 'boolean' })
  public hasFile: boolean;

  @Column({ type: 'integer', nullable: true })
  public radarrId?: number;

  @Column({ type: 'integer', nullable: true })
  public sonarrId?: number;

  @Column({ type: 'varchar' })
  public externalSource: string;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @DbAwareColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  public updatedAt: Date;

  constructor(init?: Partial<CalendarCache>) {
    Object.assign(this, init);
  }
}

export default CalendarCache;
