import { consultarDistribuicaoDfePorChaveGateway } from "@/lib/nfe-gateway-client.js";
import { buscarEmpresaFiscalPorEmpresa } from "@/repositories/empresa-fiscal-repositories.js";
import { montarCredenciaisGatewayNfe } from "@/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import { obterCodigoUfIbge } from "@/util/montar-config-sped-nfe.js";
import { validarChaveNfe } from "@/util/validar-chave-nfe.js";
import { validarEstruturaChaveNfe } from "@/util/decodificar-chave-nfe.js";
import { classificarXmlDfe } from "./classificar-xml-dfe.js";
import { processarDocZip } from "./processar-doc-zip.js";
import { tratarErroSefazDfe } from "./tratar-erros-sefaz-dfe.js";
import {
	montarMensagemPreConsultaChaveNfe,
	validarPreConsultaChaveNfe,
} from "./validar-pre-consulta-chave-nfe.js";

export class ErroBuscaXmlNfePorChave extends Error {
	constructor(
		message: string,
		public readonly codigo:
			| "CHAVE_INVALIDA"
			| "CERTIFICADO"
			| "GATEWAY"
			| "SEFAZ"
			| "NAO_ENCONTRADO"
			| "RESUMO_APENAS",
		public readonly cStat?: string,
	) {
		super(message);
		this.name = "ErroBuscaXmlNfePorChave";
	}
}

export type ResultadoBuscaXmlNfePorChave = {
	chavenfe: string;
	tipo: "procNFe" | "resNFe";
	xml: string;
};

export async function buscarXmlNfePorChave({
	idempresa,
	chaveNfe,
	xmlOpcional,
}: {
	idempresa: string;
	chaveNfe: string;
	xmlOpcional?: string;
}): Promise<ResultadoBuscaXmlNfePorChave> {
	const validacao = validarChaveNfe(chaveNfe);

	if (!validacao.ok) {
		throw new ErroBuscaXmlNfePorChave(validacao.mensagem, "CHAVE_INVALIDA");
	}

	const estrutura = validarEstruturaChaveNfe(validacao.chave);
	if (!estrutura.ok) {
		throw new ErroBuscaXmlNfePorChave(estrutura.mensagem, "CHAVE_INVALIDA");
	}

	const credenciais = await montarCredenciaisGatewayNfe(idempresa);

	if (!credenciais.ok) {
		throw new ErroBuscaXmlNfePorChave(
			credenciais.pendencias.map((p) => p.mensagem).join("; "),
			"CERTIFICADO",
		);
	}

	const preConsulta = validarPreConsultaChaveNfe({
		chave: validacao.chave,
		cnpjEmpresa: credenciais.configJson.cnpj,
		ambienteEmpresa: credenciais.nfeConfiguracao.ambiente,
		xmlOpcional,
	});

	if (!preConsulta.ok) {
		throw new ErroBuscaXmlNfePorChave(
			montarMensagemPreConsultaChaveNfe(preConsulta.inconsistencias),
			"CHAVE_INVALIDA",
		);
	}

	const empresaFiscal = await buscarEmpresaFiscalPorEmpresa(idempresa);
	const cUFAutor = empresaFiscal?.uf
		? obterCodigoUfIbge(empresaFiscal.uf)
		: undefined;

	const resposta = await consultarDistribuicaoDfePorChaveGateway({
		configJson: credenciais.configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		chaveNfe: validacao.chave,
		...(cUFAutor !== undefined && { cUFAutor }),
	});

	if (!resposta.sucesso && resposta.erro) {
		throw new ErroBuscaXmlNfePorChave(resposta.erro, "GATEWAY");
	}

	const tratamento = tratarErroSefazDfe(resposta.cStat, resposta.xMotivo);

	if (tratamento.acao === "parar_certificado") {
		throw new ErroBuscaXmlNfePorChave(tratamento.mensagem, "CERTIFICADO", resposta.cStat);
	}

	if (tratamento.acao === "parar_backoff") {
		throw new ErroBuscaXmlNfePorChave(tratamento.mensagem, "SEFAZ", resposta.cStat);
	}

	if (tratamento.acao === "parar_nao_distribuido") {
		throw new ErroBuscaXmlNfePorChave(
			tratamento.mensagem,
			"NAO_ENCONTRADO",
			resposta.cStat,
		);
	}

	if (tratamento.acao === "parar_sucesso") {
		throw new ErroBuscaXmlNfePorChave(
			"NF-e não encontrada na SEFAZ para este destinatário. Verifique a chave e se a nota foi emitida para o CNPJ da empresa.",
			"NAO_ENCONTRADO",
			resposta.cStat,
		);
	}

	if (tratamento.acao === "erro") {
		throw new ErroBuscaXmlNfePorChave(tratamento.mensagem, "SEFAZ", resposta.cStat);
	}

	let resNFe: ResultadoBuscaXmlNfePorChave | null = null;

	for (const doc of resposta.docZip ?? []) {
		try {
			const xml = processarDocZip(doc.content);
			const classificado = classificarXmlDfe(xml);

			if (classificado.metadados.chavenfe !== validacao.chave) {
				continue;
			}

			if (classificado.tipo === "procNFe") {
				return {
					chavenfe: validacao.chave,
					tipo: "procNFe",
					xml: classificado.xml,
				};
			}

			if (classificado.tipo === "resNFe") {
				resNFe = {
					chavenfe: validacao.chave,
					tipo: "resNFe",
					xml: classificado.xml,
				};
			}
		} catch {
			continue;
		}
	}

	if (resNFe) {
		throw new ErroBuscaXmlNfePorChave(
			"A SEFAZ retornou apenas o resumo da NF-e (resNFe). Será necessário manifestar ciência da operação para obter o XML completo.",
			"RESUMO_APENAS",
		);
	}

	throw new ErroBuscaXmlNfePorChave(
		"NF-e não encontrada na resposta da SEFAZ para a chave informada.",
		"NAO_ENCONTRADO",
		resposta.cStat,
	);
}
