import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalPorId,
} from "@/repositories/nota-fiscal-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { estornarIntegracaoNotaFiscalCompraService } from "@/service/nota-fiscal/estornar-integracao-nota-fiscal-compra.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import {
	STATUS_NF_COMPRA_CANCELADA,
	STATUS_NF_CONFIRMADA,
	STATUS_RASCUNHO_IMPORTACAO,
} from "@/util/nota-fiscal-constants.js";

type CancelarNotaFiscalCompraParametros = {
	notaFiscalId: string;
	idusuario: string;
	idempresa: string;
	motivo?: string | undefined;
};

export type CancelarNotaFiscalCompraResposta = {
	notaFiscal: NotaFiscal;
	titulosCancelados: number;
	movimentosEstornados: number;
	avisos: string[];
};

export async function cancelarNotaFiscalCompraService({
	notaFiscalId,
	idusuario,
	idempresa,
	motivo,
}: CancelarNotaFiscalCompraParametros): Promise<
	HttpResponse<CancelarNotaFiscalCompraResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const nota = await buscarNotaFiscalPorId(notaFiscalId);

	if (!nota || nota.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	if (nota.tipoorigem !== 0 && nota.tipoorigem !== null) {
		return httpBadRequest("Esta rota cancela apenas notas fiscais de compra");
	}

	if (nota.status === STATUS_RASCUNHO_IMPORTACAO) {
		return httpBadRequest(
			"Rascunho de importação deve ser excluído, não cancelado",
		);
	}

	if (nota.status === STATUS_NF_COMPRA_CANCELADA) {
		return httpBadRequest("Nota fiscal de compra já está cancelada");
	}

	// Aceita confirmada (1) ou manual sem status explícito
	if (
		nota.status !== null &&
		nota.status !== undefined &&
		nota.status !== STATUS_NF_CONFIRMADA
	) {
		return httpBadRequest(
			"Somente notas de compra confirmadas podem ser canceladas",
		);
	}

	const estorno = await estornarIntegracaoNotaFiscalCompraService({
		idusuario,
		idnotafiscal: notaFiscalId,
		bloquearBaixaParcial: true,
	});

	if (!estorno.success) {
		return {
			success: false,
			status: estorno.status,
			error: estorno.error,
		} as HttpResponse<CancelarNotaFiscalCompraResposta>;
	}

	const agora = new Date().toISOString();
	const notaAtualizada = await atualizarNotaFiscal(notaFiscalId, {
		status: STATUS_NF_COMPRA_CANCELADA,
		cancelamento: agora,
		justificativacancelamentonfe: motivo?.trim()
			? motivo.trim().slice(0, 255)
			: "Cancelamento interno da nota de compra",
		idusuarioalteracao: idusuario,
		dataalteracao: agora,
		currenttimemillis: Date.now(),
	});

	if (!notaAtualizada) {
		return httpNaoEncontrado();
	}

	try {
		await criarAuditoriaService({
			id: uuidv4(),
			acao: "cancelar_nota_fiscal_compra",
			idusuario,
			recurso: "nota_fiscal",
			idrecurso: notaFiscalId,
			idempresa,
			criadoem: agora,
			metadados: {
				motivo: motivo ?? null,
				titulosCancelados: estorno.body?.titulosCancelados ?? 0,
				movimentosEstornados: estorno.body?.movimentosEstornados ?? 0,
			},
		});
	} catch (erro) {
		console.error("Erro ao registrar auditoria de cancelamento NF compra:", erro);
	}

	return httpOk({
		notaFiscal: notaAtualizada,
		titulosCancelados: estorno.body?.titulosCancelados ?? 0,
		movimentosEstornados: estorno.body?.movimentosEstornados ?? 0,
		avisos: estorno.body?.avisos ?? [],
	});
}
