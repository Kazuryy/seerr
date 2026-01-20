import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllowManualWatchTracking1737200000000
  implements MigrationInterface
{
  name = 'AddAllowManualWatchTracking1737200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "allowManualWatchTracking" boolean NOT NULL DEFAULT false`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "allowManualWatchTracking"`
    );
  }
}
