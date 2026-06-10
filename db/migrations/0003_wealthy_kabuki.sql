CREATE TABLE "badge_share" (
	"user_id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "badge_share_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "badge_share" ADD CONSTRAINT "badge_share_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;