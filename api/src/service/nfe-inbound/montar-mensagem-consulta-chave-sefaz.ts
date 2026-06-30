import {
	MENSAGEM_ERRO_137,
	MENSAGEM_ERRO_217,
	MENSAGEM_ERRO_632,
	MENSAGEM_ERRO_640,
} from "./tratar-erros-sefaz-dfe.js";

export type ConsultaSituacaoChaveNfe = {
	cStat?: string;
	xMotivo?: string;
};

export const MENSAGEM_ERRO_138_SEM_DOC = [
	"[138] A SEFAZ indicou documentos na Distribuição DF-e, mas nenhum XML corresponde à chave informada.",
	"Verifique se a chave está correta e se a empresa logada é a destinatária da nota.",
	"Se você já possui o XML do fornecedor, use a aba Importar XML.",
].join(" ");

function descreverAmbiente(tpAmb?: number): string {
	if (tpAmb === 1) return "Produção";
	if (tpAmb === 2) return "Homologação";
	return tpAmb !== undefined ? String(tpAmb) : "configurado";
}

function mensagemBaseDfe(cStatDfe?: string): string {
	switch (cStatDfe) {
		case "137":
			return MENSAGEM_ERRO_137;
		case "217":
			return MENSAGEM_ERRO_217;
		case "632":
			return MENSAGEM_ERRO_632;
		case "640":
			return MENSAGEM_ERRO_640;
		default:
			return cStatDfe
				? `[${cStatDfe}] Documento não disponível na Distribuição DF-e.`
				: "Documento não disponível na Distribuição DF-e.";
	}
}

export function montarMensagemConsultaChaveSefaz({
	cStatDfe,
	consultaSituacao,
	tpAmb,
}: {
	cStatDfe?: string;
	consultaSituacao?: ConsultaSituacaoChaveNfe | null;
	tpAmb?: number;
}): string {
	const ambiente = descreverAmbiente(tpAmb);
	const cStatSituacao = consultaSituacao?.cStat;

	if (cStatSituacao === "100") {
		return [
			`[${cStatDfe ?? "DF-e"}] NF-e autorizada na SEFAZ (situação 100), mas o XML não está disponível na Distribuição DF-e para o CNPJ e ambiente (${ambiente}) consultados.`,
			consultaSituacao?.xMotivo ? `Motivo SEFAZ: ${consultaSituacao.xMotivo}` : "",
			"Importe pelo XML do fornecedor na aba Importar XML.",
		]
			.filter(Boolean)
			.join(" ");
	}

	if (cStatSituacao === "217" || cStatSituacao === "236") {
		return [
			`NF-e não localizada na SEFAZ no ambiente configurado (${ambiente}).`,
			consultaSituacao?.xMotivo ? `Motivo: ${consultaSituacao.xMotivo}` : "",
			"Verifique o ambiente em Configurações NF-e e se a chave pertence a uma nota desse ambiente.",
		]
			.filter(Boolean)
			.join(" ");
	}

	if (consultaSituacao?.xMotivo && cStatSituacao) {
		return [
			mensagemBaseDfe(cStatDfe),
			`Consulta de situação na SEFAZ retornou [${cStatSituacao}]: ${consultaSituacao.xMotivo}`,
		].join(" ");
	}

	return mensagemBaseDfe(cStatDfe);
}

export function deveConsultarSituacaoFallback(cStatDfe?: string): boolean {
	return cStatDfe === "137" || cStatDfe === "217" || cStatDfe === "632" || cStatDfe === "640";
}
