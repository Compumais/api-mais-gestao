import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarProdutosParaExportacaoMgv } from "@/repositories/produtos-repositories.js";
import { httpBadRequest, httpOk, httpProibido } from "@/util/http-util.js";
import {
	type ItemMgv,
	montarArquivoItensMgv,
	normalizarDepartamentoMgv,
	precoCentavosMgv,
	produtoEhPesoMgv,
	produtoExportaBalancaMgv,
	resolverDiasValidadeMgv,
} from "@/util/mgv-itens.js";

export type ExportarProdutosMgvParametros = {
	idusuario: string;
	idempresa: string;
	departamentoPadrao?: number;
	diasValidade?: number;
	apenasPesaveis?: boolean;
};

export type ExportarProdutosMgvResposta = {
	content: Buffer;
	contentType: string;
	filename: string;
	alertas: string[];
	totalLinhas: number;
};

const MAX_ALERTAS = 50;

export async function exportarProdutosMgvService({
	idusuario,
	idempresa,
	departamentoPadrao = 1,
	diasValidade = 0,
	apenasPesaveis = false,
}: ExportarProdutosMgvParametros): Promise<
	HttpResponse<ExportarProdutosMgvResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const produtos = await listarProdutosParaExportacaoMgv(idempresa);
	const itens: ItemMgv[] = [];
	const alertas: string[] = [];
	const deptoPadrao = normalizarDepartamentoMgv(departamentoPadrao);

	for (const produto of produtos) {
		if (!produtoExportaBalancaMgv(produto.exportaBalanca)) {
			continue;
		}

		const codigo = produto.codigo ?? 0;
		if (!Number.isInteger(codigo) || codigo < 1 || codigo > 999_999) {
			adicionarAlerta(
				alertas,
				`Produto "${produto.nome}" ignorado: código inválido para PLU da balança (1 a 999999).`,
			);
			continue;
		}

		const pesavel = produtoEhPesoMgv(produto);
		if (apenasPesaveis && !pesavel) {
			continue;
		}

		const preco = Number(produto.preco);
		if (precoCentavosMgv(preco) === null) {
			adicionarAlerta(
				alertas,
				`Produto ${codigo} ignorado: preço inválido ou acima de R$ 9.999,99.`,
			);
			continue;
		}

		const descricao = (produto.nome || produto.descricao || "").trim();
		if (!descricao) {
			adicionarAlerta(alertas, `Produto ${codigo} ignorado: sem descrição.`);
			continue;
		}

		itens.push({
			codigo,
			descricao,
			preco,
			ean: produto.ean,
			pesavel,
			departamento: normalizarDepartamentoMgv(
				produto.departamentoCodigo,
				deptoPadrao,
			),
			diasValidade: resolverDiasValidadeMgv(produto.diasValidade, diasValidade),
		});
	}

	if (itens.length === 0) {
		return httpBadRequest(
			"Nenhum produto marcado para exportar à balança (aba Balança no cadastro) com dados válidos para o layout MGV.",
		);
	}

	const conteudo = montarArquivoItensMgv(itens);

	return httpOk({
		content: Buffer.from(conteudo, "latin1"),
		contentType: "text/plain; charset=iso-8859-1",
		filename: "TXTitens.txt",
		alertas,
		totalLinhas: itens.length,
	});
}

function adicionarAlerta(alertas: string[], mensagem: string) {
	if (alertas.length < MAX_ALERTAS) {
		alertas.push(mensagem);
	}
}
