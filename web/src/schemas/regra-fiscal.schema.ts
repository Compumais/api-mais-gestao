import { z } from "zod";

export const regraFiscalFormSchema = z.object({
	ruleid: z
		.string()
		.min(3, "O ID da regra deve ter no mínimo 3 caracteres")
		.max(80, "Máximo de 80 caracteres"),
	descricao: z.string().min(1, "Descrição é obrigatória"),
	prioridade: z.coerce.number().int(),
	vigenciainicio: z.string().min(10, "Data de início da vigência é obrigatória"),
	vigenciafim: z.string().optional().nullable(),

	// Campos estruturados de Condições
	escopo: z.enum(["operacao", "estrutural"]).default("operacao"),
	regime_tributario: z.string().default("TODOS"), // "TODOS" | "SN" | "NORMAL"
	uf_emitente: z.string().default("QUALQUER"),
	uf_destinatario: z.string().default("QUALQUER"),
	consumidor_final: z.string().default("INDIFERENTE"), // "INDIFERENTE" | "SIM" | "NAO"
	contribuinte_icms: z.string().default("INDIFERENTE"), // "INDIFERENTE" | "SIM" | "NAO"
	cfop: z.string().optional().nullable(),
	cfop_prefixo: z.string().optional().nullable(),
	ncm: z.string().optional().nullable(),
	cest: z.string().optional().nullable(),

	// Campos estruturados de Resultado
	st_aplicavel: z.string().default("NULL"), // "NULL" | "TRUE" | "FALSE"
	fcp_aplicavel: z.string().default("NULL"), // "NULL" | "TRUE" | "FALSE"
	difal_aplicavel: z.string().default("NULL"), // "NULL" | "TRUE" | "FALSE"
	resultado_cfop: z.string().optional().nullable(),
	resultado_csosn: z.string().optional().nullable(),
	resultado_cst: z.string().optional().nullable(),

	// Campos estruturados de Fonte Oficial Principal
	fonte_orgao: z.string().optional().nullable(),
	fonte_tipo: z.string().optional().nullable(),
	fonte_numero: z.string().optional().nullable(),
	fonte_url: z.string().optional().nullable(),

	// Campos JSON originais (para modo avançado / compatibilidade)
	condicoesJson: z.string().min(2),
	resultadoJson: z.string().min(2),
	fontesJson: z.string().min(2),
});

export type RegraFiscalFormData = z.infer<typeof regraFiscalFormSchema>;
