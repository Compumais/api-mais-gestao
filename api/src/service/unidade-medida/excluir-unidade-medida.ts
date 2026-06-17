import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarUnidadeMedidaPorId,
	excluirUnidadeMedida,
} from "@/repositories/unidade-medida-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { isUnidadeMedidaGlobal } from "@/service/unidade-medida/validar-unidade-medida-empresa.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirUnidadeMedidaParametros = {
	unidadeMedidaId: string;
	idusuario: string;
};

export async function excluirUnidadeMedidaService({
	unidadeMedidaId,
	idusuario,
}: ExcluirUnidadeMedidaParametros): Promise<HttpResponse<null>> {
	const registro = await buscarUnidadeMedidaPorId(unidadeMedidaId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	if (isUnidadeMedidaGlobal(registro)) {
		return httpProibido();
	}

	if (!registro.idempresa) {
		return httpProibido();
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
		acao: "excluir_unidade_medida",
		idusuario,
		recurso: "unidade_medida",
		idrecurso: unidadeMedidaId,
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

	await excluirUnidadeMedida(unidadeMedidaId);

	return httpSemConteudo();
}
