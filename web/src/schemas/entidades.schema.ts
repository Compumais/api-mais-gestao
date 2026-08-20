import { z } from "zod";
import {
	somenteDigitos,
	validarCpfCnpj,
	validarFormatoInscricaoEstadual,
	validarTelefone,
} from "@/lib/documentos-brasil";
import { maskCep, maskCpfCnpj, maskPhone } from "@/lib/masks";
import type { Entidade } from "@/services/entidades.service";
import { inferirIndIeDestEntidade } from "@/util/destinatario-nfe-util";

const flagEntidadeSchema = z.boolean().default(false);

export const criarEntidadeSchema = z
	.object({
		idempresa: z.uuid("ID da empresa inválido"),
		nome: z
			.string()
			.min(1, "Nome é obrigatório")
			.min(3, "Nome deve ter no mínimo 3 caracteres")
			.max(120, "Nome deve ter no máximo 120 caracteres"),
		razaosocial: z
			.string()
			.max(120, "Razão social deve ter no máximo 120 caracteres")
			.nullable()
			.optional(),
		tipopessoa: z.number().int().min(0).max(1).nullable().optional(),
		cnpjcpf: z
			.string()
			.min(1, "CNPJ/CPF é obrigatório")
			.max(20, "CNPJ/CPF deve ter no máximo 20 caracteres"),
		inscricaoestadual: z
			.string()
			.max(20, "Inscrição estadual deve ter no máximo 20 caracteres")
			.nullable()
			.optional(),
		rg: z
			.string()
			.max(20, "RG deve ter no máximo 20 caracteres")
			.nullable()
			.optional(),
		email: z
			.union([
				z
					.string()
					.email("Email inválido")
					.max(200, "Email deve ter no máximo 200 caracteres"),
				z.literal(""),
				z.null(),
			])
			.nullable(),
		telefone: z
			.string()
			.max(40, "Telefone deve ter no máximo 40 caracteres")
			.nullable()
			.optional(),
		endereco: z
			.string()
			.max(120, "Endereço deve ter no máximo 120 caracteres")
			.nullable()
			.optional(),
		numeroendereco: z
			.string()
			.max(20, "Número do endereço deve ter no máximo 20 caracteres")
			.nullable()
			.optional(),
		complemento: z
			.string()
			.max(60, "Complemento deve ter no máximo 60 caracteres")
			.nullable()
			.optional(),
		bairro: z
			.string()
			.max(60, "Bairro deve ter no máximo 60 caracteres")
			.nullable()
			.optional(),
		idcidade: z.string().nullable().optional(),
		idestado: z.string().nullable().optional(),
		cep: z
			.string()
			.max(9, "CEP deve ter no máximo 9 caracteres")
			.nullable()
			.optional(),
		fax: z
			.string()
			.max(40, "Fax deve ter no máximo 40 caracteres")
			.nullable()
			.optional(),
		nascimento: z.string().nullable().optional(),
		idplanocontas: z.string().nullable().optional(),
		pais: z.string().nullable().optional(),
		cliente: flagEntidadeSchema,
		fornecedor: flagEntidadeSchema,
		transportador: flagEntidadeSchema,
		representante: flagEntidadeSchema,
		indiedest: z
			.number()
			.int()
			.refine((valor) => [1, 2, 9].includes(valor), {
				message: "Selecione o indicador de IE para NF-e",
			})
			.nullable()
			.optional(),
	})
	.superRefine((data, ctx) => {
		if (!validarCpfCnpj(data.cnpjcpf)) {
			ctx.addIssue({
				code: "custom",
				path: ["cnpjcpf"],
				message: "CNPJ/CPF inválido",
			});
		}

		if (!validarTelefone(data.telefone)) {
			ctx.addIssue({
				code: "custom",
				path: ["telefone"],
				message: "Telefone inválido",
			});
		}

		if (!validarTelefone(data.fax)) {
			ctx.addIssue({
				code: "custom",
				path: ["fax"],
				message: "Fax inválido",
			});
		}

		if (
			data.indiedest !== 1 &&
			data.indiedest !== 2 &&
			data.indiedest !== 9
		) {
			ctx.addIssue({
				code: "custom",
				path: ["indiedest"],
				message: "Selecione o indicador de IE para NF-e",
			});
		}

		if (data.tipopessoa === 0 && data.indiedest != null && data.indiedest !== 9) {
			ctx.addIssue({
				code: "custom",
				path: ["indiedest"],
				message: "Pessoa física deve ser não contribuinte (indicador 9)",
			});
		}

		const ieNumerica = somenteDigitos(data.inscricaoestadual ?? "");
		const exigeIeContribuinte = data.tipopessoa === 1 && data.indiedest === 1;

		if (exigeIeContribuinte && ieNumerica.length === 0) {
			ctx.addIssue({
				code: "custom",
				path: ["inscricaoestadual"],
				message: "Informe a inscrição estadual do contribuinte ICMS",
			});
		}

		if (exigeIeContribuinte && !data.idestado) {
			ctx.addIssue({
				code: "custom",
				path: ["idestado"],
				message: "Selecione o estado do contribuinte ICMS",
			});
		}

		if (!validarFormatoInscricaoEstadual(data.inscricaoestadual, data.indiedest)) {
			ctx.addIssue({
				code: "custom",
				path: ["inscricaoestadual"],
				message: "Inscrição estadual inválida",
			});
		}

		const cepLimpo = data.cep?.replace(/\D/g, "") ?? "";
		if (cepLimpo && cepLimpo.length !== 8) {
			ctx.addIssue({
				code: "custom",
				path: ["cep"],
				message: "CEP deve conter 8 dígitos",
			});
		}
	});

