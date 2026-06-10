import { v4 as uuidv4 } from "uuid";
import type { DAV, NovoDAV } from "@/model/dav-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarDav,
	buscarDavPorId,
} from "@/repositories/dav-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarDavParametros = {
	davId: string;
	idusuario: string;
	dados: Partial<NovoDAV>;
};

export async function atualizarDavService({
	davId,
	idusuario,
	dados,
}: AtualizarDavParametros): Promise<HttpResponse<DAV | null>> {
	const registroExistente = await buscarDavPorId(davId);

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

	const registroAtualizado = await atualizarDav(davId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_dav",
		idusuario,
		recurso: "dav",
		idrecurso: davId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<DAV>(registroAtualizado);
}
