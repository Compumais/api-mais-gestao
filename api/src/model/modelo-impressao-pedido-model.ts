import type { modeloimpressaopedido } from "@/repositories/schema.js";

export type ModeloImpressaoPedido = typeof modeloimpressaopedido.$inferSelect;
export type NovoModeloImpressaoPedido = typeof modeloimpressaopedido.$inferInsert;
