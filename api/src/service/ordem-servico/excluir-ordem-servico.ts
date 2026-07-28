import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarFaturamentosPorOrdemServico } from "@/repositories/ordem-servico-faturamento-repositories.js";
import { listarItensPorOrdemServico } from "@/repositories/ordem-servico-item-repositories.js";
import {
	buscarOrdemServicoPorIdEempresa,
	excluirOrdemServico,
} from "@/repositories/ordem-servico-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirOrdemServicoParametros = {
	ordemServicoId: string;
	idempresa: string;
	idusuario: string;
};

export async function excluirOrdemServicoService({
	ordemServicoId,
	idempresa,
	idusuario,
}: ExcluirOrdemServicoParametros): Promise<HttpResponse<null>> {
	const registro = await buscarOrdemServicoPorIdEempresa(
		ordemServicoId,
		idempresa,
	);

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

	const faturamentos = await listarFaturamentosPorOrdemServico(
		ordemServicoId,
		idempresa,
	);
	if (faturamentos.length > 0 || registro.geroufinanceiro === 1) {
		return httpBadRequest(
			"Não é possível excluir ordem de serviço com faturamento ou financeiro gerado",
		);
	}

	const itens = await listarItensPorOrdemServico(ordemServicoId, idempresa);
	if (itens.some((item) => item.cancelado !== 1)) {
		return httpBadRequest(
			"Remova ou cancele os itens antes de excluir a ordem de serviço",
		);
	}

	await excluirOrdemServico(ordemServicoId, idempresa);

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "excluir_ordem_servico",
		idusuario,
		recurso: "ordem_servico",
		idrecurso: ordemServicoId,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			codigo: registro.codigo,
		},
	});

	return httpSemConteudo();
}
