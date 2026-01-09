import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventsTable1767973268744 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'events_status_enum') THEN
                    CREATE TYPE "events_status_enum" AS ENUM ('draft','pending','published','rejected');
                END IF;
            END
            $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'events'
                ) THEN
                    CREATE TABLE "events" (
                        "id" SERIAL NOT NULL,
                        "title" character varying NOT NULL,
                        "description" character varying NOT NULL,
                        "date" TIMESTAMP NOT NULL,
                        "location" character varying NOT NULL,
                        "status" "events_status_enum" NOT NULL DEFAULT 'draft',
                        "rejectReason" character varying,
                        "organizationId" integer NOT NULL,
                        "ownerId" integer NOT NULL,
                        CONSTRAINT "PK_events_id" PRIMARY KEY ("id")
                    );

                    ALTER TABLE "events" ADD CONSTRAINT "FK_events_org" FOREIGN KEY ("organizationId")
                        REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                    ALTER TABLE "events" ADD CONSTRAINT "FK_events_owner" FOREIGN KEY ("ownerId")
                        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END
            $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'events'
                ) THEN
                    ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "FK_events_owner";
                    ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "FK_events_org";
                    DROP TABLE IF EXISTS "events";
                END IF;
            END
            $$;
        `);

        await queryRunner.query(
            `DROP TYPE IF EXISTS "events_status_enum"`,
        );
    }
}
