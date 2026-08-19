import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovoProduto } from "@/model/produto-model.js";
import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarProdutosEmMassa,
	buscarProdutosPorIds,
} from "@/repositories/produtos-repositories.js";
import { buscarUnidadeMedidaPorId } from "@/repositories/unidade-medida-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { unidadeMedidaPertenceEmpresa } from "@/service/unidade-medida/validar-unidade-medida-empresa.js";
import {
	type CamposAlteracaoEmMassaProduto,
	LIMITE_ALTERACAO_EM_MASSA_PRODUTOS,
	prepararCamposAlteracaoEmMassaProduto,
} from "@/util/campos-alteracao-em-massa-produto.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";
import { codigoCfopParaInteiro } from "@/util/preencher-tributacao-produto-cfop.js";

export type AlterarProdutosEmMassaResposta = {
	atualizados: number;
	erros: number;
};

type AlterarProdutosEmMassaParametros = {
	idusuario: string;
	idempresa: string;
	ids: string[];
	campos: CamposAlteracaoEmMassaProduto;
};

export async function alterarProdutosEmMassaService({
	idusuario,
	idempresa,
	ids,
	campos,
}: AlterarProdutosEmMassaParametros): Promise<
	HttpResponse<AlterarProdutosEmMassaResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (ids.length === 0) {
		return httpBadRequest("Selecione ao menos um produto");
	}

	if (ids.length > LIMITE_ALTERACAO_EM_MASSA_PRODUTOS) {
		return httpBadRequest(
			`É possível alterar no máximo ${LIMITE_ALTERACAO_EM_MASSA_PRODUTOS} produtos por vez`,
		);
	}

	const dados = prepararCamposAlteracaoEmMassaProduto(campos);

	if (Object.keys(dados).length === 0) {
		return httpBadRequest("Selecione ao menos um campo para alterar");
	}

	const dadosComEnriquecimento = await enriquecerCamposAlteracaoEmMassa(
		dados,
		idempresa,
	);

	if (!dadosComEnriquecimento.success || !dadosComEnriquecimento.body) {
		return dadosComEnriquecimento.success
			? httpBadRequest("Não foi possível preparar os campos para alteração")
			: dadosComEnriquecimento;
	}

	const dadosPersistencia = dadosComEnriquecimento.body;

	const produtosEncontrados = await buscarProdutosPorIds(ids);

	if (produtosEncontrados.some((produto) => produto.idempresa !== idempresa)) {
		return httpProibido();
	}

	const idsEncontrados = new Set(
		produtosEncontrados.map((produto) => produto.id),
	);
	const idsValidos = ids.filter((id) => idsEncontrados.has(id));
	const erros = ids.length - idsValidos.length;

	if (idsValidos.length === 0) {
		return httpBadRequest("Nenhum dos produtos foi encontrado");
	}

	const atualizados = await atualizarProdutosEmMassa(
		idsValidos,
		dadosPersistencia,
	);

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "alterar_produtos_em_massa",
		idusuario,
		recurso: "produto",
		idrecurso: idsValidos[0] ?? null,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			ids: idsValidos,
			campos: Object.keys(dadosPersistencia),
			valores: dadosPersistencia,
		},
	});

	return httpOk({
		atualizados: atualizados.length,
		erros,
	});
}

async function enriquecerCamposAlteracaoEmMassa(
	dados: Partial<NovoProduto>,
	idempresa: string,
): Promise<HttpResponse<Partial<NovoProduto>>> {
	const enriquecidos = { ...dados };

	if (enriquecidos.idunidademedida) {
		const unidade = await buscarUnidadeMedidaPorId(
			enriquecidos.idunidademedida,
		);

		if (!unidade || !unidadeMedidaPertenceEmpresa(unidade, idempresa)) {
			return httpProibido();
		}

		enriquecidos.unidademedida = unidade.codigo?.slice(0, 6) ?? null;
	}

	if (enriquecidos.idcfopsaidanfce) {
		const cfop = await buscarCfopPorId(enriquecidos.idcfopsaidanfce);
		if (cfop) {
			enriquecidos.cfopvendaecf = codigoCfopParaInteiro(cfop.codigo);
		}
	} else if (
		enriquecidos.idcfopsaidanfce === null &&
		"idcfopsaidanfce" in dados
	) {
		enriquecidos.cfopvendaecf = null;
	}

	return httpOk(enriquecidos);
}
