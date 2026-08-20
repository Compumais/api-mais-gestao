import { maskCep, maskCpfCnpj, maskPhone } from "@/lib/masks";

export type DadosDestinatarioNfe = {
	razaosocial?: string | null;
	nome?: string | null;
	cnpjcpf?: string | null;
	tipopessoa?: number | null;
	inscricaoestadual?: string | null;
	indiedest?: number | null;
	email?: string | null;
	telefone?: string | null;
	endereco?: string | null;
	numeroendereco?: string | null;
	complemento?: string | null;
	bairro?: string | null;
	idcidade?: string | null;
	cidade?: string | null;
	estado?: string | null;
	cep?: string | null;
};

export function labelTipoPessoa(tipopessoa?: number | null): string | null {
	if (tipopessoa === 0) return "Pessoa Física";
	if (tipopessoa === 1) return "Pessoa Jurídica";
	return null;
}

export const OPCOES_IND_IEDEST_NFE = [
	{ value: "1", label: "1 - Contribuinte ICMS" },
	{ value: "2", label: "2 - Contribuinte isento de IE" },
	{ value: "9", label: "9 - Não contribuinte" },
] as const;

export type IndIeDestNfe = 1 | 2 | 9;

export function labelIndIeDest(indiedest?: number | null): string | null {
	if (indiedest === 1) return "1 — Contribuinte ICMS";
	if (indiedest === 2) return "2 — Contribuinte Isento de IE";
	if (indiedest === 9) return "9 — Não Contribuinte";
	return null;
}

/** Infere indIEDest para exibição/cadastro quando o banco não tem valor gravado. */
export function inferirIndIeDestEntidade(params: {
	cnpjcpf?: string | null;
	inscricaoestadual?: string | null;
	indiedest?: number | null;
}): IndIeDestNfe | null {
	if (
		params.indiedest === 1 ||
		params.indiedest === 2 ||
		params.indiedest === 9
	) {
		return params.indiedest;
	}

	const documento = params.cnpjcpf?.replace(/\D/g, "") ?? "";
	if (documento.length === 11) {
		return 9;
	}

	const ie = params.inscricaoestadual?.trim().toUpperCase() ?? "";
	if (ie === "ISENTO" || ie === "ISENTA") {
		return 2;
	}

	if (ie.replace(/\D/g, "").length > 0) {
		return 1;
	}

	if (documento.length === 14) {
		return 9;
	}

	return null;
}

export function formatarInscricaoEstadualDestinatario(
	dados: Pick<DadosDestinatarioNfe, "inscricaoestadual" | "indiedest">,
): string {
	if (dados.indiedest === 2) return "Isento";
	if (dados.indiedest === 9) return "Não contribuinte";
	if (dados.inscricaoestadual?.trim()) return dados.inscricaoestadual.trim();
	if (dados.indiedest === 1) return "—";
	return "Não informada";
}

export function formatarDocumentoDestinatario(
	cnpjcpf?: string | null,
): string {
	if (!cnpjcpf?.trim()) return "—";
	return maskCpfCnpj(cnpjcpf);
}

export function formatarEnderecoDestinatario(
	dados: DadosDestinatarioNfe,
): string | null {
	const partes = [
		dados.endereco,
		dados.numeroendereco && `nº ${dados.numeroendereco}`,
		dados.complemento,
		dados.bairro,
		dados.cidade ?? dados.idcidade,
		dados.estado,
		dados.cep && `CEP ${maskCep(dados.cep)}`,
	].filter(Boolean);

	return partes.length > 0 ? partes.join(", ") : null;
}

export function montarCamposDestinatarioNfe(dados: DadosDestinatarioNfe) {
	const nomeExibicao = dados.razaosocial?.trim() || dados.nome?.trim() || "—";
	const nomeFantasia =
		dados.nome?.trim() &&
		dados.razaosocial?.trim() &&
		dados.nome.trim() !== dados.razaosocial.trim()
			? dados.nome.trim()
			: null;
	const endereco = formatarEnderecoDestinatario(dados);
	const tipoContribuinte = labelIndIeDest(dados.indiedest);

	return [
		{ label: "Nome / Razão Social", valor: nomeExibicao },
		...(nomeFantasia
			? [{ label: "Nome Fantasia", valor: nomeFantasia }]
			: []),
		{
			label: "CNPJ / CPF",
			valor: formatarDocumentoDestinatario(dados.cnpjcpf),
			mono: true,
		},
		...(labelTipoPessoa(dados.tipopessoa)
			? [
					{
						label: "Tipo de Pessoa",
						valor: labelTipoPessoa(dados.tipopessoa) as string,
					},
				]
			: []),
		{
			label: "Inscrição Estadual",
			valor: formatarInscricaoEstadualDestinatario(dados),
		},
		...(tipoContribuinte
			? [{ label: "Tipo de Contribuinte", valor: tipoContribuinte }]
			: []),
		...(dados.email?.trim()
			? [{ label: "E-mail", valor: dados.email.trim() }]
			: []),
		...(dados.telefone?.trim()
			? [{ label: "Telefone", valor: maskPhone(dados.telefone) }]
			: []),
		...(endereco ? [{ label: "Endereço", valor: endereco, fullWidth: true }] : []),
	] as Array<{
		label: string;
		valor: string;
		mono?: boolean;
		fullWidth?: boolean;
	}>;
}
