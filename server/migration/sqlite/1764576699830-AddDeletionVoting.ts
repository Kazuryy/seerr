import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletionVoting1764576699830 implements MigrationInterface {
  name = 'AddDeletionVoting1764576699830';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create deletion_request table
    await queryRunner.query(
      `CREATE TABLE "deletion_request" (` +
        `"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, ` +
        `"mediaId" integer NOT NULL, ` +
        `"mediaType" varchar NOT NULL, ` +
        `"tmdbId" integer NOT NULL, ` +
        `"title" varchar NOT NULL, ` +
        `"posterPath" varchar, ` +
        `"status" varchar NOT NULL DEFAULT ('pending'), ` +
        `"reason" text, ` +
        `"requestedById" integer NOT NULL, ` +
        `"votingEndsAt" datetime NOT NULL, ` +
        `"votesFor" integer NOT NULL DEFAULT (0), ` +
        `"votesAgainst" integer NOT NULL DEFAULT (0), ` +
        `"processedAt" datetime, ` +
        `"processedById" integer, ` +
        `"createdAt" datetime NOT NULL DEFAULT (datetime('now')), ` +
        `"updatedAt" datetime NOT NULL DEFAULT (datetime('now')), ` +
        `CONSTRAINT "FK_deletion_request_requestedBy" FOREIGN KEY ("requestedById") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, ` +
        `CONSTRAINT "FK_deletion_request_processedBy" FOREIGN KEY ("processedById") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE NO ACTION` +
        `)`
    );

    // Create indexes on deletion_request
    await queryRunner.query(
      `CREATE INDEX "IDX_deletion_request_tmdbId" ON "deletion_request" ("tmdbId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_deletion_request_status" ON "deletion_request" ("status")`
    );

    // Create deletion_vote table
    await queryRunner.query(
      `CREATE TABLE "deletion_vote" (` +
        `"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, ` +
        `"vote" boolean NOT NULL, ` +
        `"createdAt" datetime NOT NULL DEFAULT (datetime('now')), ` +
        `"deletionRequestId" integer NOT NULL, ` +
        `"userId" integer NOT NULL, ` +
        `CONSTRAINT "FK_deletion_vote_deletionRequest" FOREIGN KEY ("deletionRequestId") REFERENCES "deletion_request" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, ` +
        `CONSTRAINT "FK_deletion_vote_user" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION` +
        `)`
    );

    // Create indexes on deletion_vote
    await queryRunner.query(
      `CREATE INDEX "IDX_deletion_vote_deletionRequest" ON "deletion_vote" ("deletionRequestId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_deletion_vote_user" ON "deletion_vote" ("userId")`
    );

    // Create unique constraint for one vote per user per deletion request
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_deletion_vote_deletionRequest_user" ON "deletion_vote" ("deletionRequestId", "userId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop deletion_vote table and indexes (reverse order)
    await queryRunner.query(
      `DROP INDEX "UQ_deletion_vote_deletionRequest_user"`
    );
    await queryRunner.query(`DROP INDEX "IDX_deletion_vote_user"`);
    await queryRunner.query(`DROP INDEX "IDX_deletion_vote_deletionRequest"`);
    await queryRunner.query(`DROP TABLE "deletion_vote"`);

    // Drop deletion_request table and indexes
    await queryRunner.query(`DROP INDEX "IDX_deletion_request_status"`);
    await queryRunner.query(`DROP INDEX "IDX_deletion_request_tmdbId"`);
    await queryRunner.query(`DROP TABLE "deletion_request"`);
  }
}
