import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovoOrdemServico,
	OrdemServico,
} from "@/model/ordem-servico-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarOrdemServico,
	buscarOrdemServicoPorId,
} from "@/repositories/ordem-servico-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarOrdemServicoParametros = {
	ordemServicoId: string;
	idusuario: string;
	dados: Partial<NovoOrdemServico>;
};

export async function atualizarOrdemServicoService({
	ordemServicoId,
	idusuario,
	dados,
}: AtualizarOrdemServicoParametros): Promise<
	HttpResponse<OrdemServico | null>
> {
	const registroExistente = await buscarOrdemServicoPorId(ordemServicoId);

	if (!registroExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registroExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registroAtualizado = await atualizarOrdemServico(ordemServicoId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_ordem_servico",
		idusuario,
		recurso: "ordem_servico",
		idrecurso: ordemServicoId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<OrdemServico>(registroAtualizado);
}
