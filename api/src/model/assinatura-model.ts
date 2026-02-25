
import type { assinaturas, clientesAsaas } from "../../drizzle/schema.js";

export type Assinatura = typeof assinaturas.$inferSelect;
export type NovaAssinatura = typeof assinaturas.$inferInsert;

export type ClienteAsaas = typeof clientesAsaas.$inferSelect;
export type NovoClienteAsaas = typeof clientesAsaas.$inferInsert;
