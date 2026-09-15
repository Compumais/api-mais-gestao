ALTER TABLE "configuracoes_usuario"
ADD COLUMN IF NOT EXISTS "preferenciasui" jsonb DEFAULT '{}'::jsonb;
