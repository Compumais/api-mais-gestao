import { v4 as uuidv4 } from "uuid";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import type { RelatorioAuditoriaFiscal } from "@/model/regra-fiscal-model.js";
import {
	avaliarEmissaoFiscal,
	mensagemBloqueioFiscal,
} from "@/service/fiscal/avaliar-emissao-fiscal.js";
import type { RegraFiscalResolvida } from "@/service/fiscal/resolver-regras-fiscais.js";
import {
	condicoesRegraFiscal,
	criarAuditoriaFiscalNfe,
	fontesRegraFiscal,
	listarRegrasFiscaisValidas,
	resultadoRegraFiscal,
} from "@/repositories/regra-fiscal-repositories.js";

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
};

function mapearRegraBanco(regra: Awaited<ReturnType<typeof listarRegrasFiscaisValidas>>[number]): RegraFiscalResolvida {
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

export async function avaliarEmissaoFiscalService(
	params: AvaliarEmissaoFiscalServiceParams,
): Promise<RelatorioAuditoriaFiscal> {
	const regrasBanco = await listarRegrasFiscaisValidas();
	const relatorio = avaliarEmissaoFiscal({
		...params,
		regras: regrasBanco.map(mapearRegraBanco),
	});

	await criarAuditoriaFiscalNfe({
		id: uuidv4(),
		idnotafiscal: params.idnotafiscal,
		idempresa: params.idempresa,
		classificacaofinal: relatorio.classificacao_final,
		nivelconfianca: relatorio.nivel_confianca,
		permitirtransmissao: relatorio.permitir_transmissao,
		relatorio,
	});

	return relatorio;
}

export { mensagemBloqueioFiscal };
