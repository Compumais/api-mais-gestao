import { v4 as uuidv4 } from "uuid";
import type { CEST, NovoCEST } from "@/model/cest-mode.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarCest,
	buscarCestPorId,
} from "@/repositories/cest-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarCestParametros = {
	cestId: string;
	idusuario: string;
	dados: Partial<NovoCEST>;
};

export async function atualizarCestService({
	cestId,
	idusuario,
	dados,
}: AtualizarCestParametros): Promise<HttpResponse<CEST | null>> {
	const registroExistente = await buscarCestPorId(cestId);

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

	const registroAtualizado = await atualizarCest(cestId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_cest",
		idusuario,
		recurso: "cest",
		idrecurso: cestId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<CEST>(registroAtualizado);
}
