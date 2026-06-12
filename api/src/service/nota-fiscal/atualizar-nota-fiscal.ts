import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NotaFiscal, NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalPorId,
} from "@/repositories/nota-fiscal-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type AtualizarNotaFiscalParametros = {
	notaFiscalId: string;
	idusuario: string;
	dados: Partial<NovaNotaFiscal>;
};

export async function atualizarNotaFiscalService({
	notaFiscalId,
	idusuario,
	dados,
}: AtualizarNotaFiscalParametros): Promise<HttpResponse<NotaFiscal | null>> {
	const registro = await buscarNotaFiscalPorId(notaFiscalId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const dadosAtualizacao: Partial<NovaNotaFiscal> = {
		...dados,
		idusuarioalteracao: idusuario,
		dataalteracao: new Date().toISOString(),
		currenttimemillis: Date.now(),
	};

	const atualizado = await atualizarNotaFiscal(notaFiscalId, dadosAtualizacao);

	if (!atualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_nota_fiscal",
		idusuario,
		recurso: "nota_fiscal",
		idrecurso: notaFiscalId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			numero: atualizado.numero,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	return httpOk<NotaFiscal>(atualizado);
}
