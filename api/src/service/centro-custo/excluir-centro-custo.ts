import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCentroCustoPorId,
	excluirCentroCusto,
} from "@/repositories/centro-custo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirCentroCustoParametros = {
	centroCustoId: string;
	idusuario: string;
};

export async function excluirCentroCustoService({
	centroCustoId,
	idusuario,
}: ExcluirCentroCustoParametros): Promise<HttpResponse<null>> {
	const registro = await buscarCentroCustoPorId(centroCustoId);

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
		acao: "excluir_centro_custo",
		idusuario,
		recurso: "centro_custo",
		idrecurso: centroCustoId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
			inativo: registro.inativo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirCentroCusto(centroCustoId);

	return httpSemConteudo();
}
