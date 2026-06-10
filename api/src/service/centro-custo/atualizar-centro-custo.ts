import { v4 as uuidv4 } from "uuid";
import type {
	CentroCusto,
	NovoCentroCusto,
} from "@/model/centro-custo-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarCentroCusto,
	buscarCentroCustoPorId,
} from "@/repositories/centro-custo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarCentroCustoParametros = {
	centroCustoId: string;
	idusuario: string;
	dados: Partial<NovoCentroCusto>;
};

export async function atualizarCentroCustoService({
	centroCustoId,
	idusuario,
	dados,
}: AtualizarCentroCustoParametros): Promise<HttpResponse<CentroCusto | null>> {
	const registroExistente = await buscarCentroCustoPorId(centroCustoId);

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

	const registroAtualizado = await atualizarCentroCusto(centroCustoId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_centro_custo",
		idusuario,
		recurso: "centro_custo",
		idrecurso: centroCustoId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<CentroCusto>(registroAtualizado);
}
