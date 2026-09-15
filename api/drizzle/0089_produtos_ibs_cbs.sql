ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "cstibs" varchar(3);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "classtributariaibs" varchar(6);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "aliquotaiibs" numeric(7, 4);
--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN IF NOT EXISTS "aliquotacbs" numeric(7, 4);
