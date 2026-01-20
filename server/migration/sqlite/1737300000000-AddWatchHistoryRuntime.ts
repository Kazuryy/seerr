import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWatchHistoryRuntime1737300000000 implements MigrationInterface {
  name = 'AddWatchHistoryRuntime1737300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "watch_history" ADD COLUMN "runtimeMinutes" integer`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "watch_history" DROP COLUMN "runtimeMinutes"`
    );
  }
}
