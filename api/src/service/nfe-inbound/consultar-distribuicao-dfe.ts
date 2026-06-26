import { consultarDistribuicaoDfeGateway } from "@/lib/nfe-gateway-client.js";
import { montarCredenciaisGatewayNfe } from "@/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import { buscarEmpresaFiscalPorEmpresa } from "@/repositories/empresa-fiscal-repositories.js";
import { obterCodigoUfIbge } from "@/util/montar-config-sped-nfe.js";
import { tratarErroSefazDfe } from "./tratar-erros-sefaz-dfe.js";

export class ErroConsultaDistribuicaoDfe extends Error {
	constructor(
		message: string,
		public readonly codigo:
			| "GATEWAY"
			| "CERTIFICADO"
			| "BACKOFF"
			| "TIMEOUT"
			| "SEFAZ",
		public readonly cStat?: string,
	) {
		super(message);
		this.name = "ErroConsultaDistribuicaoDfe";
	}
}

export type ResultadoConsultaDistribuicaoDfe = {
	cStat: string;
	xMotivo: string;
	ultNSU: string;
	maxNSU: string;
	docZip: Array<{ nsu: string; schema: string; content: string }>;
};

export async function consultarDistribuicaoDfe({
	idempresa,
	ultNSU,
}: {
	idempresa: string;
	ultNSU: string;
}): Promise<ResultadoConsultaDistribuicaoDfe> {
	const credenciais = await montarCredenciaisGatewayNfe(idempresa);

	if (!credenciais.ok) {
		throw new ErroConsultaDistribuicaoDfe(
			credenciais.pendencias.map((p) => p.mensagem).join("; "),
			"CERTIFICADO",
		);
	}

	const empresaFiscal = await buscarEmpresaFiscalPorEmpresa(idempresa);
	const cUFAutor = empresaFiscal?.uf
		? obterCodigoUfIbge(empresaFiscal.uf)
		: undefined;

	const resposta = await consultarDistribuicaoDfeGateway({
		configJson: credenciais.configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		ultNSU,
		...(cUFAutor !== undefined && { cUFAutor }),
	});

	if (!resposta.sucesso && resposta.erro) {
		const mensagem = resposta.erro.toLowerCase();
		if (mensagem.includes("abort") || mensagem.includes("timeout")) {
			throw new ErroConsultaDistribuicaoDfe(resposta.erro, "TIMEOUT");
		}
		throw new ErroConsultaDistribuicaoDfe(resposta.erro, "GATEWAY");
	}

	const tratamento = tratarErroSefazDfe(resposta.cStat, resposta.xMotivo);

	if (tratamento.acao === "parar_certificado") {
		throw new ErroConsultaDistribuicaoDfe(tratamento.mensagem, "CERTIFICADO", resposta.cStat);
	}

	if (tratamento.acao === "parar_backoff") {
		throw new ErroConsultaDistribuicaoDfe(tratamento.mensagem, "BACKOFF", resposta.cStat);
	}

	if (tratamento.acao === "erro") {
		throw new ErroConsultaDistribuicaoDfe(tratamento.mensagem, "SEFAZ", resposta.cStat);
	}

	return {
		cStat: resposta.cStat ?? "137",
		xMotivo: resposta.xMotivo ?? "",
		ultNSU: resposta.ultNSU ?? ultNSU,
		maxNSU: resposta.maxNSU ?? resposta.ultNSU ?? ultNSU,
		docZip: resposta.docZip ?? [],
	};
}
