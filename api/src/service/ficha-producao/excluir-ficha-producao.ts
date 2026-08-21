import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarFichaProducaoPorId,
	excluirFichaProducao,
} from "@/repositories/ficha-producao-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirFichaProducaoParametros = {
	id: string;
	idusuario: string;
};

export async function excluirFichaProducaoService({
	id,
	idusuario,
}: ExcluirFichaProducaoParametros): Promise<HttpResponse<null>> {
	const ficha = await buscarFichaProducaoPorId(id);
	if (!ficha) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		ficha.idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const removida = await excluirFichaProducao(id);
	if (!removida) {
		return httpErroInterno();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "excluir_ficha_producao",
		idusuario,
		recurso: "ficha_producao",
		idrecurso: id,
		idempresa: ficha.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			idprodutoacabado: ficha.idprodutoacabado,
		},
	});

	return httpSemConteudo();
}