export type CriarEntidadeFormInput = z.input<typeof criarEntidadeSchema>;
export type CriarEntidadeFormData = z.output<typeof criarEntidadeSchema>;
export type TipoEntidadePrincipal = "cliente" | "fornecedor";

export function formatarCepParaEnvio(
	cep: string | null | undefined,
): string | null {
	if (!cep) return null;
	const limpo = cep.replace(/\D/g, "");
	if (!limpo) return null;
	return limpo.slice(0, 8);
}

export function flagsEntidadeParaApi(data: CriarEntidadeFormData) {
	return {
		cliente: data.cliente ? 1 : 0,
		fornecedor: data.fornecedor ? 1 : 0,
		transportador: data.transportador ? 1 : 0,
		representante: data.representante ? 1 : 0,
	};
}

export function flagsEntidadeParaForm(entidade: {
	cliente?: number | string | null;
	fornecedor?: number | string | null;
	transportador?: number | string | null;
	representante?: number | string | null;
}) {
	const ativo = (valor?: number | string | null) => Number(valor) === 1;

	return {
		cliente: ativo(entidade.cliente),
		fornecedor: ativo(entidade.fornecedor),
		transportador: ativo(entidade.transportador),
		representante: ativo(entidade.representante),
	};
}

function normalizarTipopessoaParaForm(
	tipopessoa: number | string | null | undefined,
	cnpjcpf: string,
): number | null {
	const digitos = cnpjcpf.replace(/\D/g, "");
	if (digitos.length === 14) return 1;
	if (digitos.length === 11) return 0;

	if (tipopessoa !== null && tipopessoa !== undefined && tipopessoa !== "") {
		const valor = Number(tipopessoa);
		if (!Number.isNaN(valor) && (valor === 0 || valor === 1)) {
			return valor;
		}
	}

	return null;
}

export function inferirTipopessoaPorDocumento(
	cnpjcpf?: string | null,
): 0 | 1 | null {
	const digitos = cnpjcpf?.replace(/\D/g, "") ?? "";
	if (digitos.length === 14) return 1;
	if (digitos.length === 11) return 0;
	return null;
}

function normalizarIdLocalidade(
	valor: string | null | undefined,
): string | null {
	if (!valor) return null;
	const normalizado = valor.trim();
	return normalizado.length > 0 ? normalizado : null;
}

