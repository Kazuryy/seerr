import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllowManualWatchTracking1737200000000
  implements MigrationInterface
{
  name = 'AddAllowManualWatchTracking1737200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "allowManualWatchTracking" boolean NOT NULL DEFAULT 0`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite doesn't support DROP COLUMN directly
  }
}
