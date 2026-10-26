CREATE TABLE "results" (
	"code" text,
	"round" integer,
	"player" text,
	"name" text NOT NULL,
	"ms" integer NOT NULL,
	CONSTRAINT "results_pkey" PRIMARY KEY("code","round","player")
);
