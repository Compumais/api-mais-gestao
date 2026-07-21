import { z } from "zod";

/** Aceita string vazia no formulário e normaliza para null na saída. */
function textoOpcional(max: number, mensagem?: string) {
	return z
		.union([z.string().max(max, mensagem), z.literal(""), z.null()])
		.optional()
		.transform((valor) => (valor === "" || valor === undefined ? null : valor));
}

function ufOpcional() {
	return z
		.union([
			z.string().length(2, "UF deve ter 2 caracteres"),
			z.literal(""),
			z.null(),
		])
		.optional()
		.transform((valor) => (valor === "" || valor === undefined ? null : valor));
}

function emailOpcional() {
	return z
		.union([
			z.string().email("E-mail inválido").max(200),
			z.literal(""),
			z.null(),
		])
		.optional()
		.transform((valor) => (valor === "" || valor === undefined ? null : valor));
}

export const empresaFiscalConfigSchema = z.object({
	razaosocial: textoOpcional(60),
	nomefantasia: textoOpcional(60),
	inscricaoestadual: textoOpcional(20),
	inscricaomunicipal: textoOpcional(20),
	crt: z.number().int().min(1).max(4).optional().nullable(),
	cnae: textoOpcional(7),
	indicadorie: z.number().int().optional().nullable(),
	logradouro: textoOpcional(60),
	numero: textoOpcional(10),
	complemento: textoOpcional(60),
	bairro: textoOpcional(60),
	cep: textoOpcional(9),
	codigomunicipioibge: textoOpcional(7),
	uf: ufOpcional(),
	codigopais: textoOpcional(4),
	telefone: textoOpcional(40),
	email: emailOpcional(),
	regimetributario: z.enum(["SN", "LP", "LR", ""]).optional().nullable(),
});

export type EmpresaFiscalConfigFormData = z.infer<
	typeof empresaFiscalConfigSchema
>;
