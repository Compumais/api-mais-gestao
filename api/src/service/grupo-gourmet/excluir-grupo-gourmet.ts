import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarGrupoGourmetPorId,
	contarProdutosPorGrupoGourmet,
	excluirGrupoGourmet,
} from "@/repositories/grupo-gourmet-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirGrupoGourmetParametros = {
	id: string;
	idusuario: string;
};

export async function excluirGrupoGourmetService({
	id,
	idusuario,
}: ExcluirGrupoGourmetParametros): Promise<HttpResponse<null>> {
	const registro = await buscarGrupoGourmetPorId(id);

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

	const vinculados = await contarProdutosPorGrupoGourmet(id);
	if (vinculados > 0) {
		return httpBadRequest(
			"Não é possível excluir: existem produtos vinculados a este grupo gourmet",
		);
	}

	const auditoria = await criarAuditoriaService({
		id: uuidv4(),
		acao: "excluir_grupo_gourmet",
		idusuario,
		recurso: "grupogourmet",
		idrecurso: id,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirGrupoGourmet(id);

	return httpSemConteudo();
}
