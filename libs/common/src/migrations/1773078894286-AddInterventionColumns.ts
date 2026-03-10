import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInterventionColumns1773078894286 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent_sessions" ADD "intervention_status" character varying(32) NOT NULL DEFAULT 'none'`);
        await queryRunner.query(`ALTER TABLE "agent_sessions" ADD "intervention_hint" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent_sessions" DROP COLUMN "intervention_hint"`);
        await queryRunner.query(`ALTER TABLE "agent_sessions" DROP COLUMN "intervention_status"`);
    }

}
