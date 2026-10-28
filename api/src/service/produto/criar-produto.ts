import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovoProduto, Produto } from "@/model/produto-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarProdutoComHistorico } from "@/repositories/produto-historico-repositories.js";
import {
	buscarProdutoPorId,
	excluirProduto,
} from "@/repositories/produtos-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { aplicarHerancaVariacao } from "@/service/produto/aplicar-heranca-variacao.js";
import { comCodigoUnidadeGravado } from "@/service/produto/preencher-sigla-unidade.js";
import { validarUnidadeMedidaParaEmpresa } from "@/service/unidade-medida/validar-unidade-medida-empresa.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErro,
	httpErroInterno,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

type CriarProdutoParametros = {
	dadosProduto: NovoProduto;
	idusuario: string;
	ip?: string | undefined;
};

export async function criarProdutoService({
	dadosProduto,
	idusuario,
	ip,
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

	let dadosGravacao = dadosProduto;
	if (dadosProduto.idprodutopai) {
		const pai = await buscarProdutoPorId(dadosProduto.idprodutopai);
		if (!pai) {
			return httpNaoEncontrado("Produto pai não encontrado");
		}
		if (pai.idempresa !== dadosProduto.idempresa) {
			return httpProibido();
		}
		if (pai.idprodutopai) {
			return httpBadRequest("Uma variação não pode ter variações");
		}
		dadosGravacao = {
			...aplicarHerancaVariacao(dadosProduto, pai, "criar"),
			idprodutopai: pai.id,
		};
	}

	const registro = await criarProdutoComHistorico(
		await comCodigoUnidadeGravado(dadosGravacao),
		{
			idusuario,
			ip,
		},
	);

	if (!registro) {
		return httpErro();
	}

	const auditoriaId = uuidv4();

	try {
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
	} catch (erroAuditoria) {
		console.error("Falha ao auditar criação de produto:", erroAuditoria);
		await excluirProduto(registro.id);
		return httpErroInterno();
	}

	return httpCriacao<Produto>(registro);
}
