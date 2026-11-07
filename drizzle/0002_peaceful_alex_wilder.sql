CREATE TABLE "review_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"form" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registrations" DROP CONSTRAINT "review_rating";--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "form" jsonb;--> statement-breakpoint
ALTER TABLE "registrations" DROP COLUMN "rating";--> statement-breakpoint
ALTER TABLE "registrations" DROP COLUMN "comment";