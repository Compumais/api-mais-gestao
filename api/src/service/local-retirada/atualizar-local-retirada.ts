import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	LocalRetirada,
	NovoLocalRetirada,
} from "@/model/local-retirada-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarLocalRetirada,
	buscarLocalRetiradaPorId,
} from "@/repositories/local-retirada-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarLocalRetiradaParametros = {
	localRetiradaId: string;
	idusuario: string;
	dados: Partial<NovoLocalRetirada>;
};

export async function atualizarLocalRetiradaService({
	localRetiradaId,
	idusuario,
	dados,
}: AtualizarLocalRetiradaParametros): Promise<
	HttpResponse<LocalRetirada | null>
> {
	const registroExistente = await buscarLocalRetiradaPorId(localRetiradaId);

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

	const registroAtualizado = await atualizarLocalRetirada(
		localRetiradaId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_local_retirada",
		idusuario,
		recurso: "local_retirada",
		idrecurso: localRetiradaId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<LocalRetirada>(registroAtualizado);
}
