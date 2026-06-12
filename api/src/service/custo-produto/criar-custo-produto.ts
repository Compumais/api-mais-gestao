import { v4 as uuidv4 } from "uuid";
import type { CustoProduto, NovoCustoProduto } from "@/model/custo-produto-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	criarCustoProduto,
	excluirCustoProduto,
} from "@/repositories/custo-produto-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
} from "@/util/http-util.js";
import { validarAcessoProduto } from "./validar-acesso-produto.js";

type CriarCustoProdutoParametros = {
	dadosCustoProduto: NovoCustoProduto;
	idusuario: string;
};

export async function criarCustoProdutoService({
	dadosCustoProduto,
	idusuario,
}: CriarCustoProdutoParametros): Promise<HttpResponse<CustoProduto | null>> {
	const validacao = await validarAcessoProduto(
		idusuario,
		dadosCustoProduto.idproduto,
	);

	if (!validacao.sucesso) {
		return validacao.resposta;
	}

	const registro = await criarCustoProduto(dadosCustoProduto);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_custo_produto",
		idusuario,
		recurso: "custo_produto",
		idrecurso: registro.id,
		idempresa: validacao.produto.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			idproduto: registro.idproduto,
			custo: registro.custo,
			precocompra: registro.precocompra,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirCustoProduto(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<CustoProduto>(registro);
}
