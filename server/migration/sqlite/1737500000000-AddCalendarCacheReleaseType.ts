import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalendarCacheReleaseType1737500000000
  implements MigrationInterface
{
  name = 'AddCalendarCacheReleaseType1737500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists before adding
    const table = await queryRunner.query(
      `PRAGMA table_info("calendar_cache")`
    );
    const columnExists = table.some(
      (col: { name: string }) => col.name === 'releaseType'
    );

    if (!columnExists) {
      await queryRunner.query(
        `ALTER TABLE "calendar_cache" ADD COLUMN "releaseType" varchar`
      );
    }
  }

  public async down(): Promise<void> {
    // SQLite doesn't support DROP COLUMN directly
  }
}
