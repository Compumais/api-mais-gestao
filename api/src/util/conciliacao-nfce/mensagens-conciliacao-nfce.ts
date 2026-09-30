import type { DivergenciaDocumentoNfce } from "./tipos-conciliacao-nfce.js";

function formatarMoeda(valor: number | null | undefined): string {
	if (valor == null || !Number.isFinite(valor)) return "não informado";
	return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function mensagemNfceRecuperada(params: {
	chave: string;
	protocolo?: string | null;
}): string {
	const protocolo = params.protocolo?.trim() || "não informado";
	return [
		"NFC-e recuperada automaticamente.",
		"",
		"A SEFAZ já havia autorizado este documento.",
		"O retorno original não havia sido recebido pelo ERP.",
		"",
		`Chave: ${params.chave}`,
		`Protocolo: ${protocolo}`,
	].join("\n");
}

export function mensagemNfceConflito(params: {
	numero?: string | null;
	serie?: string | null;
	chave?: string | null;
	valorLocal?: number | null;
	valorSefaz?: number | null;
	divergencias?: DivergenciaDocumentoNfce[];
}): string {
	const linhas = [
		"A NFC-e não pôde ser recuperada automaticamente.",
		"",
		"Foi localizado um documento fiscal diferente na SEFAZ.",
		"A emissão foi bloqueada para evitar duplicidade ou inconsistência fiscal.",
		"",
		`Número: ${params.numero || "não informado"}`,
		`Série: ${params.serie || "não informada"}`,
		`Chave: ${params.chave || "não informada"}`,
		"",
		"Documento local:",
		`Valor: ${formatarMoeda(params.valorLocal)}`,
		"",
		"Documento SEFAZ:",
		`Valor: ${formatarMoeda(params.valorSefaz)}`,
		"",
		"Existem divergências entre os documentos.",
		"A recuperação automática foi interrompida.",
	];

	const detalhes = (params.divergencias ?? []).slice(0, 8);
	if (detalhes.length > 0) {
		linhas.push("", "Divergências:");
		for (const item of detalhes) {
			linhas.push(`${item.campo}: local ${item.local} / SEFAZ ${item.sefaz}`);
		}
	}

	linhas.push("", "Consulte os detalhes da ocorrência.");
	return linhas.join("\n");
}

export function mensagemNfceAguardandoConsulta(): string {
	return [
		"A situação fiscal desta NFC-e está sendo confirmada com a SEFAZ.",
		"",
		"Não realize uma nova emissão enquanto a conciliação estiver pendente.",
	].join("\n");
}

export function mensagemNfceConcorrencia(): string {
	return [
		"Já existe uma emissão ou recuperação desta NFC-e em andamento.",
		"",
		"Aguarde a conclusão da conciliação antes de tentar novamente.",
	].join("\n");
}

export function mensagemConflitoNumeracao(params: {
	numero: string | number;
	serie: string | number;
}): string {
	return [
		"Conflito de numeração fiscal.",
		"",
		`O número ${params.numero} da série ${params.serie} já está associado a outro documento.`,
		"Nenhuma nova NFC-e foi criada para esta operação.",
	].join("\n");
}

export function logConciliacaoNfce(
	evento: string,
	dados: Record<string, unknown>,
): void {
	console.info(
		JSON.stringify({
			escopo: "nfce-conciliacao",
			evento,
			...dados,
		}),
	);
}
