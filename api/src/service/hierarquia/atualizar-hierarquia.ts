import { v4 as uuidv4 } from "uuid";
import type { Hierarquia, NovoHierarquia } from "@/model/hierarquia-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarHierarquia,
	buscarHierarquiaPorId,
} from "@/repositories/hierarquia-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarHierarquiaParametros = {
	hierarquiaId: string;
	idusuario: string;
	dados: Partial<NovoHierarquia>;
};

export async function atualizarHierarquiaService({
	hierarquiaId,
	idusuario,
	dados,
}: AtualizarHierarquiaParametros): Promise<HttpResponse<Hierarquia | null>> {
	const registroExistente = await buscarHierarquiaPorId(hierarquiaId);

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

	const registroAtualizado = await atualizarHierarquia(hierarquiaId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_hierarquia",
		idusuario,
		recurso: "hierarquia",
		idrecurso: hierarquiaId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<Hierarquia>(registroAtualizado);
}
