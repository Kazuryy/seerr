import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJellyfinAutoSync1737100000000 implements MigrationInterface {
  name = 'AddJellyfinAutoSync1737100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add Jellyfin auto-sync settings columns to user table
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "jellyfinAutoSyncEnabled" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "jellyfinAutoSyncThreshold" integer NOT NULL DEFAULT 85`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "jellyfinAutoSyncMinSeconds" integer NOT NULL DEFAULT 120`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "jellyfinAutoSyncMinSeconds"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "jellyfinAutoSyncThreshold"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "jellyfinAutoSyncEnabled"`
    );
  }
}
