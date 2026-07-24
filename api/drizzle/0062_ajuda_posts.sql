CREATE TABLE IF NOT EXISTS "ajuda_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"subtitulo" text,
	"descricao" text NOT NULL,
	"capa" text,
	"imagens" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"slug" text NOT NULL,
	"publicado" boolean DEFAULT true NOT NULL,
	"autorid" text NOT NULL,
	"editorid" text NOT NULL,
	"criadoem" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"atualizadoem" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ajuda_posts_slug_uidx" ON "ajuda_posts" ("slug");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ajuda_posts" ADD CONSTRAINT "ajuda_posts_autorid_fkey" FOREIGN KEY ("autorid") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ajuda_posts" ADD CONSTRAINT "ajuda_posts_editorid_fkey" FOREIGN KEY ("editorid") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
