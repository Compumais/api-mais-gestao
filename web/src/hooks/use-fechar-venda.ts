"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	calcularPrecoTotalItem,
	calcularTotalComTaxas,
	calcularTotalPago,
	calcularTroco,
	type CarrinhoLocalItem,
	getNumeropdv,
	parseValor,
	STATUS_MESA,
} from "@/lib/gourmet-utils";
import type { ContaMesaItem } from "@/services/conta-mesa-item.service";
import { contaMesaService } from "@/services/conta-mesa.service";
import { vendaPdvGourmetService } from "@/services/venda-pdv-gourmet.service";
import { vendaPdvItemService } from "@/services/venda-pdv-item.service";
import type { FecharContaFormData } from "@/schemas/fechar-conta.schema";
import { baixarEstoqueVenda } from "@/lib/estoque-venda";
import { BaixaEstoqueVendaError } from "@/lib/avaliar-resultado-baixa-estoque";

interface FecharContaParams {
	idempresa: string;
	userId: string;
	idcontamesa: string;
	itens: ContaMesaItem[];
	subtotal: number;
	pagamento: FecharContaFormData;
}

interface FecharVendaRapidaParams {
	idempresa: string;
	userId: string;
	itens: CarrinhoLocalItem[];
	subtotal: number;
	pagamento: FecharContaFormData;
}

async function criarItensVenda(
	idempresa: string,
	idvenda: string,
	itens: Array<{
		idproduto: string;
		quantidade: string;
		precounitario: string;
		taxaservico?: number | null;
	}>,
) {
	for (const item of itens) {
		await vendaPdvItemService.criar({
			idempresa,
			idvenda,
			idproduto: item.idproduto,
			quantidade: item.quantidade,
			precounitario: item.precounitario,
			precototal: calcularPrecoTotalItem(item.quantidade, item.precounitario),
			precopromocao: "0",
			precoalterado: "0",
			taxaservico: item.taxaservico ?? 0,
		});
	}
}

