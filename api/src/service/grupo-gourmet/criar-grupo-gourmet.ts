import { v4 as uuidv4 } from "uuid";
import type { GrupoGourmet, NovoGrupoGourmet } from "@/model/grupo-gourmet-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarGrupoGourmet,
	excluirGrupoGourmet,
} from "@/repositories/grupo-gourmet-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarGrupoGourmetParametros = {
	dados: NovoGrupoGourmet;
	idusuario: string;
};

export async function criarGrupoGourmetService({
	dados,
	idusuario,
}: CriarGrupoGourmetParametros): Promise<HttpResponse<GrupoGourmet | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dados.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarGrupoGourmet(dados);

	if (!registro) {
		return httpErro();
	}

	const auditoria = await criarAuditoriaService({
		id: uuidv4(),
		acao: "criar_grupo_gourmet",
		idusuario,
		recurso: "grupogourmet",
		idrecurso: registro.id,
		idempresa: dados.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirGrupoGourmet(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<GrupoGourmet>(registro);
}
