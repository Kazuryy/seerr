import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWatchHistoryIsPartialWatch1737700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const result = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'watch_history' AND column_name = 'isPartialWatch'
    `);

    if (result.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "watch_history" ADD COLUMN "isPartialWatch" boolean NOT NULL DEFAULT false`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "watch_history" DROP COLUMN IF EXISTS "isPartialWatch"`
    );
  }
}
