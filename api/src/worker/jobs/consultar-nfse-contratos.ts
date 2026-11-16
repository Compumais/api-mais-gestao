import { listarCobrancasPorStatus } from "@/repositories/contrato-cobranca-repositories.js";
import { buscarContratoFaturamentoLotePorId } from "@/repositories/contrato-faturamento-lote-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { processarCobrancaContratoService } from "@/service/contrato/processar-cobranca-contrato.js";
import { consultarNfseService } from "@/service/nfse-emissao/consultar-nfse.js";
import { STATUS_COBRANCA_FATURAMENTO } from "@/util/contrato-constants.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import type { JobContext, JobResult } from "../types.js";

export async function executarConsultarNfseContratos(
	_contexto: JobContext,
): Promise<JobResult> {
	const pendentes = await listarCobrancasPorStatus(
		STATUS_COBRANCA_FATURAMENTO.AGUARDANDO_AUTORIZACAO_NFSE,
	);

	let processadas = 0;
	let ignoradas = 0;

	for (const cobranca of pendentes) {
		if (!cobranca.idnotafiscal) {
			ignoradas++;
			continue;
		}

		let idusuario: string | null = null;
		if (cobranca.idlote) {
			const lote = await buscarContratoFaturamentoLotePorId(cobranca.idlote);
			idusuario = lote?.idusuario ?? null;
		}

		if (!idusuario) {
			ignoradas++;
			continue;
		}

		try {
			await consultarNfseService({
				idusuario,
				idnotafiscal: cobranca.idnotafiscal,
			});

			const nota = await buscarNotaFiscalPorId(cobranca.idnotafiscal);
			if (nota?.status === NFE_STATUS.AUTORIZADA) {
				await processarCobrancaContratoService({
					idcobranca: cobranca.id,
					idusuario,
				});
				processadas++;
			} else {
				ignoradas++;
			}
		} catch {
			ignoradas++;
		}
	}

	return {
		processadas,
		notificacoes: 0,
		ignoradas,
		detalhes: { pendentes: pendentes.length },
	};
}
