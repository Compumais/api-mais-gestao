import { listarMovimentosEstoquePorDocumento } from "@/repositories/movimento-estoque-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { empresaPermiteVendaSemEstoque } from "@/service/configuracao-pdv/venda-sem-estoque.js";
import { registrarMovimentoEstoque } from "@/service/estoque/registrar-movimento-estoque.js";
import { garantirProducaoNaVendaService } from "@/service/producao/garantir-producao-na-venda.js";
import { TIPO_DOCUMENTO_ESTOQUE, TIPO_ESTOQUE } from "@/util/tipo-estoque.js";

export type ItemMovimentoEstoqueNf = {
	iditem: string;
	idproduto: string;
	quantidade: string;
	custoUnitario: string;
	lote?: string | undefined;
	idlote?: string | undefined;
};

export type RegistrarMovimentosEstoqueNfParametros = {
	idempresa: string;
	idnotafiscal: string;
	idlocalestoque?: string | undefined;
	dataMovimento: string;
	sentido?: "entrada" | "saida" | undefined;
	itens: ItemMovimentoEstoqueNf[];
	idusuario?: string | undefined;
};

export type ResultadoMovimentosEstoqueNf = {
	movimentosCriados: number;
	avisos: string[];
};

function normalizarQuantidadeMovimento(valor: string): string {
	const qtd = Number.parseFloat(valor.trim().replace(",", "."));
	if (!Number.isFinite(qtd) || qtd <= 0) return "0.000000";
	return qtd.toFixed(6);
}

async function resolverCustoUnitarioProduto(idproduto: string): Promise<string> {
	const produto = await buscarProdutoPorId(idproduto);
	if (!produto) return "0";

	const custo =
		produto.custoaquisicao ??
		produto.customedioinicial ??
		produto.precoultimacompra ??
		"0";

	return String(custo);
}

export async function registrarMovimentosEstoqueNf({
	idempresa,
	idnotafiscal,
	idlocalestoque,
	dataMovimento,
	sentido = "entrada",
	itens,
	idusuario,
}: RegistrarMovimentosEstoqueNfParametros): Promise<ResultadoMovimentosEstoqueNf> {
	const avisos: string[] = [];

	if (itens.length === 0) {
		return { movimentosCriados: 0, avisos };
	}

	if (!idlocalestoque) {
		return {
			movimentosCriados: 0,
			avisos: [
				"Entrada de estoque não registrada: a empresa não tem local de estoque ativo.",
			],
		};
	}

	const vendaSemEstoque =
		sentido === "saida" && (await empresaPermiteVendaSemEstoque(idempresa));

	const existentes = await listarMovimentosEstoquePorDocumento(idnotafiscal);
	const ativos = existentes.filter((movimento) => movimento.cancelado !== 1);
	const itensComMovimento = new Set(
		ativos
			.map((movimento) => movimento.iditemoriginal)
			.filter((id): id is string => Boolean(id)),
	);
	const movimentoNotaSemItem = ativos.some((movimento) => !movimento.iditemoriginal);
	if (movimentoNotaSemItem) {
		return { movimentosCriados: 0, avisos };
	}

	const datahora = new Date().toISOString().replace("T", " ").replace("Z", "");
	let movimentosCriados = 0;

	for (const item of itens) {
		if (itensComMovimento.has(item.iditem)) {
			continue;
		}

		if (!item.idproduto) {
			avisos.push(`Item ${item.iditem}: sem produto vinculado, estoque ignorado`);
			continue;
		}

		const quantidade = normalizarQuantidadeMovimento(item.quantidade);
		const qtd = Number.parseFloat(quantidade);
		if (qtd <= 0) {
			avisos.push(`Item ${item.iditem}: quantidade de estoque inválida`);
			continue;
		}

		let custoUnitario = Number.parseFloat(item.custoUnitario) || 0;
		if (custoUnitario <= 0) {
			custoUnitario =
				Number.parseFloat(await resolverCustoUnitarioProduto(item.idproduto)) || 0;
		}

		const custoTotal = (qtd * custoUnitario).toFixed(2);
		const quantidadeMovimento = quantidade;

		try {
			if (sentido === "saida" && idusuario) {
				const producao = await garantirProducaoNaVendaService({
					idempresa,
					idproduto: item.idproduto,
					quantidade: quantidadeMovimento,
					idoriginal: idnotafiscal,
					tipoestoque: TIPO_ESTOQUE.AMBOS,
					idusuario,
					ignorarValidacaoEstoque: vendaSemEstoque,
				});

				if (!producao.success) {
					avisos.push(
						`Produção na venda falhou (item ${item.iditem}): ${producao.error ?? "erro"}`,
					);
					continue;
				}
			}

			const movimento = await registrarMovimentoEstoque({
				idempresa,
				idproduto: item.idproduto,
				quantidade: quantidadeMovimento,
				sentido,
				tipoestoque: TIPO_ESTOQUE.AMBOS,
				tipodocumento: TIPO_DOCUMENTO_ESTOQUE.NOTA_FISCAL,
				idlocalestoque,
				idoriginal: idnotafiscal,
				iditemoriginal: item.iditem,
				idlote: item.idlote ?? null,
				data: dataMovimento.substring(0, 10),
				datahora,
				valortotal: custoTotal,
				custoaquisicao: custoUnitario.toFixed(2),
				customedio: custoUnitario.toFixed(2),
				custototal: custoTotal,
				precocusto: custoUnitario.toFixed(2),
				precoultimacompra: custoUnitario.toFixed(2),
				observacao: item.lote ? `Lote ${item.lote}`.slice(0, 50) : null,
				permitirSaldoNegativo: sentido === "saida" && vendaSemEstoque,
			});

			if (movimento) movimentosCriados++;
			if (!movimento) {
				avisos.push(`Item ${item.iditem}: movimento de estoque não foi gravado`);
			}
		} catch (erro) {
			const mensagem = erro instanceof Error ? erro.message : "erro desconhecido";
			console.error(
				JSON.stringify({
					evento: "movimento_estoque_nf_falhou",
					idnotafiscal,
					iditem: item.iditem,
					idproduto: item.idproduto,
					mensagem,
				}),
			);
			avisos.push(`Falha ao registrar estoque do item ${item.iditem}: ${mensagem}`);
		}
	}

	return { movimentosCriados, avisos };
}
