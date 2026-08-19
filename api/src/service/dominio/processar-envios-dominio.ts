import {
	consultarLoteDominio,
	enviarXmlLoteDominio,
} from "@/lib/dominio-client.js";
import type { DominioEnvio, DominioEnvioTipo } from "@/model/dominio-model.js";
import {
	atualizarDominioEnvio,
	listarDominioEnviosAguardandoProcessamento,
	listarDominioEnviosPendentes,
	reivindicarDominioEnvio,
} from "@/repositories/dominio-envio-repositories.js";
import { buscarDominioIntegracaoPorEmpresa } from "@/repositories/dominio-integracao-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { descriptografarChaveDominio } from "@/util/mascarar-chave-dominio.js";
import {
	obterXmlAutorizadoNotaFiscal,
	obterXmlCancelamentoNotaFiscal,
} from "@/util/obter-xml-nota-fiscal.js";

const MAX_TENTATIVAS = 12;

function calcularProximaTentativa(tentativas: number, agora: Date): string {
	const minutos = [2, 5, 15, 30, 60, 120][Math.min(tentativas - 1, 5)] ?? 120;
	return new Date(agora.getTime() + minutos * 60 * 1000).toISOString();
}

async function obterXmlPorTipo(
	idnotafiscal: string,
	tipo: DominioEnvioTipo,
): Promise<string | null> {
	if (tipo === "cancelamento") {
		return obterXmlCancelamentoNotaFiscal(idnotafiscal);
	}
	return obterXmlAutorizadoNotaFiscal(idnotafiscal);
}

function nomeArquivoXml(
	chave: string | null,
	tipo: DominioEnvioTipo,
	id: string,
) {
	const base = chave?.replace(/\D/g, "") || id;
	return tipo === "cancelamento"
		? `${base}-cancelado.xml`
		: `${base}-autorizado.xml`;
}

async function marcarErro(envio: DominioEnvio, mensagem: string, agora: Date) {
	const tentativas = envio.tentativas + 1;
	await atualizarDominioEnvio(envio.id, {
		status: "erro",
		tentativas,
		mensagemretorno: mensagem,
		proximatentativa:
			tentativas >= MAX_TENTATIVAS
				? null
				: calcularProximaTentativa(tentativas, agora),
		atualizadoem: agora.toISOString(),
	});
}

async function processarEnvioPendente(
	envio: DominioEnvio,
	agora: Date,
): Promise<"enviado" | "erro" | "ignorado"> {
	const reivindicado = await reivindicarDominioEnvio(
		envio.id,
		["pendente", "erro"],
		agora.toISOString(),
	);
	if (!reivindicado) return "ignorado";

	const integracao = await buscarDominioIntegracaoPorEmpresa(envio.idempresa);
	if (!integracao?.habilitado) {
		await marcarErro(reivindicado, "Integração Domínio desabilitada", agora);
		return "erro";
	}

	const integrationKey = descriptografarChaveDominio(integracao.integrationkey);
	if (!integrationKey) {
		await marcarErro(
			reivindicado,
			"Chave de integração Domínio inválida",
			agora,
		);
		return "erro";
	}

	const nota = await buscarNotaFiscalPorId(envio.idnotafiscal);
	const xml = await obterXmlPorTipo(
		envio.idnotafiscal,
		envio.tipo as DominioEnvioTipo,
	);
	if (!xml?.trim()) {
		await marcarErro(
			reivindicado,
			envio.tipo === "cancelamento"
				? "XML de cancelamento não encontrado"
				: "XML autorizado não encontrado",
			agora,
		);
		return "erro";
	}

	try {
		const resultado = await enviarXmlLoteDominio({
			integrationKey,
			nomeArquivo: nomeArquivoXml(
				nota?.chavenfe ?? null,
				envio.tipo as DominioEnvioTipo,
				envio.idnotafiscal,
			),
			xml,
			boxeFile: integracao.boxefile,
		});

		await atualizarDominioEnvio(reivindicado.id, {
			status: resultado.armazenado ? "armazenado" : "aguardando_processamento",
			idloteapi: resultado.idLote,
			tentativas: reivindicado.tentativas + 1,
			mensagemretorno: resultado.mensagem || null,
			proximatentativa: null,
			atualizadoem: agora.toISOString(),
		});

		return "enviado";
	} catch (erro) {
		await marcarErro(
			reivindicado,
			erro instanceof Error ? erro.message : "Falha no envio ao Domínio",
			agora,
		);
		return "erro";
	}
}

async function consultarEnvioAguardando(
	envio: DominioEnvio,
	agora: Date,
): Promise<"armazenado" | "aguardando" | "erro" | "ignorado"> {
	if (!envio.idloteapi) {
		await marcarErro(envio, "Lote Domínio sem identificador", agora);
		return "erro";
	}

	const integracao = await buscarDominioIntegracaoPorEmpresa(envio.idempresa);
	if (!integracao?.habilitado) {
		return "ignorado";
	}

	const integrationKey = descriptografarChaveDominio(integracao.integrationkey);
	if (!integrationKey) {
		await marcarErro(envio, "Chave de integração Domínio inválida", agora);
		return "erro";
	}

	try {
		const resultado = await consultarLoteDominio({
			integrationKey,
			idLote: envio.idloteapi,
		});

		if (resultado.armazenado) {
			await atualizarDominioEnvio(envio.id, {
				status: "armazenado",
				mensagemretorno: resultado.mensagem || "Arquivo armazenado na API",
				atualizadoem: agora.toISOString(),
			});
			return "armazenado";
		}

		await atualizarDominioEnvio(envio.id, {
			mensagemretorno: resultado.mensagem || envio.mensagemretorno,
			atualizadoem: agora.toISOString(),
		});
		return "aguardando";
	} catch (erro) {
		await marcarErro(
			envio,
			erro instanceof Error ? erro.message : "Falha ao consultar lote Domínio",
			agora,
		);
		return "erro";
	}
}

export type ResultadoProcessarEnviosDominio = {
	enviados: number;
	consultados: number;
	armazenados: number;
	erros: number;
	ignorados: number;
};

export async function processarEnviosDominioService(
	referencia: Date = new Date(),
): Promise<ResultadoProcessarEnviosDominio> {
	const resultado: ResultadoProcessarEnviosDominio = {
		enviados: 0,
		consultados: 0,
		armazenados: 0,
		erros: 0,
		ignorados: 0,
	};

	const pendentes = await listarDominioEnviosPendentes(
		referencia.toISOString(),
	);
	for (const envio of pendentes) {
		const status = await processarEnvioPendente(envio, referencia);
		if (status === "enviado") resultado.enviados += 1;
		else if (status === "erro") resultado.erros += 1;
		else resultado.ignorados += 1;
	}

	const aguardando = await listarDominioEnviosAguardandoProcessamento();
	for (const envio of aguardando) {
		const status = await consultarEnvioAguardando(envio, referencia);
		resultado.consultados += 1;
		if (status === "armazenado") resultado.armazenados += 1;
		else if (status === "erro") resultado.erros += 1;
		else if (status === "ignorado") resultado.ignorados += 1;
	}

	return resultado;
}
