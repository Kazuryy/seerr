import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalendarCache1734998400000 implements MigrationInterface {
  name = 'AddCalendarCache1734998400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create calendar_cache table
    await queryRunner.query(
      `CREATE TABLE "calendar_cache" (` +
        `"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, ` +
        `"type" varchar NOT NULL, ` +
        `"tmdbId" integer NOT NULL, ` +
        `"tvdbId" integer, ` +
        `"title" varchar NOT NULL, ` +
        `"seasonNumber" integer, ` +
        `"episodeNumber" integer, ` +
        `"episodeTitle" varchar, ` +
        `"releaseDate" datetime NOT NULL, ` +
        `"overview" text, ` +
        `"status" varchar NOT NULL, ` +
        `"monitored" boolean NOT NULL, ` +
        `"hasFile" boolean NOT NULL, ` +
        `"radarrId" integer, ` +
        `"sonarrId" integer, ` +
        `"externalSource" varchar NOT NULL, ` +
        `"createdAt" datetime NOT NULL DEFAULT (datetime('now')), ` +
        `"updatedAt" datetime NOT NULL DEFAULT (datetime('now'))` +
        `)`
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_calendar_cache_releaseDate" ON "calendar_cache" ("releaseDate")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_calendar_cache_tmdbId" ON "calendar_cache" ("tmdbId")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_calendar_cache_type" ON "calendar_cache" ("type")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    await queryRunner.query(`DROP INDEX "IDX_calendar_cache_type"`);
    await queryRunner.query(`DROP INDEX "IDX_calendar_cache_tmdbId"`);
    await queryRunner.query(`DROP INDEX "IDX_calendar_cache_releaseDate"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "calendar_cache"`);
  }
}
