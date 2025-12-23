import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalendarCacheImages1735055400000 implements MigrationInterface {
  name = 'AddCalendarCacheImages1735055400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add posterPath column
    await queryRunner.query(
      `ALTER TABLE "calendar_cache" ADD COLUMN "posterPath" varchar`
    );

    // Add backdropPath column
    await queryRunner.query(
      `ALTER TABLE "calendar_cache" ADD COLUMN "backdropPath" varchar`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the columns
    await queryRunner.query(
      `ALTER TABLE "calendar_cache" DROP COLUMN "backdropPath"`
    );

    await queryRunner.query(
      `ALTER TABLE "calendar_cache" DROP COLUMN "posterPath"`
    );
  }
}
