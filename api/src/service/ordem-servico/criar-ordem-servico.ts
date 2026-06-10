import { v4 as uuidv4 } from "uuid";
import type {
	OrdemServico,
	NovoOrdemServico,
} from "@/model/ordem-servico-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarOrdemServico,
	excluirOrdemServico,
} from "@/repositories/ordem-servico-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarOrdemServicoParametros = {
	dadosOrdemServico: NovoOrdemServico;
	idusuario: string;
};

export async function criarOrdemServicoService({
	dadosOrdemServico,
	idusuario,
}: CriarOrdemServicoParametros): Promise<HttpResponse<OrdemServico | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosOrdemServico.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarOrdemServico(dadosOrdemServico);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_ordem_servico",
		idusuario,
		recurso: "ordem_servico",
		idrecurso: registro.id,
		idempresa: dadosOrdemServico.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirOrdemServico(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<OrdemServico>(registro);
}
