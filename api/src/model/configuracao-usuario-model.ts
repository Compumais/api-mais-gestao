import type { configuracoesUsuario } from "@/repositories/schema.js";

export type ConfiguracaoUsuario = typeof configuracoesUsuario.$inferSelect;
export type NovoConfiguracaoUsuario = typeof configuracoesUsuario.$inferInsert;
