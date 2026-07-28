import {
	ORDEM_SERVICO_CAMPOS_EXTRA,
	type OrdemServicoStatusCodigo,
	obterStatusPadraoPorNumero,
	podeTransicionarStatus,
} from "@/constants/ordem-servico-status";
import type {
	CampoExtraOrdemServico,
	OrdemServico,
	TipoOrdemServicoEvento,
} from "@/services/ordem-servico.service";

export function formatarMoedaOs(valor: string | number | null | undefined) {
	const numero =
		typeof valor === "number" ? valor : parseFloat(String(valor ?? "0"));
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(Number.isFinite(numero) ? numero : 0);
}

export function formatarDataOs(data: string | null | undefined) {
	if (!data) return "—";
	try {
		const apenasData = data.length === 10 ? `${data}T12:00:00` : data;
		return new Date(apenasData).toLocaleDateString("pt-BR");
	} catch {
		return data;
	}
}

export function formatarDataHoraOs(data: string | null | undefined) {
	if (!data) return "—";
	try {
		return new Date(data).toLocaleString("pt-BR");
	} catch {
		return data;
	}
}

export function osEstaCancelada(
	os: Pick<OrdemServico, "status"> | null | undefined,
) {
	return os?.status === 4;
}

export function osEstaFaturada(
	os:
		| Pick<OrdemServico, "status" | "geroufinanceiro" | "faturouparanota">
		| null
		| undefined,
) {
	return (
		os?.status === 5 || os?.geroufinanceiro === 1 || os?.faturouparanota === 1
	);
}

export function osBloqueadaEdicao(
	os: Pick<OrdemServico, "status"> | null | undefined,
) {
	return osEstaCancelada(os) || os?.status === 8 || os?.status === 13;
}

/** OS ainda não iniciada (Aberta ou Orçamento), sem financeiro/NF. */
export function osPodeExcluir(
	os:
		| Pick<OrdemServico, "status" | "geroufinanceiro" | "faturouparanota">
		| null
		| undefined,
) {
	if (!os) return false;
	if (os.geroufinanceiro === 1 || os.faturouparanota === 1) return false;
	// 1 = ABERTA, 11 = ORCAMENTO
	return os.status === 1 || os.status === 11;
}

export function obterTipoPorStatus(
	tipos: TipoOrdemServicoEvento[],
	status: number | null | undefined,
) {
	if (status == null) return undefined;
	return (
		tipos.find((tipo) => tipo.status === status) ??
		(() => {
			const padrao = obterStatusPadraoPorNumero(status);
			if (!padrao) return undefined;
			return {
				id: "",
				idempresa: "",
				codigo: padrao.codigo,
				status: padrao.status,
				cor: padrao.cor,
				descricao: padrao.descricao,
				ordem: padrao.ordem,
				ativo: 1,
				padrao: 1,
			} satisfies TipoOrdemServicoEvento;
		})()
	);
}

export function filtrarTiposTransicao(
	tipos: TipoOrdemServicoEvento[],
	statusAtual: number | null | undefined,
) {
	const atual = obterTipoPorStatus(tipos, statusAtual);
	if (!atual) return tipos.filter((t) => t.ativo === 1);

	return tipos.filter((tipo) => {
		if (tipo.ativo !== 1) return false;
		return podeTransicionarStatus(
			atual.codigo as OrdemServicoStatusCodigo,
			tipo.codigo as OrdemServicoStatusCodigo,
		);
	});
}

export function extrairExtrasOs(
	os: Partial<OrdemServico> | null | undefined,
): Record<(typeof ORDEM_SERVICO_CAMPOS_EXTRA)[number], string> {
	const extras = {} as Record<
		(typeof ORDEM_SERVICO_CAMPOS_EXTRA)[number],
		string
	>;
	for (const campo of ORDEM_SERVICO_CAMPOS_EXTRA) {
		extras[campo] = (os?.[campo] as string | null | undefined) ?? "";
	}
	return extras;
}

export function camposExtrasAtivos(
	camposextras: CampoExtraOrdemServico[] | null | undefined,
) {
	return (camposextras ?? []).filter((campo) => campo.ativo);
}

export function corContrasteTexto(hex: string | null | undefined) {
	const cor = (hex ?? "#FFFFFF").replace("#", "");
	if (cor.length !== 6) return "#111827";
	const r = Number.parseInt(cor.slice(0, 2), 16);
	const g = Number.parseInt(cor.slice(2, 4), 16);
	const b = Number.parseInt(cor.slice(4, 6), 16);
	const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminancia > 0.6 ? "#111827" : "#FFFFFF";
}
