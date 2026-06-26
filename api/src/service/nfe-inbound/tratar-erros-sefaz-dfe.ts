export type AcaoErroSefazDfe =
	| "continuar"
	| "parar_sucesso"
	| "parar_backoff"
	| "parar_certificado"
	| "parar_nao_distribuido"
	| "erro";

const MENSAGEM_ERRO_217 = [
	"[217] A NF-e não está disponível na Distribuição DF-e para o CNPJ e ambiente consultados.",
	"Isso não significa que a nota não existe — ela pode ter sido recebida do fornecedor sem entrar na fila da SEFAZ para este CNPJ.",
	"Verifique: (1) CNPJ destinatário no XML vs empresa logada; (2) ambiente Produção/Homologação na configuração NF-e; (3) chave com 44 dígitos corretos.",
	"Se você já possui o XML do fornecedor, use a aba Importar XML em vez da consulta por chave.",
].join(" ");

const MENSAGEM_ERRO_632 = [
	"[632] A NF-e não está mais disponível para download na SEFAZ (prazo de 90 dias).",
	"Use o XML recebido do fornecedor na aba Importar XML.",
].join(" ");

const MENSAGEM_ERRO_640 = [
	"[640] O CNPJ consultado não tem permissão para baixar esta NF-e na Distribuição DF-e.",
	"Confirme se a empresa logada é o destinatário, transportador ou terceiro (autXML) da nota.",
].join(" ");

export type ResultadoTratamentoErroSefaz = {
	acao: AcaoErroSefazDfe;
	mensagem: string;
};

export function tratarErroSefazDfe(cStat?: string, xMotivo?: string): ResultadoTratamentoErroSefaz {
	const motivo = xMotivo ?? "Erro desconhecido na Distribuição DF-e";

	switch (cStat) {
		case "137":
			return {
				acao: "parar_sucesso",
				mensagem: "Nenhum documento localizado — fila sincronizada",
			};
		case "138":
			return {
				acao: "continuar",
				mensagem: "Documentos localizados",
			};
		case "656":
			return {
				acao: "parar_backoff",
				mensagem: `Consumo indevido: ${motivo}`,
			};
		case "593":
			return {
				acao: "parar_certificado",
				mensagem: `Certificado inválido: ${motivo}`,
			};
		case "217":
			return {
				acao: "parar_nao_distribuido",
				mensagem: MENSAGEM_ERRO_217,
			};
		case "632":
			return {
				acao: "parar_nao_distribuido",
				mensagem: MENSAGEM_ERRO_632,
			};
		case "640":
			return {
				acao: "parar_nao_distribuido",
				mensagem: MENSAGEM_ERRO_640,
			};
		default:
			if (!cStat) {
				return {
					acao: "erro",
					mensagem: motivo,
				};
			}

			return {
				acao: "erro",
				mensagem: `[${cStat}] ${motivo}`,
			};
	}
}

export function calcularProximoBackoffMs(tentativas: number): number {
	const baseMs = 60 * 60 * 1000;
	const fator = Math.min(2 ** Math.max(tentativas - 1, 0), 24);
	return baseMs * fator;
}
