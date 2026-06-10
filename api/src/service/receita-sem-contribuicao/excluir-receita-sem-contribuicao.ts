import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarReceitaSemContribuicaoPorId,
	excluirReceitaSemContribuicao,
} from "@/repositories/receita-sem-contribuicao-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirReceitaSemContribuicaoParametros = {
	receitaSemContribuicaoId: string;
	idusuario: string;
};

export async function excluirReceitaSemContribuicaoService({
	receitaSemContribuicaoId,
	idusuario,
}: ExcluirReceitaSemContribuicaoParametros): Promise<HttpResponse<null>> {
	const registro = await buscarReceitaSemContribuicaoPorId(
		receitaSemContribuicaoId,
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

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "excluir_receita_sem_contribuicao",
		idusuario,
		recurso: "receita_sem_contribuicao",
		idrecurso: receitaSemContribuicaoId,
		idempresa: registro.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirReceitaSemContribuicao(receitaSemContribuicaoId);

	return httpSemConteudo();
}
