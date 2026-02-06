-- CreateTable
CREATE TABLE IF NOT EXISTS "configuracoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idempresa" TEXT NOT NULL,
    "notificacoes" JSONB DEFAULT '{}'::jsonb,
    "integracao" JSONB DEFAULT '{}'::jsonb,
    "relatorios" JSONB DEFAULT '{}'::jsonb,
    "impressao" JSONB DEFAULT '{}'::jsonb,
    "criadoem" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoem" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "configuracoes_idempresa_key" ON "configuracoes"("idempresa");

-- AddForeignKey
ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_idempresa_fkey" FOREIGN KEY ("idempresa") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

