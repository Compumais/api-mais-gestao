import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { buscarSaldoEstoquePorCodigoProduto } from "@/repositories/saldo-estoque-repositories.js";
import { registrarMovimentoEstoque } from "@/service/estoque/registrar-movimento-estoque.js";
import {
	httpBadRequest,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import {
	TIPO_DOCUMENTO_ESTOQUE,
	TIPO_ESTOQUE,
	type TipoEstoque,
} from "@/util/tipo-estoque.js";

export const TIPO_OPERACAO_AJUSTE = {
	ENTRADA: "entrada",
	SAIDA: "saida",
	CONTAGEM: "contagem",
} as const;

export type TipoOperacaoAjuste =
	(typeof TIPO_OPERACAO_AJUSTE)[keyof typeof TIPO_OPERACAO_AJUSTE];

export type ItemAjusteEstoque = {
	idproduto: string;
	quantidade: string;
	nomeproduto?: string | undefined;
};

export type AjustarEstoqueEmMassaParametros = {
	idusuario: string;
	idempresa: string;
	tipooperacao: TipoOperacaoAjuste;
	tipoestoque: TipoEstoque;
	itens: ItemAjusteEstoque[];
	observacao?: string | null | undefined;
};

export type ResultadoItemAjusteEstoque = {
	idproduto: string;
	nomeproduto?: string | undefined;
	sucesso: boolean;
	movimentos: number;
	mensagem?: string | undefined;
};

export type ResultadoAjusteEstoqueEmMassa = {
	idajuste: string;
	movimentosRegistrados: number;
	itensProcessados: number;
	itensIgnorados: number;
	resultados: ResultadoItemAjusteEstoque[];
};

function parseQtd(valor: string | null | undefined): number {
	const n = Number.parseFloat(valor ?? "0");
	return Number.isNaN(n) ? 0 : n;
}

function formatarQtd(valor: number): string {
	return Math.max(0, valor).toFixed(6);
}

async function registrarDelta(params: {
	idempresa: string;
	idproduto: string;
	quantidade: number;
	sentido: "entrada" | "saida";
	tipoestoque: TipoEstoque;
	idajuste: string;
	observacao: string | null;
}): Promise<boolean> {
	if (params.quantidade <= 0.0000005) return false;

	const movimento = await registrarMovimentoEstoque({
		idempresa: params.idempresa,
		idproduto: params.idproduto,
		quantidade: formatarQtd(params.quantidade),
		sentido: params.sentido,
		tipoestoque: params.tipoestoque,
		tipodocumento: TIPO_DOCUMENTO_ESTOQUE.ACERTO,
		idoriginal: params.idajuste,
		iditemoriginal: params.idproduto,
		observacao: params.observacao,
		permitirSemLote: true,
	});

	return Boolean(movimento);
}

export async function ajustarEstoqueEmMassaService({
	idusuario,
	idempresa,
	tipooperacao,
	tipoestoque,
	itens,
	observacao,
}: AjustarEstoqueEmMassaParametros): Promise<
	HttpResponse<ResultadoAjusteEstoqueEmMassa>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (
		tipoestoque !== TIPO_ESTOQUE.OPERACIONAL &&
		tipoestoque !== TIPO_ESTOQUE.FISCAL &&
		tipoestoque !== TIPO_ESTOQUE.AMBOS
	) {
		return httpBadRequest(
			"tipoestoque inválido (use 0 operacional, 1 fiscal ou 2 ambos)",
		);
	}

	if (
		tipooperacao !== TIPO_OPERACAO_AJUSTE.ENTRADA &&
		tipooperacao !== TIPO_OPERACAO_AJUSTE.SAIDA &&
		tipooperacao !== TIPO_OPERACAO_AJUSTE.CONTAGEM
	) {
		return httpBadRequest("tipooperacao inválido");
	}

	if (itens.length === 0) {
		return httpBadRequest("Informe ao menos um produto para o ajuste");
	}

	if (itens.length > 500) {
		return httpBadRequest("Limite de 500 produtos por ajuste");
	}

	const idajuste = uuidv4();
	const obsBase = (observacao?.trim() || `Ajuste ${tipooperacao}`).slice(0, 50);
	const resultados: ResultadoItemAjusteEstoque[] = [];
	let movimentosRegistrados = 0;
	let itensProcessados = 0;
	let itensIgnorados = 0;

	for (const item of itens) {
		const quantidadeInformada = parseQtd(item.quantidade);
		if (quantidadeInformada < 0) {
			itensIgnorados++;
			resultados.push({
				idproduto: item.idproduto,
				nomeproduto: item.nomeproduto,
				sucesso: false,
				movimentos: 0,
				mensagem: "Quantidade inválida",
			});
			continue;
		}

		const produto = await buscarProdutoPorId(item.idproduto);
		if (!produto || produto.idempresa !== idempresa) {
			itensIgnorados++;
			resultados.push({
				idproduto: item.idproduto,
				nomeproduto: item.nomeproduto,
				sucesso: false,
				movimentos: 0,
				mensagem: "Produto não encontrado na empresa",
			});
			continue;
		}

		const nome = item.nomeproduto ?? produto.nome ?? undefined;

		try {
			let movimentosItem = 0;

			if (
				tipooperacao === TIPO_OPERACAO_AJUSTE.ENTRADA ||
				tipooperacao === TIPO_OPERACAO_AJUSTE.SAIDA
			) {
				if (quantidadeInformada <= 0) {
					itensIgnorados++;
					resultados.push({
						idproduto: item.idproduto,
						nomeproduto: nome,
						sucesso: false,
						movimentos: 0,
						mensagem: "Quantidade deve ser maior que zero",
					});
					continue;
				}

				const ok = await registrarDelta({
					idempresa,
					idproduto: item.idproduto,
					quantidade: quantidadeInformada,
					sentido: tipooperacao,
					tipoestoque,
					idajuste,
					observacao: obsBase,
				});
				if (ok) movimentosItem++;
			} else {
				// Contagem: quantidade = estoque alvo informado no(s) lado(s) selecionado(s).
				const codigo = produto.codigo != null ? String(produto.codigo) : null;
				const saldo = codigo
					? await buscarSaldoEstoquePorCodigoProduto(idempresa, codigo)
					: null;
				const atualOp = parseQtd(saldo?.quantidade);
				const atualFi = parseQtd(saldo?.quantidadefiscal);
				const alvo = quantidadeInformada;

				const deltas: Array<{
					tipo: TipoEstoque;
					quantidade: number;
					sentido: "entrada" | "saida";
				}> = [];

				if (tipoestoque === TIPO_ESTOQUE.OPERACIONAL) {
					const delta = alvo - atualOp;
					if (Math.abs(delta) > 0.0000005) {
						deltas.push({
							tipo: TIPO_ESTOQUE.OPERACIONAL,
							quantidade: Math.abs(delta),
							sentido: delta > 0 ? "entrada" : "saida",
						});
					}
				} else if (tipoestoque === TIPO_ESTOQUE.FISCAL) {
					const delta = alvo - atualFi;
					if (Math.abs(delta) > 0.0000005) {
						deltas.push({
							tipo: TIPO_ESTOQUE.FISCAL,
							quantidade: Math.abs(delta),
							sentido: delta > 0 ? "entrada" : "saida",
						});
					}
				} else {
					const deltaOp = alvo - atualOp;
					const deltaFi = alvo - atualFi;
					const mesmoSentidoEValor =
						Math.abs(deltaOp) > 0.0000005 &&
						Math.abs(deltaOp - deltaFi) < 0.0000005;

					if (mesmoSentidoEValor) {
						deltas.push({
							tipo: TIPO_ESTOQUE.AMBOS,
							quantidade: Math.abs(deltaOp),
							sentido: deltaOp > 0 ? "entrada" : "saida",
						});
					} else {
						if (Math.abs(deltaOp) > 0.0000005) {
							deltas.push({
								tipo: TIPO_ESTOQUE.OPERACIONAL,
								quantidade: Math.abs(deltaOp),
								sentido: deltaOp > 0 ? "entrada" : "saida",
							});
						}
						if (Math.abs(deltaFi) > 0.0000005) {
							deltas.push({
								tipo: TIPO_ESTOQUE.FISCAL,
								quantidade: Math.abs(deltaFi),
								sentido: deltaFi > 0 ? "entrada" : "saida",
							});
						}
					}
				}

				if (deltas.length === 0) {
					itensIgnorados++;
					resultados.push({
						idproduto: item.idproduto,
						nomeproduto: nome,
						sucesso: true,
						movimentos: 0,
						mensagem: "Saldo já confere com a contagem",
					});
					continue;
				}

				for (const delta of deltas) {
					const ok = await registrarDelta({
						idempresa,
						idproduto: item.idproduto,
						quantidade: delta.quantidade,
						sentido: delta.sentido,
						tipoestoque: delta.tipo,
						idajuste,
						observacao: obsBase,
					});
					if (ok) movimentosItem++;
				}
			}

			itensProcessados++;
			movimentosRegistrados += movimentosItem;
			resultados.push({
				idproduto: item.idproduto,
				nomeproduto: nome,
				sucesso: movimentosItem > 0,
				movimentos: movimentosItem,
			});
		} catch (erro) {
			console.error(
				`[estoque] Falha no ajuste do produto ${item.idproduto}:`,
				erro,
			);
			itensIgnorados++;
			resultados.push({
				idproduto: item.idproduto,
				nomeproduto: nome,
				sucesso: false,
				movimentos: 0,
				mensagem:
					erro instanceof Error ? erro.message : "Falha ao registrar ajuste",
			});
		}
	}

	return httpOk({
		idajuste,
		movimentosRegistrados,
		itensProcessados,
		itensIgnorados,
		resultados,
	});
}
