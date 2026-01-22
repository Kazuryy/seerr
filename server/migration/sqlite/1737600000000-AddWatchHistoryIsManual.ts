import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWatchHistoryIsManual1737600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.query(
      `PRAGMA table_info(watch_history)`
    );
    const columnExists = table.some(
      (col: { name: string }) => col.name === 'isManual'
    );

    if (!columnExists) {
      await queryRunner.query(
        `ALTER TABLE "watch_history" ADD COLUMN "isManual" boolean NOT NULL DEFAULT 0`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite doesn't support DROP COLUMN easily, so we leave it
  }
}
