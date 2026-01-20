import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserBadges1736800000000 implements MigrationInterface {
  name = 'AddUserBadges1736800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_badge table
    await queryRunner.query(
      `CREATE TABLE "user_badge" (` +
        `"id" SERIAL NOT NULL, ` +
        `"userId" integer NOT NULL, ` +
        `"badgeType" character varying NOT NULL, ` +
        `"metadata" text, ` +
        `"earnedAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_user_badge" PRIMARY KEY ("id"), ` +
        `CONSTRAINT "FK_user_badge_user" FOREIGN KEY ("userId") ` +
        `REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION` +
        `)`
    );

    // Create unique index on user_badge
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_badge_user_type" ON "user_badge" ("userId", "badgeType")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop user_badge table and indexes
    await queryRunner.query(`DROP INDEX "UQ_user_badge_user_type"`);
    await queryRunner.query(`DROP TABLE "user_badge"`);
  }
}
