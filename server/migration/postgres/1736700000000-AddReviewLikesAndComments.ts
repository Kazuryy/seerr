import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewLikesAndComments1736700000000
  implements MigrationInterface
{
  name = 'AddReviewLikesAndComments1736700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create review_like table
    await queryRunner.query(
      `CREATE TABLE "review_like" (` +
        `"id" SERIAL NOT NULL, ` +
        `"userId" integer NOT NULL, ` +
        `"reviewId" integer NOT NULL, ` +
        `"createdAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_review_like" PRIMARY KEY ("id"), ` +
        `CONSTRAINT "FK_review_like_user" FOREIGN KEY ("userId") ` +
        `REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, ` +
        `CONSTRAINT "FK_review_like_review" FOREIGN KEY ("reviewId") ` +
        `REFERENCES "media_review" ("id") ON DELETE CASCADE ON UPDATE NO ACTION` +
        `)`
    );

    // Create unique index on review_like
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_review_like_user_review" ON "review_like" ("userId", "reviewId")`
    );

    // Create review_comment table
    await queryRunner.query(
      `CREATE TABLE "review_comment" (` +
        `"id" SERIAL NOT NULL, ` +
        `"userId" integer NOT NULL, ` +
        `"reviewId" integer NOT NULL, ` +
        `"content" text NOT NULL, ` +
        `"parentCommentId" integer, ` +
        `"createdAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `"updatedAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_review_comment" PRIMARY KEY ("id"), ` +
        `CONSTRAINT "FK_review_comment_user" FOREIGN KEY ("userId") ` +
        `REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, ` +
        `CONSTRAINT "FK_review_comment_review" FOREIGN KEY ("reviewId") ` +
        `REFERENCES "media_review" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, ` +
        `CONSTRAINT "FK_review_comment_parent" FOREIGN KEY ("parentCommentId") ` +
        `REFERENCES "review_comment" ("id") ON DELETE CASCADE ON UPDATE NO ACTION` +
        `)`
    );

    // Create indexes on review_comment
    await queryRunner.query(
      `CREATE INDEX "IDX_review_comment_reviewId" ON "review_comment" ("reviewId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_review_comment_parentCommentId" ON "review_comment" ("parentCommentId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop review_comment table and indexes (reverse order)
    await queryRunner.query(`DROP INDEX "IDX_review_comment_parentCommentId"`);
    await queryRunner.query(`DROP INDEX "IDX_review_comment_reviewId"`);
    await queryRunner.query(`DROP TABLE "review_comment"`);

    // Drop review_like table and indexes
    await queryRunner.query(`DROP INDEX "UQ_review_like_user_review"`);
    await queryRunner.query(`DROP TABLE "review_like"`);
  }
}
