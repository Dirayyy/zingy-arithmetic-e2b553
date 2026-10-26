CREATE TABLE "duels" (
	"code" text PRIMARY KEY,
	"round" integer DEFAULT 0 NOT NULL,
	"switch_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_votes" (
	"code" text,
	"round" integer,
	"player" text,
	CONSTRAINT "map_votes_pkey" PRIMARY KEY("code","round","player")
);
