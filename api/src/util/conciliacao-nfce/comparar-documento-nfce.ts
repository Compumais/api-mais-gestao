import type {
	DivergenciaDocumentoNfce,
	ResultadoComparacaoNfce,
	ResumoDocumentoNfce,
} from "./tipos-conciliacao-nfce.js";

function digitos(valor: string | null | undefined): string {
	return (valor ?? "").replace(/\D/g, "");
}

function numeroFiscal(valor: string | null | undefined): number | null {
	const digitosValor = digitos(valor);
	if (!digitosValor) return null;
	const n = Number(digitosValor);
	return Number.isFinite(n) ? n : null;
}

function valoresProximos(
	local: number | null,
	sefaz: number | null,
	tolerancia: number,
): boolean | null {
	if (local == null || sefaz == null) return null;
	return Math.abs(local - sefaz) <= tolerancia;
}

function adicionarSeDivergir(
	divergencias: DivergenciaDocumentoNfce[],
	campo: string,
	local: string | null,
	sefaz: string | null,
	iguais: boolean | null,
): void {
	if (iguais === false) {
		divergencias.push({
			campo,
			local: local ?? "não informado",
			sefaz: sefaz ?? "não informado",
		});
	}
}

function pagamentosIguais(
	local: ResumoDocumentoNfce["pagamentos"],
	sefaz: ResumoDocumentoNfce["pagamentos"],
): boolean | null {
	if (local.length === 0 || sefaz.length === 0) return null;
	const normalizar = (itens: ResumoDocumentoNfce["pagamentos"]) =>
		[...itens]
			.map((item) => `${item.tPag}:${item.vPag.toFixed(2)}`)
			.sort()
			.join("|");
	return normalizar(local) === normalizar(sefaz);
}

export function compararDocumentoNfce(
	local: ResumoDocumentoNfce,
	sefaz: ResumoDocumentoNfce,
): ResultadoComparacaoNfce {
	const divergencias: DivergenciaDocumentoNfce[] = [];
	const avisos: string[] = [];

	adicionarSeDivergir(
		divergencias,
		"CNPJ emitente",
		local.cnpjEmitente,
		sefaz.cnpjEmitente,
		local.cnpjEmitente && sefaz.cnpjEmitente
			? digitos(local.cnpjEmitente) === digitos(sefaz.cnpjEmitente)
			: null,
	);
	adicionarSeDivergir(
		divergencias,
		"modelo",
		local.modelo,
		sefaz.modelo,
		local.modelo && sefaz.modelo
			? digitos(local.modelo) === digitos(sefaz.modelo)
			: null,
	);

	const serieLocal = numeroFiscal(local.serie);
	const serieSefaz = numeroFiscal(sefaz.serie);
	adicionarSeDivergir(
		divergencias,
		"série",
		local.serie,
		sefaz.serie,
		serieLocal != null && serieSefaz != null ? serieLocal === serieSefaz : null,
	);

	const numeroLocal = numeroFiscal(local.numero);
	const numeroSefaz = numeroFiscal(sefaz.numero);
	adicionarSeDivergir(
		divergencias,
		"número",
		local.numero,
		sefaz.numero,
		numeroLocal != null && numeroSefaz != null
			? numeroLocal === numeroSefaz
			: null,
	);

	const valorIgual = valoresProximos(local.valorTotal, sefaz.valorTotal, 0.01);
	adicionarSeDivergir(
		divergencias,
		"valor total",
		local.valorTotal?.toFixed(2) ?? null,
		sefaz.valorTotal?.toFixed(2) ?? null,
		valorIgual,
	);

	const destLocal = digitos(local.documentoDestinatario);
	const destSefaz = digitos(sefaz.documentoDestinatario);
	adicionarSeDivergir(
		divergencias,
		"destinatário",
		destLocal || null,
		destSefaz || null,
		destLocal && destSefaz ? destLocal === destSefaz : null,
	);

	adicionarSeDivergir(
		divergencias,
		"quantidade de itens",
		local.quantidadeItens != null ? String(local.quantidadeItens) : null,
		sefaz.quantidadeItens != null ? String(sefaz.quantidadeItens) : null,
		local.quantidadeItens != null && sefaz.quantidadeItens != null
			? local.quantidadeItens === sefaz.quantidadeItens
			: null,
	);

	const quantidadeIgual = valoresProximos(
		local.quantidadeTotal,
		sefaz.quantidadeTotal,
		0.001,
	);
	adicionarSeDivergir(
		divergencias,
		"quantidade",
		local.quantidadeTotal?.toString() ?? null,
		sefaz.quantidadeTotal?.toString() ?? null,
		quantidadeIgual,
	);

	adicionarSeDivergir(
		divergencias,
		"desconto",
		local.desconto?.toFixed(2) ?? null,
		sefaz.desconto?.toFixed(2) ?? null,
		valoresProximos(local.desconto, sefaz.desconto, 0.01),
	);
	adicionarSeDivergir(
		divergencias,
		"acréscimo",
		local.acrescimo?.toFixed(2) ?? null,
		sefaz.acrescimo?.toFixed(2) ?? null,
		valoresProximos(local.acrescimo, sefaz.acrescimo, 0.01),
	);

	const pagamentoIgual = pagamentosIguais(local.pagamentos, sefaz.pagamentos);
	adicionarSeDivergir(
		divergencias,
		"pagamento",
		local.pagamentos
			.map((item) => `${item.tPag}:${item.vPag.toFixed(2)}`)
			.join(", ") || null,
		sefaz.pagamentos
			.map((item) => `${item.tPag}:${item.vPag.toFixed(2)}`)
			.join(", ") || null,
		pagamentoIgual,
	);

	if (
		local.tpEmis &&
		sefaz.tpEmis &&
		digitos(local.tpEmis) !== digitos(sefaz.tpEmis)
	) {
		avisos.push(
			`Tipo de emissão diferente (local ${local.tpEmis}, SEFAZ ${sefaz.tpEmis}). A comparação usa os demais dados da operação.`,
		);
	}

	const evidenciaInsuficiente = sefaz.valorTotal == null || numeroSefaz == null;
	const equivalente = !evidenciaInsuficiente && divergencias.length === 0;

	return {
		equivalente,
		evidenciaInsuficiente,
		divergencias,
		avisos,
	};
}
