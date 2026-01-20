import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDailyActivity1737400000000 implements MigrationInterface {
  name = 'AddDailyActivity1737400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "daily_activity" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL,
        "activityDate" varchar(10) NOT NULL,
        "totalMinutesWatched" integer NOT NULL DEFAULT 0,
        "sessionsCount" integer NOT NULL DEFAULT 0,
        "hasCompletedWatch" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_daily_activity_user_date" UNIQUE ("userId", "activityDate"),
        CONSTRAINT "FK_daily_activity_user" FOREIGN KEY ("userId")
          REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_daily_activity_userId" ON "daily_activity" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_daily_activity_activityDate" ON "daily_activity" ("activityDate")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_daily_activity_userId_activityDate" ON "daily_activity" ("userId", "activityDate")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "daily_activity"`);
  }
}
