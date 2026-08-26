import { z } from "zod";

export const SEGMENTOS_DEMONSTRACAO = [
	"Comércio e varejo",
	"Restaurante e lanchonete",
	"Prestação de serviços",
	"Distribuição e atacado",
	"Indústria",
	"Outro",
] as const;

export const solicitacaoDemonstracaoSchema = z.object({
	nome: z
		.string({ message: "Nome é obrigatório" })
		.trim()
		.min(2, { message: "Informe seu nome" })
		.max(120, { message: "Nome muito longo" }),
	empresa: z
		.string({ message: "Empresa é obrigatória" })
		.trim()
		.min(2, { message: "Informe o nome da empresa" })
		.max(120, { message: "Nome da empresa muito longo" }),
	email: z
		.email({ message: "Email inválido" })
		.trim()
		.min(1, { message: "Email é obrigatório" }),
	telefone: z
		.string({ message: "Telefone é obrigatório" })
		.trim()
		.min(1, { message: "Telefone é obrigatório" })
		.refine((valor) => valor.replace(/\D/g, "").length >= 10, {
			message: "Informe um telefone com DDD",
		}),
	segmento: z.enum(SEGMENTOS_DEMONSTRACAO, {
		message: "Selecione o segmento",
	}),
	mensagem: z
		.string()
		.trim()
		.max(1000, { message: "Mensagem muito longa" })
		.optional()
		.or(z.literal("")),
});

export type SolicitacaoDemonstracaoFormData = z.infer<
	typeof solicitacaoDemonstracaoSchema
>;
