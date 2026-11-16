import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarGrupoContratoPorId,
	excluirGrupoContrato,
} from "@/repositories/grupo-contrato-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

export async function excluirGrupoContratoService({
	grupoContratoId,
	idusuario,
}: {
	grupoContratoId: string;
	idusuario: string;
}): Promise<HttpResponse<null>> {
	const registro = await buscarGrupoContratoPorId(grupoContratoId);
	if (!registro) return httpNaoEncontrado();

	const pertence = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);
	if (!pertence) return httpProibido();

	const auditoria = await criarAuditoriaService({
		id: uuidv4(),
		acao: "excluir_grupo_contrato",
		idusuario,
		recurso: "grupo_contrato",
		idrecurso: grupoContratoId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			codigo: registro.codigo,
			descricao: registro.descricao,
		},
	});

	if (!auditoria?.success) return httpErroInterno();

	await excluirGrupoContrato(grupoContratoId);
	return httpSemConteudo();
}
