import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarLocalRetiradaPorId,
	excluirLocalRetirada,
} from "@/repositories/local-retirada-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirLocalRetiradaParametros = {
	localRetiradaId: string;
	idusuario: string;
};

export async function excluirLocalRetiradaService({
	localRetiradaId,
	idusuario,
}: ExcluirLocalRetiradaParametros): Promise<HttpResponse<null>> {
	const registro = await buscarLocalRetiradaPorId(localRetiradaId);

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

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "excluir_local_retirada",
		idusuario,
		recurso: "local_retirada",
		idrecurso: localRetiradaId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirLocalRetirada(localRetiradaId);

	return httpSemConteudo();
}
