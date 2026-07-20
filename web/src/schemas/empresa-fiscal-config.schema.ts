import { z } from "zod";

function vazioParaNull(valor: unknown): string | null {
	if (valor == null) return null;
	const texto = String(valor).trim();
	return texto === "" ? null : texto;
}

export const empresaFiscalConfigSchema = z.object({
	razaosocial: z.preprocess(vazioParaNull, z.string().max(60).nullable()),
	nomefantasia: z.preprocess(vazioParaNull, z.string().max(60).nullable()),
	inscricaoestadual: z.preprocess(vazioParaNull, z.string().max(20).nullable()),
	inscricaomunicipal: z.preprocess(vazioParaNull, z.string().max(20).nullable()),
	crt: z.coerce
		.number({ error: "CRT obrigatório" })
		.int()
		.min(1, "CRT inválido")
		.max(4, "CRT inválido"),
	cnae: z.preprocess(vazioParaNull, z.string().max(7).nullable()),
	indicadorie: z.coerce.number().int().min(1).max(9).optional().nullable(),
	logradouro: z.preprocess(vazioParaNull, z.string().max(60).nullable()),
	numero: z.preprocess(vazioParaNull, z.string().max(10).nullable()),
	complemento: z.preprocess(vazioParaNull, z.string().max(60).nullable()),
	bairro: z.preprocess(vazioParaNull, z.string().max(60).nullable()),
	cep: z.preprocess(vazioParaNull, z.string().max(9).nullable()),
	codigomunicipioibge: z.preprocess(vazioParaNull, z.string().max(7).nullable()),
	uf: z.preprocess(vazioParaNull, z.string().length(2, "UF inválida").nullable()),
	codigopais: z.preprocess(vazioParaNull, z.string().max(4).nullable()),
	telefone: z.preprocess(vazioParaNull, z.string().max(40).nullable()),
	email: z.preprocess(
		vazioParaNull,
		z.string().email("E-mail inválido").max(200).nullable(),
	),
});

export type EmpresaFiscalConfigFormData = z.infer<
	typeof empresaFiscalConfigSchema
>;
