import { v4 as uuidv4 } from "uuid";
import type {
	ReceitaSemContribuicao,
	NovoReceitaSemContribuicao,
} from "@/model/receita-sem-contribuicao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarReceitaSemContribuicaoPorId,
	atualizarReceitaSemContribuicao,
} from "@/repositories/receita-sem-contribuicao-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarReceitaSemContribuicaoParametros = {
	receitaSemContribuicaoId: string;
	idusuario: string;
	dados: Partial<NovoReceitaSemContribuicao>;
};

export async function atualizarReceitaSemContribuicaoService({
	receitaSemContribuicaoId,
	idusuario,
	dados,
}: AtualizarReceitaSemContribuicaoParametros): Promise<
	HttpResponse<ReceitaSemContribuicao | null>
> {
	const registroExistente = await buscarReceitaSemContribuicaoPorId(
		receitaSemContribuicaoId,
	);

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

	const registroAtualizado = await atualizarReceitaSemContribuicao(
		receitaSemContribuicaoId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_receita_sem_contribuicao",
		idusuario,
		recurso: "receita_sem_contribuicao",
		idrecurso: receitaSemContribuicaoId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<ReceitaSemContribuicao>(registroAtualizado);
}
