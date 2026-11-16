import { v4 as uuidv4 } from "uuid";
import type {
	GrupoContrato,
	NovoGrupoContrato,
} from "@/model/grupo-contrato-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarGrupoContrato,
	excluirGrupoContrato,
} from "@/repositories/grupo-contrato-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarGrupoContratoParametros = {
	dados: NovoGrupoContrato;
	idusuario: string;
};

export async function criarGrupoContratoService({
	dados,
	idusuario,
}: CriarGrupoContratoParametros): Promise<HttpResponse<GrupoContrato | null>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dados.idempresa,
	);
	if (!pertence) return httpProibido();

	const registro = await criarGrupoContrato(dados);
	if (!registro) return httpErro();

	const auditoria = await criarAuditoriaService({
		id: uuidv4(),
		acao: "criar_grupo_contrato",
		idusuario,
		recurso: "grupo_contrato",
		idrecurso: registro.id,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			codigo: registro.codigo,
			descricao: registro.descricao,
		},
	});

	if (!auditoria?.success) {
		await excluirGrupoContrato(registro.id);
		return httpErroInterno();
	}

	return httpCriacao(registro);
}
