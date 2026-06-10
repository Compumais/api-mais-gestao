import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovoObjeto, Objeto } from "@/model/objeto-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarObjeto,
	buscarObjetoPorId,
} from "@/repositories/objeto-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarObjetoParametros = {
	objetoId: string;
	idusuario: string;
	dados: Partial<NovoObjeto>;
};

export async function atualizarObjetoService({
	objetoId,
	idusuario,
	dados,
}: AtualizarObjetoParametros): Promise<HttpResponse<Objeto | null>> {
	const registroExistente = await buscarObjetoPorId(objetoId);

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

	const registroAtualizado = await atualizarObjeto(objetoId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_objeto",
		idusuario,
		recurso: "objeto",
		idrecurso: objetoId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<Objeto>(registroAtualizado);
}
