import { v4 as uuidv4 } from "uuid";
import type {
	ReceitaSemContribuicao,
	NovoReceitaSemContribuicao,
} from "@/model/receita-sem-contribuicao-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarReceitaSemContribuicao,
	excluirReceitaSemContribuicao,
} from "@/repositories/receita-sem-contribuicao-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarReceitaSemContribuicaoParametros = {
	dadosReceitaSemContribuicao: NovoReceitaSemContribuicao;
	idusuario: string;
};

export async function criarReceitaSemContribuicaoService({
	dadosReceitaSemContribuicao,
	idusuario,
}: CriarReceitaSemContribuicaoParametros): Promise<
	HttpResponse<ReceitaSemContribuicao | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosReceitaSemContribuicao.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registro = await criarReceitaSemContribuicao(
		dadosReceitaSemContribuicao,
	);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_receita_sem_contribuicao",
		idusuario,
		recurso: "receita_sem_contribuicao",
		idrecurso: registro.id,
		idempresa: dadosReceitaSemContribuicao.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			descricao: registro.descricao,
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirReceitaSemContribuicao(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<ReceitaSemContribuicao>(registro);
}
