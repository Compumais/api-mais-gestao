import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	MotivoRebaixa,
	NovoMotivoRebaixa,
} from "@/model/motivo-rebaixa-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarMotivoRebaixa,
	buscarMotivoRebaixaPorId,
} from "@/repositories/motivo-rebaixa-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarMotivoRebaixaParametros = {
	motivoRebaixaId: string;
	idusuario: string;
	dados: Partial<NovoMotivoRebaixa>;
};

export async function atualizarMotivoRebaixaService({
	motivoRebaixaId,
	idusuario,
	dados,
}: AtualizarMotivoRebaixaParametros): Promise<
	HttpResponse<MotivoRebaixa | null>
> {
	const registroExistente = await buscarMotivoRebaixaPorId(motivoRebaixaId);

	if (!registroExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registroExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registroAtualizado = await atualizarMotivoRebaixa(
		motivoRebaixaId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_motivo_rebaixa",
		idusuario,
		recurso: "motivo_rebaixa",
		idrecurso: motivoRebaixaId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<MotivoRebaixa>(registroAtualizado);
}
