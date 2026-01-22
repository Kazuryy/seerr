import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeriesProgressCompletionCount1737550000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const result = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'series_progress' AND column_name = 'completionCount'
    `);

    if (result.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "series_progress" ADD COLUMN "completionCount" integer NOT NULL DEFAULT 0`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "series_progress" DROP COLUMN IF EXISTS "completionCount"`
    );
  }
}