export function useFecharVenda() {
	const queryClient = useQueryClient();

	const fecharContaMutation = useMutation({
		mutationFn: async ({
			idempresa,
			userId,
			idcontamesa,
			itens,
			subtotal,
			pagamento,
		}: FecharContaParams) => {
			const desconto = parseValor(pagamento.desconto);
			const taxaServico = parseValor(pagamento.valortaxaservico);
			const couvert = parseValor(pagamento.valorcouverartistico);
			const valortotal = calcularTotalComTaxas(
				subtotal,
				desconto,
				taxaServico,
				couvert,
			);
			const valortroco = calcularTroco(valortotal, pagamento);

			await contaMesaService.atualizar(idcontamesa, {
				status: STATUS_MESA.FECHADO,
				desconto: desconto.toFixed(2),
				valortaxaservico: taxaServico.toFixed(2),
				valorcouverartistico: couvert.toFixed(2),
				valortotal: valortotal.toFixed(2),
				valordinheiro: parseValor(pagamento.valordinheiro).toFixed(2),
				valorcartao: parseValor(pagamento.valorcartao).toFixed(2),
				valorpix: parseValor(pagamento.valorpix).toFixed(2),
				valorprepago: parseValor(pagamento.valorprepago).toFixed(2),
				valortroco: valortroco.toFixed(2),
				valorpendente: "0",
				usuarioquefechouconta: userId,
			});

			const venda = await vendaPdvGourmetService.criar({
				idempresa,
				idcontamesa,
				numeropdv: getNumeropdv(),
				usuarioquefechouvenda: userId,
				vendalocal: 1,
			});

			await criarItensVenda(idempresa, venda.id, itens);

			const baixa = await baixarEstoqueVenda({
				idempresa,
				idvenda: venda.id,
				itens: itens.map((item) => ({
					idproduto: item.idproduto,
					nomeproduto: item.nomeproduto ?? "",
					quantidade: item.quantidade,
					precounitario: item.precounitario,
				})),
				pagamentos: {
					valordinheiro: pagamento.valordinheiro,
					valorcartao: pagamento.valorcartao,
					valorpix: pagamento.valorpix,
					valorprepago: pagamento.valorprepago,
					valortroco: valortroco.toFixed(2),
					valortotal: valortotal.toFixed(2),
				},
			});

			return { venda, baixa };
		},
		onSuccess: (resultado, variables) => {
			queryClient.invalidateQueries({ queryKey: ["contas-mesa"] });
			queryClient.invalidateQueries({
				queryKey: ["conta-mesa", variables.idcontamesa],
			});
			queryClient.invalidateQueries({
				queryKey: ["conta-mesa-itens", variables.idcontamesa],
			});
			if (resultado.baixa?.emissaoNfce?.emitida) {
				toast.success("Conta fechada e NFC-e emitida!");
			} else if (!resultado.baixa?.deveEmitirNfce) {
				toast.success("Conta fechada com sucesso!");
			}
		},
		onError: (error: Error) => {
			if (error instanceof BaixaEstoqueVendaError) return;
			toast.error(error.message || "Erro ao fechar conta");
		},
	});

	const fecharVendaRapidaMutation = useMutation({
		mutationFn: async ({
			idempresa,
			userId,
			itens,
			subtotal,
			pagamento,
		}: FecharVendaRapidaParams) => {
			if (itens.length === 0) {
				throw new Error("Adicione pelo menos um item à venda");
			}

			const desconto = parseValor(pagamento.desconto);
			const taxaServico = parseValor(pagamento.valortaxaservico);
			const couvert = parseValor(pagamento.valorcouverartistico);
			const valortotal = calcularTotalComTaxas(
				subtotal,
				desconto,
				taxaServico,
				couvert,
			);
			const pago = calcularTotalPago(pagamento);

			if (pago < valortotal) {
				throw new Error("Valor pago é menor que o total da venda");
			}

			const valortroco = calcularTroco(valortotal, pagamento);

			const venda = await vendaPdvGourmetService.criar({
				idempresa,
				numeropdv: getNumeropdv(),
				usuarioquefechouvenda: userId,
				vendalocal: 1,
				valordinheiro: parseValor(pagamento.valordinheiro).toFixed(2),
				valorcartao: parseValor(pagamento.valorcartao).toFixed(2),
				valorpix: parseValor(pagamento.valorpix).toFixed(2),
				valorprepago: parseValor(pagamento.valorprepago).toFixed(2),
				valortroco: valortroco.toFixed(2),
				valortotal: valortotal.toFixed(2),
			});

			await criarItensVenda(idempresa, venda.id, itens);

			const baixa = await baixarEstoqueVenda({
				idempresa,
				idvenda: venda.id,
				itens: itens.map((item) => ({
					idproduto: item.idproduto,
					nomeproduto: item.nomeproduto,
					quantidade: item.quantidade,
					precounitario: item.precounitario,
					codigo: item.codigo,
				})),
				pagamentos: {
					valordinheiro: pagamento.valordinheiro,
					valorcartao: pagamento.valorcartao,
					valorpix: pagamento.valorpix,
					valorprepago: pagamento.valorprepago,
					valortroco: valortroco.toFixed(2),
					valortotal: valortotal.toFixed(2),
				},
			});

			return { venda, baixa };
		},
		onSuccess: (resultado) => {
			if (resultado.baixa?.emissaoNfce?.emitida) {
				toast.success("Venda finalizada e NFC-e emitida!");
			} else if (!resultado.baixa?.deveEmitirNfce) {
				toast.success("Venda finalizada com sucesso!");
			}
		},
		onError: (error: Error) => {
			if (error instanceof BaixaEstoqueVendaError) return;
			toast.error(error.message || "Erro ao finalizar venda");
		},
	});

	return {
		fecharConta: fecharContaMutation,
		fecharVendaRapida: fecharVendaRapidaMutation,
	};
}
