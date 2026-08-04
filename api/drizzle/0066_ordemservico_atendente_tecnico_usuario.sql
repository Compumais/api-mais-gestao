-- Limpa valores antigos (FK apontava para entidade) e remapeia para usuarios.
UPDATE "ordemservico" SET "idatendente" = NULL WHERE "idatendente" IS NOT NULL;
UPDATE "ordemservico" SET "idultimotecnico" = NULL WHERE "idultimotecnico" IS NOT NULL;

ALTER TABLE "ordemservico" DROP CONSTRAINT IF EXISTS "fk_ordemservico_atendente";
ALTER TABLE "ordemservico" DROP CONSTRAINT IF EXISTS "fk_ordemservico_ultimo_tecnico";

ALTER TABLE "ordemservico" ADD CONSTRAINT "fk_ordemservico_atendente" FOREIGN KEY ("idatendente") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;
ALTER TABLE "ordemservico" ADD CONSTRAINT "fk_ordemservico_ultimo_tecnico" FOREIGN KEY ("idultimotecnico") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE cascade;
