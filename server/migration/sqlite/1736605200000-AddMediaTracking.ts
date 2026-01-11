import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaTracking1736605200000 implements MigrationInterface {
  name = 'AddMediaTracking1736605200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create watch_history table
    await queryRunner.query(
      `CREATE TABLE "watch_history" (` +
        `"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, ` +
        `"userId" integer NOT NULL, ` +
        `"mediaId" integer NOT NULL, ` +
        `"mediaType" varchar NOT NULL, ` +
        `"seasonNumber" integer, ` +
        `"episodeNumber" integer, ` +
        `"watchedAt" datetime NOT NULL, ` +
        `"createdAt" datetime NOT NULL DEFAULT (datetime('now')), ` +
        `"updatedAt" datetime NOT NULL DEFAULT (datetime('now')), ` +
        `CONSTRAINT "FK_watch_history_user" FOREIGN KEY ("userId") ` +
        `REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, ` +
        `CONSTRAINT "FK_watch_history_media" FOREIGN KEY ("mediaId") ` +
        `REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE NO ACTION` +
        `)`
    );

    // Create indexes on watch_history
    await queryRunner.query(
      `CREATE INDEX "IDX_watch_history_userId" ON "watch_history" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_watch_history_mediaId" ON "watch_history" ("mediaId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_watch_history_watchedAt" ON "watch_history" ("watchedAt")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_watch_history_composite" ON "watch_history" ("userId", "mediaId", "watchedAt")`
    );

    // Create media_review table
    await queryRunner.query(
      `CREATE TABLE "media_review" (` +
        `"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, ` +
        `"userId" integer NOT NULL, ` +
        `"mediaId" integer NOT NULL, ` +
        `"mediaType" varchar NOT NULL, ` +
        `"seasonNumber" integer, ` +
        `"rating" integer, ` +
        `"content" text, ` +
        `"containsSpoilers" boolean NOT NULL DEFAULT (0), ` +
        `"isPublic" boolean NOT NULL DEFAULT (1), ` +
        `"watchedAt" datetime, ` +
        `"createdAt" datetime NOT NULL DEFAULT (datetime('now')), ` +
        `"updatedAt" datetime NOT NULL DEFAULT (datetime('now')), ` +
        `CONSTRAINT "FK_media_review_user" FOREIGN KEY ("userId") ` +
        `REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, ` +
        `CONSTRAINT "FK_media_review_media" FOREIGN KEY ("mediaId") ` +
        `REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE NO ACTION` +
        `)`
    );

    // Create indexes on media_review
    await queryRunner.query(
      `CREATE INDEX "IDX_media_review_mediaId" ON "media_review" ("mediaId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_media_review_isPublic" ON "media_review" ("isPublic")`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_media_review_user_media_season" ON "media_review" ("userId", "mediaId", "seasonNumber")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop media_review table and indexes (reverse order)
    await queryRunner.query(`DROP INDEX "UQ_media_review_user_media_season"`);
    await queryRunner.query(`DROP INDEX "IDX_media_review_isPublic"`);
    await queryRunner.query(`DROP INDEX "IDX_media_review_mediaId"`);
    await queryRunner.query(`DROP TABLE "media_review"`);

    // Drop watch_history table and indexes
    await queryRunner.query(`DROP INDEX "IDX_watch_history_composite"`);
    await queryRunner.query(`DROP INDEX "IDX_watch_history_watchedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_watch_history_mediaId"`);
    await queryRunner.query(`DROP INDEX "IDX_watch_history_userId"`);
    await queryRunner.query(`DROP TABLE "watch_history"`);
  }
}
