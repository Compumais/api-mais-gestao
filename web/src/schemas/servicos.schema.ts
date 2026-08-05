import { z } from "zod";

function percentualOpcional() {
	return z
		.string()
		.optional()
		.nullable()
		.refine((valor) => {
			if (!valor || valor.trim() === "") return true;
			const numero = Number.parseFloat(valor.replace(",", "."));
			return !Number.isNaN(numero) && numero >= 0;
		}, "Percentual inválido");
}

export const servicoFormSchema = z.object({
	codigo: z
		.number({ message: "Código é obrigatório" })
		.int("Código deve ser um número inteiro")
		.positive("Código deve ser maior que zero"),
	itemrapido: z.boolean().default(false),
	podeserbrinde: z.boolean().default(false),
	ativo: z.boolean().default(true),
	nome: z
		.string()
		.min(1, "Nome é obrigatório")
		.max(120, "Nome deve ter no máximo 120 caracteres"),
	nomeecf: z
		.string()
		.max(120, "Nome PDV deve ter no máximo 120 caracteres")
		.optional()
		.nullable(),
	idunidademedida: z.string().min(1, "Unidade é obrigatória"),
	preco: z
		.string()
		.min(1, "Preço é obrigatório")
		.refine((valor) => {
			const numero = Number.parseFloat(valor);
			return !Number.isNaN(numero) && numero >= 0;
		}, "Preço inválido"),
	decimaispreco: z.number().int().min(0).max(6).default(2),
	iat: z.enum(["A", "T"]).optional().nullable(),
	codigolistalc11603: z.string().max(5).optional().nullable(),
	codigotributacaonacional: z
		.string()
		.optional()
		.nullable()
		.refine(
			(valor) => !valor || /^\d{6}$/.test(valor),
			"Código de tributação nacional deve ter 6 dígitos",
		),
	codigonbs: z
		.string()
		.optional()
		.nullable()
		.refine(
			(valor) => !valor || /^\d{9}$/.test(valor),
			"Código NBS deve ter 9 dígitos",
		),
	cicloposvenda: z.number().int().min(0).default(0),
	idplanocontas: z.string().optional().nullable(),
	comissao: percentualOpcional(),
	comissaoavista: percentualOpcional(),
	comissaoprazo: percentualOpcional(),
	percentualcomissaoquitacao: percentualOpcional(),
	observacoes: z.string().optional().nullable(),
	situacaoiss: z.string().max(7).optional().nullable(),
	aliquotaiss: percentualOpcional(),
	exigibilidadeiss: z.string().max(1).default("1"),
	processoisencaoiss: z.string().max(60).optional().nullable(),
	incentivofiscal: z.boolean().default(false),
	codigomunicipalservico: z.string().max(20).optional().nullable(),
	cstpis: z.string().max(2).optional().nullable(),
	cstcofins: z.string().max(2).optional().nullable(),
	aliquotapis: percentualOpcional(),
	aliquotacofins: percentualOpcional(),
	idcfopsaida: z.string().optional().nullable(),
	idcfopsaidaexterna: z.string().optional().nullable(),
	enviamobile: z.boolean().default(false),
	tipoimpressaogourmet: z.string().max(40).optional().nullable(),
});

export type ServicoFormData = z.infer<typeof servicoFormSchema>;

export const SERVICO_FORM_DEFAULTS: ServicoFormData = {
	codigo: undefined as unknown as number,
	itemrapido: false,
	podeserbrinde: false,
	ativo: true,
	nome: "",
	nomeecf: null,
	idunidademedida: "",
	preco: "0.00",
	decimaispreco: 2,
	iat: "T",
	codigolistalc11603: null,
	codigotributacaonacional: null,
	codigonbs: null,
	cicloposvenda: 0,
	idplanocontas: null,
	comissao: "0.00",
	comissaoavista: "0.00",
	comissaoprazo: "0.00",
	percentualcomissaoquitacao: "0.00",
	observacoes: null,
	situacaoiss: null,
	aliquotaiss: "0.00",
	exigibilidadeiss: "1",
	processoisencaoiss: null,
	incentivofiscal: false,
	codigomunicipalservico: null,
	cstpis: null,
	cstcofins: null,
	aliquotapis: "0.00",
	aliquotacofins: "0.00",
	idcfopsaida: null,
	idcfopsaidaexterna: null,
	enviamobile: false,
	tipoimpressaogourmet: null,
};

export const OPCOES_SITUACAO_ISS = [
	{ value: "N", label: "Normal" },
	{ value: "R", label: "Retido" },
	{ value: "S", label: "Substituição tributária" },
	{ value: "I", label: "Isento" },
] as const;

export const OPCOES_EXIGIBILIDADE_ISS = [
	{ value: "1", label: "1 - Exigível" },
	{ value: "2", label: "2 - Não incidência" },
	{ value: "3", label: "3 - Isenção" },
	{ value: "4", label: "4 - Exportação" },
	{ value: "5", label: "5 - Imunidade" },
	{ value: "6", label: "6 - Exigibilidade suspensa por decisão judicial" },
	{
		value: "7",
		label: "7 - Exigibilidade suspensa por processo administrativo",
	},
] as const;
