import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCustoProdutoPorId,
	excluirCustoProduto,
} from "@/repositories/custo-produto-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpSemConteudo,
} from "@/util/http-util.js";
import { validarAcessoProduto } from "./validar-acesso-produto.js";

type ExcluirCustoProdutoParametros = {
	custoProdutoId: string;
	idusuario: string;
};

export async function excluirCustoProdutoService({
	custoProdutoId,
	idusuario,
}: ExcluirCustoProdutoParametros): Promise<HttpResponse<null>> {
	const registro = await buscarCustoProdutoPorId(custoProdutoId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const validacao = await validarAcessoProduto(idusuario, registro.idproduto);

	if (!validacao.sucesso) {
		return validacao.resposta;
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "excluir_custo_produto",
		idusuario,
		recurso: "custo_produto",
		idrecurso: custoProdutoId,
		idempresa: validacao.produto.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			idproduto: registro.idproduto,
			custo: registro.custo,
		},
	});

	if (!auditoria || !auditoria.success) {
		return httpErroInterno();
	}

	await excluirCustoProduto(custoProdutoId);

	return httpSemConteudo();
}
