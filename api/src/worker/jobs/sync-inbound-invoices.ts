import {
	liberarLockEmpresa,
	listarEmpresasComSyncInboundHabilitado,
	tentarAdquirirLockEmpresa,
} from "@/repositories/nfe-inbound-repositories.js";
import {
	obterIdUsuarioAutoImport,
	sincronizarEmpresaNfeInboundService,
} from "@/service/nfe-inbound/nfe-inbound-sync.service.js";
import { hashEmpresaParaLock } from "@/util/lock-empresa.js";
import type { JobContext, JobResult } from "../types.js";

export async function executarSyncInboundInvoices(
	_contexto: JobContext,
): Promise<JobResult> {
	const empresas = await listarEmpresasComSyncInboundHabilitado();

	let processadas = 0;
	let ignoradas = 0;
	const detalhesEmpresas: Record<string, unknown>[] = [];

	for (const idempresa of empresas) {
		const lockId = hashEmpresaParaLock(idempresa);
		const adquiriu = await tentarAdquirirLockEmpresa(lockId);

		if (!adquiriu) {
			ignoradas += 1;
			continue;
		}

		try {
			const idusuarioAutoImport = await obterIdUsuarioAutoImport(idempresa);
			const resultado = await sincronizarEmpresaNfeInboundService({
				idempresa,
				...(idusuarioAutoImport && { idusuarioAutoImport }),
			});

			detalhesEmpresas.push(resultado);

			if (resultado.quantidadeXml > 0 || resultado.falhas.length === 0) {
				processadas += 1;
			} else {
				ignoradas += 1;
			}
		} catch (erro) {
			console.error(`[sync-inbound-nfe] Erro empresa ${idempresa}:`, erro);
			ignoradas += 1;
			detalhesEmpresas.push({
				idempresa,
				erro: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		} finally {
			await liberarLockEmpresa(lockId);
		}
	}

	return {
		processadas,
		notificacoes: 0,
		ignoradas,
		detalhes: {
			empresas: detalhesEmpresas,
			totalEmpresas: empresas.length,
		},
	};
}
