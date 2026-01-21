import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalendarCacheReleaseType1737500000000
  implements MigrationInterface
{
  name = 'AddCalendarCacheReleaseType1737500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists before adding
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'calendar_cache' AND column_name = 'releaseType'
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "calendar_cache" ADD COLUMN "releaseType" varchar`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calendar_cache" DROP COLUMN IF EXISTS "releaseType"`
    );
  }
}
