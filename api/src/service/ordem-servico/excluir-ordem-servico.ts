import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarOrdemServicoPorId,
	excluirOrdemServico,
} from "@/repositories/ordem-servico-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirOrdemServicoParametros = {
	ordemServicoId: string;
	idusuario: string;
};

export async function excluirOrdemServicoService({
	ordemServicoId,
	idusuario,
}: ExcluirOrdemServicoParametros): Promise<HttpResponse<null>> {
	const registro = await buscarOrdemServicoPorId(ordemServicoId);

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
		acao: "excluir_ordem_servico",
		idusuario,
		recurso: "ordem_servico",
		idrecurso: ordemServicoId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirOrdemServico(ordemServicoId);

	return httpSemConteudo();
}
