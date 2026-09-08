import { v4 as uuidv4 } from "uuid";
import type { RelatorioAuditoriaFiscal } from "@/model/regra-fiscal-model.js";
import { buscarCfopPorCodigo } from "@/repositories/cfop-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import {
	condicoesRegraFiscal,
	criarAuditoriaFiscalNfe,
	fontesRegraFiscal,
	listarRegrasFiscaisValidas,
	resultadoRegraFiscal,
} from "@/repositories/regra-fiscal-repositories.js";
import {
	avaliarEmissaoFiscal,
	mensagemBloqueioFiscal,
} from "@/service/fiscal/avaliar-emissao-fiscal.js";
import { garantirRegrasFiscaisOperacionaisSeed } from "@/service/fiscal/garantir-regras-fiscais-seed.js";
import { normalizarCfop } from "@/service/fiscal/indicadores-st-nfe.js";
import type { RegraFiscalResolvida } from "@/service/fiscal/resolver-regras-fiscais.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";

export type AvaliarEmissaoFiscalServiceParams = {
	operacaoId: string;
	idempresa: string;
	idnotafiscal?: string;
	dataOperacao: string;
	crt: number;
	ufEmitente?: string | null;
	ufDestinatario?: string | null;
	idDest?: number | null;
	finNFe?: number | null;
	consumidorFinal?: boolean;
	contribuinteIcms?: boolean;
	indIEDest?: number | null;
	itens: ItemPayloadNfe[];
	totais?: {
		frete?: number;
		seguro?: number;
		desconto?: number;
		outrasDespesas?: number;
	};
	totaisInformados?: {
		vProd?: number;
		vNF?: number;
		vDesc?: number;
		vFrete?: number;
		vSeg?: number;
		vOutro?: number;
	};
};

function mapearRegraBanco(
	regra: Awaited<ReturnType<typeof listarRegrasFiscaisValidas>>[number],
): RegraFiscalResolvida {
	return {
		id: regra.id,
		ruleId: regra.ruleid,
		prioridade: regra.prioridade,
		vigenciaInicio: regra.vigenciainicio,
		vigenciaFim: regra.vigenciafim,
		status: regra.status,
		condicoes: condicoesRegraFiscal(regra.condicoes),
		resultado: resultadoRegraFiscal(regra.resultado),
		fontes: fontesRegraFiscal(regra.fontes),
	};
}

async function carregarCfopsInterestadualMesmaUf(
	idempresa: string,
	itens: ItemPayloadNfe[],
): Promise<Set<string>> {
	const codigos = [
		...new Set(
			itens
				.map((item) => normalizarCfop(item.cfop))
				.filter((codigo) => codigo.length >= 4 && codigo.startsWith("6")),
		),
	];

	const liberados = new Set<string>();

	await Promise.all(
		codigos.map(async (codigo) => {
			const cfop = await buscarCfopPorCodigo(idempresa, codigo);
			if (cfop?.interestadualdestmesmauf === 1) {
				liberados.add(codigo);
			}
		}),
	);

	return liberados;
}

export type ResultadoAvaliacaoEmissaoFiscal = {
	relatorio: RelatorioAuditoriaFiscal;
	idAuditoria: string;
};

export async function avaliarEmissaoFiscalService(
	params: AvaliarEmissaoFiscalServiceParams,
): Promise<ResultadoAvaliacaoEmissaoFiscal> {
	await garantirRegrasFiscaisOperacionaisSeed();
	const regrasBanco = await listarRegrasFiscaisValidas();
	const cfopsInterestadualMesmaUf = await carregarCfopsInterestadualMesmaUf(
		params.idempresa,
		params.itens,
	);

	const relatorio = avaliarEmissaoFiscal({
		...params,
		cfopsInterestadualMesmaUf,
		regras: regrasBanco.map(mapearRegraBanco),
	});

	const idAuditoria = uuidv4();
	let idnotafiscalAuditoria: string | null = null;

	if (params.idnotafiscal) {
		const notaExistente = await buscarNotaFiscalPorId(params.idnotafiscal);
		if (notaExistente) {
			idnotafiscalAuditoria = params.idnotafiscal;
		}
	}

	await criarAuditoriaFiscalNfe({
		id: idAuditoria,
		idnotafiscal: idnotafiscalAuditoria,
		idempresa: params.idempresa,
		classificacaofinal: relatorio.classificacao_final,
		nivelconfianca: relatorio.nivel_confianca,
		permitirtransmissao: relatorio.permitir_transmissao,
		relatorio,
	});

	return { relatorio, idAuditoria };
}

export { mensagemBloqueioFiscal };
