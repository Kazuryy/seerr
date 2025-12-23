import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalendarCache1734998400000 implements MigrationInterface {
  name = 'AddCalendarCache1734998400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create calendar_cache table
    await queryRunner.query(
      `CREATE TABLE "calendar_cache" (` +
        `"id" SERIAL PRIMARY KEY, ` +
        `"type" character varying NOT NULL, ` +
        `"tmdbId" integer NOT NULL, ` +
        `"tvdbId" integer, ` +
        `"title" character varying NOT NULL, ` +
        `"seasonNumber" integer, ` +
        `"episodeNumber" integer, ` +
        `"episodeTitle" character varying, ` +
        `"releaseDate" timestamp NOT NULL, ` +
        `"overview" text, ` +
        `"status" character varying NOT NULL, ` +
        `"monitored" boolean NOT NULL, ` +
        `"hasFile" boolean NOT NULL, ` +
        `"radarrId" integer, ` +
        `"sonarrId" integer, ` +
        `"externalSource" character varying NOT NULL, ` +
        `"createdAt" timestamp NOT NULL DEFAULT now(), ` +
        `"updatedAt" timestamp NOT NULL DEFAULT now()` +
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
