import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeriesProgressCompletionCount1737550000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.query(
      `PRAGMA table_info(series_progress)`
    );
    const columnExists = table.some(
      (col: { name: string }) => col.name === 'completionCount'
    );

    if (!columnExists) {
      await queryRunner.query(
        `ALTER TABLE "series_progress" ADD COLUMN "completionCount" integer NOT NULL DEFAULT 0`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite doesn't support DROP COLUMN easily, so we leave it
  }
}
