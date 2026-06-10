import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCestPorId,
	excluirCest,
} from "@/repositories/cest-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirCestParametros = {
	cestId: string;
	idusuario: string;
};

export async function excluirCestService({
	cestId,
	idusuario,
}: ExcluirCestParametros): Promise<HttpResponse<null>> {
	const registro = await buscarCestPorId(cestId);

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
		acao: "excluir_cest",
		idusuario,
		recurso: "cest",
		idrecurso: cestId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			inativo: registro.inativo,
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirCest(cestId);

	return httpSemConteudo();
}
