
import type { assinaturas, clientesasaas } from "@/repositories/schema";

export type Assinatura = typeof assinaturas.$inferSelect;
export type NovaAssinatura = typeof assinaturas.$inferInsert;

export type ClienteAsaas = typeof clientesasaas.$inferSelect;
export type NovoClienteAsaas = typeof clientesasaas.$inferInsert;
