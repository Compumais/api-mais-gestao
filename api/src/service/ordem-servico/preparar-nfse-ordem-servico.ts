import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarFaturamentoFiscalPorModeloOrdemServico } from "@/repositories/ordem-servico-faturamento-repositories.js";
import { listarItensPorOrdemServico } from "@/repositories/ordem-servico-item-repositories.js";
import { buscarOrdemServicoPorIdEempresa } from "@/repositories/ordem-servico-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import {
	type FormaPagamentoOs,
	gerarContasReceberOrdemServicoService,
} from "@/service/ordem-servico/gerar-contas-receber-ordem-servico.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type PrepararNfseOrdemServicoParametros = {
	ordemServicoId: string;
	idempresa: string;
	idusuario: string;
	formasPagamento?: FormaPagamentoOs[] | undefined;
};

function numero(valor: string | number | null | undefined): number {
	const resultado = Number(valor ?? 0);
	return Number.isFinite(resultado) ? resultado : 0;
}

function valoresDistintos(valores: Array<string | null | undefined>) {
	return new Set(valores.map((valor) => valor?.trim() || "")).size > 1;
}

export async function prepararNfseOrdemServicoService({
	ordemServicoId,
	idempresa,
	idusuario,
	formasPagamento,
}: PrepararNfseOrdemServicoParametros): Promise<HttpResponse<unknown>> {
	const os = await buscarOrdemServicoPorIdEempresa(ordemServicoId, idempresa);
	if (!os) return httpNaoEncontrado();

	const possuiAcesso = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!possuiAcesso) return httpProibido();
	if (!os.idcliente) {
		return httpBadRequest("Ordem de serviço sem cliente vinculado");
	}

	const nfseExistente = await buscarFaturamentoFiscalPorModeloOrdemServico(
		ordemServicoId,
		idempresa,
		"NFS",
	);
	if (nfseExistente?.idnotafiscal) {
		return httpBadRequest(
			`Já existe NFS-e vinculada a esta OS: ${nfseExistente.idnotafiscal}`,
		);
	}

	const itensOs = await listarItensPorOrdemServico(ordemServicoId, idempresa);
	const itensServico = itensOs.filter(
		(item) =>
			item.cancelado !== 1 && item.tipoproduto === "S" && item.idproduto,
	);
	if (itensServico.length === 0) {
		return httpBadRequest("A OS não possui serviços ativos para gerar NFS-e");
	}

	const itensComProduto = await Promise.all(
		itensServico.map(async (item) => ({
			item,
			produto: await buscarProdutoPorId(item.idproduto ?? ""),
		})),
	);
	const itensValidos = itensComProduto.filter(
		(
			registro,
		): registro is typeof registro & {
			produto: NonNullable<typeof registro.produto>;
		} => Boolean(registro.produto && registro.produto.idempresa === idempresa),
	);
	if (itensValidos.length !== itensComProduto.length) {
		return httpBadRequest("Há serviço sem cadastro válido na empresa");
	}

	const produtos = itensValidos.map(({ produto }) => produto);
	const semLc116 = produtos
		.map((produto, index) => ({
			produto,
			item: itensValidos[index]?.item,
		}))
		.filter(({ produto }) => !produto.codigolistalc11603?.trim());
	if (semLc116.length > 0) {
		return httpBadRequest(
			`Informe o item da LC 116 no cadastro: ${semLc116
				.map(({ item }) => item?.nomeproduto ?? item?.idproduto)
				.join(", ")}`,
		);
	}

	const camposCompatibilidade = [
		{
			nome: "item da LC 116",
			valores: produtos.map((produto) => produto.codigolistalc11603),
		},
		{
			nome: "cTribNac",
			valores: produtos.map((produto) => produto.codigotributacaonacional),
		},
		{
			nome: "NBS",
			valores: produtos.map((produto) => produto.codigonbs),
		},
		{
			nome: "exigibilidade do ISS",
			valores: produtos.map((produto) => produto.exigibilidadeiss),
		},
		{
			nome: "alíquota do ISS",
			valores: produtos.map((produto) => produto.aliquotaiss),
		},
	];
	const incompatíveis = camposCompatibilidade
		.filter((campo) => valoresDistintos(campo.valores))
		.map((campo) => campo.nome);
	if (incompatíveis.length > 0) {
		return httpBadRequest(
			`Os serviços possuem classificações incompatíveis para uma única NFS-e: ${incompatíveis.join(", ")}`,
		);
	}

	const primeiroProduto = produtos[0];
	if (!primeiroProduto) {
		return httpBadRequest("A OS não possui serviços válidos para gerar NFS-e");
	}
	const itens = itensValidos.map(({ item, produto }) => ({
		descricao: item.nomeproduto || produto.nome,
		quantidade: numero(item.quantidade),
		valorUnitario: numero(item.preco),
		codigoListaLc11603: produto.codigolistalc11603?.trim() ?? "",
	}));
	const valorServicos = itens.reduce(
		(total, item) => total + item.quantidade * item.valorUnitario,
		0,
	);
	const aliquotaIss = numero(primeiroProduto.aliquotaiss);
	const valorPis = itensValidos.reduce(
		(total, { item, produto }) =>
			total +
			(numero(item.quantidade) *
				numero(item.preco) *
				numero(produto.aliquotapis)) /
				100,
		0,
	);
	const valorCofins = itensValidos.reduce(
		(total, { item, produto }) =>
			total +
			(numero(item.quantidade) *
				numero(item.preco) *
				numero(produto.aliquotacofins)) /
				100,
		0,
	);

	const valorTotalOs = parseFloat(os.valor ?? "0") || 0;
	const formasFinanceiro =
		formasPagamento?.length === 1 && formasPagamento[0]
			? [{ ...formasPagamento[0], valor: valorTotalOs }]
			: formasPagamento;

	const resultadoFinanceiro = await gerarContasReceberOrdemServicoService({
		ordemServicoId,
		idempresa,
		idusuario,
		formasPagamento: formasFinanceiro,
	});
	const avisos: string[] = [];
	if (!resultadoFinanceiro.success) {
		avisos.push(
			typeof resultadoFinanceiro.error === "string"
				? `Financeiro não gerado: ${resultadoFinanceiro.error}`
				: "Financeiro não gerado; revise a forma de pagamento da OS",
		);
	}

	return httpOk({
		idordemservico: ordemServicoId,
		iddestinatario: os.idcliente,
		itemListaServico: primeiroProduto.codigolistalc11603?.trim() ?? "",
		discriminacao: itens
			.map(
				(item) =>
					`${item.quantidade} x ${item.descricao} - R$ ${item.valorUnitario.toFixed(2)}`,
			)
			.join("\n"),
		codigoTributacaoMunicipio:
			primeiroProduto.codigomunicipalservico?.trim() || undefined,
		codigoTributacaoNacional:
			primeiroProduto.codigotributacaonacional?.trim() || undefined,
		codigoNbs: primeiroProduto.codigonbs?.trim() || undefined,
		exigibilidadeIss: primeiroProduto.exigibilidadeiss?.trim() || "1",
		issRetido: primeiroProduto.situacaoiss === "R" ? "1" : "2",
		valores: {
			servicos: valorServicos,
			iss: (valorServicos * aliquotaIss) / 100,
			aliquota: aliquotaIss,
			pis: valorPis,
			cofins: valorCofins,
		},
		itens,
		idplanocontas: primeiroProduto.idplanocontas ?? undefined,
		idcondicaopagto: os.idcondicaopagamento ?? undefined,
		idtipodocumento: os.idtipodocumentofinanceiro ?? undefined,
		gerarFinanceiro: false,
		avisos,
		...(resultadoFinanceiro.success && resultadoFinanceiro.body
			? { financeiro: resultadoFinanceiro.body }
			: {}),
	});
}
