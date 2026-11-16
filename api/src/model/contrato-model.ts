import type {
	contrato,
	contratocobranca,
	contratofaturamentolote,
	remessabancaria,
	remessabancariaitem,
} from "@/repositories/schema.js";

export type Contrato = typeof contrato.$inferSelect;
export type NovoContrato = typeof contrato.$inferInsert;

export type ContratoFaturamentoLote = typeof contratofaturamentolote.$inferSelect;
export type NovoContratoFaturamentoLote =
	typeof contratofaturamentolote.$inferInsert;

export type ContratoCobranca = typeof contratocobranca.$inferSelect;
export type NovaContratoCobranca = typeof contratocobranca.$inferInsert;

export type RemessaBancaria = typeof remessabancaria.$inferSelect;
export type NovaRemessaBancaria = typeof remessabancaria.$inferInsert;

export type RemessaBancariaItem = typeof remessabancariaitem.$inferSelect;
export type NovaRemessaBancariaItem = typeof remessabancariaitem.$inferInsert;
