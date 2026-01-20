import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJellyfinAutoSync1737100000000 implements MigrationInterface {
  name = 'AddJellyfinAutoSync1737100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add Jellyfin auto-sync settings columns to user table
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "jellyfinAutoSyncEnabled" boolean NOT NULL DEFAULT 0`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "jellyfinAutoSyncThreshold" integer NOT NULL DEFAULT 85`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "jellyfinAutoSyncMinSeconds" integer NOT NULL DEFAULT 120`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite doesn't support DROP COLUMN directly, but we can leave the columns
    // They won't cause issues if unused
    // For a complete rollback, you'd need to recreate the table without these columns
  }
}
