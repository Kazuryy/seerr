import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeriesProgress1737400000000 implements MigrationInterface {
  name = 'AddSeriesProgress1737400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "series_progress" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "userId" INTEGER NOT NULL,
        "mediaId" INTEGER NOT NULL,
        "tmdbId" INTEGER NOT NULL,
        "totalEpisodes" INTEGER NOT NULL DEFAULT 0,
        "totalSeasons" INTEGER NOT NULL DEFAULT 0,
        "watchedEpisodes" INTEGER NOT NULL DEFAULT 0,
        "completionPercentage" DECIMAL(5, 2) NOT NULL DEFAULT 0,
        "status" VARCHAR NOT NULL DEFAULT 'not_started',
        "isOngoing" BOOLEAN NOT NULL DEFAULT 0,
        "completedAt" DATETIME,
        "lastWatchedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT (datetime('now')),
        "updatedAt" DATETIME NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_series_progress_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_series_progress_media" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_series_progress_user_media" ON "series_progress" ("userId", "mediaId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_series_progress_userId" ON "series_progress" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_series_progress_mediaId" ON "series_progress" ("mediaId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_series_progress_status" ON "series_progress" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_series_progress_status"`);
    await queryRunner.query(`DROP INDEX "IDX_series_progress_mediaId"`);
    await queryRunner.query(`DROP INDEX "IDX_series_progress_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_series_progress_user_media"`);
    await queryRunner.query(`DROP TABLE "series_progress"`);
  }
}
