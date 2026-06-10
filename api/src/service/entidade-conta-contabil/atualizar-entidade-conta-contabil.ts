import { v4 as uuidv4 } from "uuid";
import type {
	EntidadeContaContabil,
	NovoEntidadeContaContabil,
} from "@/model/entidade-conta-contabil-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarEntidadeContaContabil,
	buscarEntidadeContaContabilPorId,
} from "@/repositories/entidade-conta-contabil-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarEntidadeContaContabilParametros = {
	entidadeContaContabilId: string;
	idusuario: string;
	dados: Partial<NovoEntidadeContaContabil>;
};

export async function atualizarEntidadeContaContabilService({
	entidadeContaContabilId,
	idusuario,
	dados,
}: AtualizarEntidadeContaContabilParametros): Promise<
	HttpResponse<EntidadeContaContabil | null>
> {
	const registroExistente = await buscarEntidadeContaContabilPorId(
		entidadeContaContabilId,
	);

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

	const registroAtualizado = await atualizarEntidadeContaContabil(
		entidadeContaContabilId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_entidade_conta_contabil",
		idusuario,
		recurso: "entidade_conta_contabil",
		idrecurso: entidadeContaContabilId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<EntidadeContaContabil>(registroAtualizado);
}
