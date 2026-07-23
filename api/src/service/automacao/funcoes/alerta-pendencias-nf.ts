import type { HttpResponse } from "@/model/http-model.js";
import type { Automacao } from "@/repositories/automacao-repositories.js";
import { contarNotasFiscaisPendentesCorrecao } from "@/repositories/nota-fiscal-repositories.js";
import type { ResultadoFuncaoAutomacao } from "@/service/automacao/funcoes/envio-fiscal-contabilidade.js";
import { criarNotificacaoAgendadaService } from "@/service/notificacoes/criar-notificacao-agendada.js";
import { httpOk } from "@/util/http-util.js";

export const FUNCAO_ALERTA_PENDENCIAS_NF = "alerta_pendencias_nf";

function dataLocalIso(referencia: Date): string {
	const ano = referencia.getFullYear();
	const mes = String(referencia.getMonth() + 1).padStart(2, "0");
	const dia = String(referencia.getDate()).padStart(2, "0");
	return `${ano}-${mes}-${dia}`;
}

/**
 * Verifica NF-e (55) e NFC-e (65) pendente/rejeitada/denegada e notifica
 * proprietário e usuários financeiros quando houver pendências.
 */
export async function executarAlertaPendenciasNf(
	automacao: Automacao,
	referencia: Date = new Date(),
): Promise<HttpResponse<ResultadoFuncaoAutomacao>> {
	const params = automacao.parametros ?? {};
	const incluirNfe = params.incluirNfe !== false;
	const incluirNfce = params.incluirNfce !== false;

	if (!incluirNfe && !incluirNfce) {
		return httpOk({
			status: "falha",
			mensagem: "Selecione ao menos NF-e ou NFC-e para monitorar",
		});
	}

	const contagem = await contarNotasFiscaisPendentesCorrecao({
		idempresa: automacao.idempresa,
		incluirNfe,
		incluirNfce,
	});

	if (contagem.total === 0) {
		return httpOk({
			status: "sucesso",
			mensagem: "Nenhuma NF-e/NFC-e pendente, rejeitada ou denegada",
			detalhes: {
				nfe: contagem.nfe,
				nfce: contagem.nfce,
				total: contagem.total,
			},
		});
	}

	const partes: string[] = [];
	if (incluirNfe && contagem.nfe > 0) {
		partes.push(`${contagem.nfe} NF-e`);
	}
	if (incluirNfce && contagem.nfce > 0) {
		partes.push(`${contagem.nfce} NFC-e`);
	}

	const titulo = `Pendências fiscais: ${partes.join(" e ")} (pendente/rejeitada/denegada)`;
	const dataRef = dataLocalIso(referencia);

	await criarNotificacaoAgendadaService({
		tipo: "alerta_pendencias_nf",
		idempresa: automacao.idempresa,
		idrecurso: `${automacao.id}:${dataRef}`,
		titulo,
		detalhes: {
			idautomacao: automacao.id,
			nfe: contagem.nfe,
			nfce: contagem.nfce,
			total: contagem.total,
			incluirNfe,
			incluirNfce,
			linkNfe: "/nota-fiscal-venda",
			linkNfce: "/nfce-pendentes",
		},
	});

	return httpOk({
		status: "sucesso",
		mensagem: titulo,
		detalhes: {
			nfe: contagem.nfe,
			nfce: contagem.nfce,
			total: contagem.total,
			alertaEnviado: true,
		},
	});
}
