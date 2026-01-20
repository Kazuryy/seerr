import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDailyActivity1737400000000 implements MigrationInterface {
  name = 'AddDailyActivity1737400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "daily_activity" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "userId" INTEGER NOT NULL,
        "activityDate" VARCHAR(10) NOT NULL,
        "totalMinutesWatched" INTEGER NOT NULL DEFAULT 0,
        "sessionsCount" INTEGER NOT NULL DEFAULT 0,
        "hasCompletedWatch" BOOLEAN NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
