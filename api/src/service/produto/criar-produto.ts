import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovoProduto, Produto } from "@/model/produto-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	criarProduto,
	excluirProduto,
} from "@/repositories/produtos-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { validarUnidadeMedidaParaEmpresa } from "@/service/unidade-medida/validar-unidade-medida-empresa.js";
import {
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

type CriarProdutoParametros = {
	dadosProduto: NovoProduto;
	idusuario: string;
};

export async function criarProdutoService({
	dadosProduto,
	idusuario,
}: CriarProdutoParametros): Promise<HttpResponse<Produto | null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosProduto.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (!dadosProduto.idunidademedida) {
		return httpProibido();
	}

	const unidadeValida = await validarUnidadeMedidaParaEmpresa(
		dadosProduto.idunidademedida,
		dadosProduto.idempresa,
	);

	if (!unidadeValida) {
		return httpProibido();
	}

	const registro = await criarProduto(dadosProduto);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	const auditoria = await criarAuditoriaService({
		id: auditoriaId,
		acao: "criar_produto",
		idusuario,
		recurso: "produto",
		idrecurso: registro.id,
		idempresa: dadosProduto.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			nome: registro.nome,
			codigo: registro.codigo,
		},
	});

	if (!auditoria || !auditoria.success) {
		await excluirProduto(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<Produto>(registro);
}