export function montarIndIeDestPayload(data: CriarEntidadeFormData): {
	indiedest: number | null;
	inscricaoestadual: string | null;
} {
	const indiedest = data.indiedest ?? null;
	let inscricaoestadual = data.inscricaoestadual?.trim() || null;

	if (indiedest === 9) {
		inscricaoestadual = null;
	} else if (indiedest === 2) {
		const ie = inscricaoestadual?.toUpperCase() ?? "";
		if (!ie || ie === "ISENTO" || ie === "ISENTA") {
			inscricaoestadual = "ISENTO";
		}
	} else if (indiedest === 1 && inscricaoestadual) {
		const ieUpper = inscricaoestadual.toUpperCase();
		if (ieUpper !== "ISENTO" && ieUpper !== "ISENTA") {
			inscricaoestadual = somenteDigitos(inscricaoestadual) || null;
		}
	}

	return { indiedest, inscricaoestadual };
}

export function mapEntidadeToForm(
	entidade: Entidade,
): Partial<CriarEntidadeFormData> {
	const indiedest =
		inferirIndIeDestEntidade({
			cnpjcpf: entidade.cnpjcpf,
			inscricaoestadual: entidade.inscricaoestadual,
			indiedest: entidade.indiedest,
		}) ?? null;

	return {
		idempresa: entidade.idempresa,
		nome: entidade.nome,
		cnpjcpf: maskCpfCnpj(entidade.cnpjcpf),
		razaosocial: entidade.razaosocial,
		tipopessoa: normalizarTipopessoaParaForm(
			entidade.tipopessoa,
			entidade.cnpjcpf,
		),
		inscricaoestadual: indiedest === 9 ? null : entidade.inscricaoestadual,
		rg: entidade.rg,
		email: entidade.email,
		telefone: entidade.telefone ? maskPhone(entidade.telefone) : null,
		endereco: entidade.endereco,
		numeroendereco: entidade.numeroendereco,
		complemento: entidade.complemento,
		bairro: entidade.bairro,
		idcidade: normalizarIdLocalidade(entidade.idcidade),
		idestado: normalizarIdLocalidade(entidade.idestado)?.toUpperCase() ?? null,
		cep: entidade.cep ? maskCep(entidade.cep) : null,
		fax: entidade.fax ? maskPhone(entidade.fax) : null,
		nascimento: entidade.nascimento ? entidade.nascimento.slice(0, 10) : null,
		idplanocontas: entidade.idplanocontas,
		pais: entidade.pais ?? "Brasil",
		...flagsEntidadeParaForm(entidade),
		indiedest,
	};
}

export function criarValoresPadraoEntidadeForm({
	empresaId,
	valoresIniciais,
	isEdicao = false,
	tipoPrincipal = "cliente",
}: {
	empresaId?: string;
	valoresIniciais?: Partial<CriarEntidadeFormData>;
	isEdicao?: boolean;
	tipoPrincipal?: TipoEntidadePrincipal;
}): CriarEntidadeFormData {
	const base: CriarEntidadeFormData = {
		idempresa: empresaId || "",
		nome: "",
		cnpjcpf: "",
		razaosocial: null,
		tipopessoa: null,
		inscricaoestadual: null,
		rg: null,
		email: null,
		telefone: null,
		endereco: null,
		numeroendereco: null,
		complemento: null,
		bairro: null,
		idcidade: null,
		idestado: null,
		cep: null,
		fax: null,
		nascimento: null,
		idplanocontas: null,
		pais: "Brasil",
		cliente: tipoPrincipal === "cliente",
		fornecedor: tipoPrincipal === "fornecedor",
		transportador: false,
		representante: false,
		indiedest: null,
	};

	if (!isEdicao || !valoresIniciais) {
		return base;
	}

	return {
		...base,
		...valoresIniciais,
		idempresa: valoresIniciais.idempresa ?? empresaId ?? "",
		pais: valoresIniciais.pais ?? "Brasil",
		cliente: valoresIniciais.cliente ?? false,
		fornecedor: valoresIniciais.fornecedor ?? false,
		transportador: valoresIniciais.transportador ?? false,
		representante: valoresIniciais.representante ?? false,
		indiedest: valoresIniciais.indiedest ?? base.indiedest,
		inscricaoestadual:
			valoresIniciais.inscricaoestadual ?? base.inscricaoestadual,
	};
}
