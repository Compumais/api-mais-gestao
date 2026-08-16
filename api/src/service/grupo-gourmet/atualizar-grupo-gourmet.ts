import { v4 as uuidv4 } from "uuid";
import type { GrupoGourmet, NovoGrupoGourmet } from "@/model/grupo-gourmet-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarGrupoGourmet,
	buscarGrupoGourmetPorId,
} from "@/repositories/grupo-gourmet-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarGrupoGourmetParametros = {
	id: string;
	idusuario: string;
	dados: Partial<NovoGrupoGourmet>;
};

export async function atualizarGrupoGourmetService({
	id,
	idusuario,
	dados,
}: AtualizarGrupoGourmetParametros): Promise<HttpResponse<GrupoGourmet | null>> {
	const existente = await buscarGrupoGourmetPorId(id);

	if (!existente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		existente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const atualizado = await atualizarGrupoGourmet(id, dados);

	if (!atualizado) {
		return httpNaoEncontrado();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "atualizar_grupo_gourmet",
		idusuario,
		recurso: "grupogourmet",
		idrecurso: id,
		idempresa: existente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<GrupoGourmet>(atualizado);
}
