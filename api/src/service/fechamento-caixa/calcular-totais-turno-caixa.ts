import type { FechamentoCaixa } from "@/model/fechamento-caixa-model.js";
import { buscarContaMesaPorId } from "@/repositories/conta-mesa-repositories.js";
import { listarTodasVendasPdvGourmetTurno } from "@/repositories/venda-pdv-gourmet-repositories.js";
import { listarVendasPdvItem } from "@/repositories/venda-pdv-item-repositories.js";
import {
	extrairPagamentosResumo,
	pagamentosResumoVazio,
	somarPagamentosResumo,
	type PagamentosResumo,
} from "@/util/pagamentos-pdv-util.js";
import { parseValorMonetario } from "@/util/recebimentos-venda-util.js";

export type TotaisTurnoCaixa = {
	dinheiro: number;
	pix: number;
	qtdVendas: number;
};

async function somarItensVenda(
	idempresa: string,
	idvenda: string,
): Promise<number> {
	let total = 0;
	let page = 1;
	const limit = 100;

	while (true) {
		const { itens, total: totalItens } = await listarVendasPdvItem({
			idempresa,
			idvenda,
			page,
			limit,
		});

		for (const item of itens) {
			total += parseValorMonetario(item.precototal);
		}

		const totalPages = Math.ceil(totalItens / limit);
		if (page >= totalPages || itens.length < limit) {
			break;
		}

		page += 1;
	}

	return total;
}

async function resolverPagamentosVenda(
	venda: Awaited<ReturnType<typeof listarTodasVendasPdvGourmetTurno>>[number],
	contasPorId: Map<
		string,
		NonNullable<Awaited<ReturnType<typeof buscarContaMesaPorId>>>
	>,
): Promise<PagamentosResumo> {
	if (venda.idcontamesa) {
		const conta = contasPorId.get(venda.idcontamesa);
		if (conta) {
			return extrairPagamentosResumo(conta);
		}
	}

	const temPagamentoNaVenda =
		venda.valordinheiro != null ||
		venda.valorcartao != null ||
		venda.valorpix != null ||
		venda.valorprepago != null ||
		venda.valortotal != null;

	if (temPagamentoNaVenda) {
		return extrairPagamentosResumo(venda);
	}

	const totalItens = await somarItensVenda(venda.idempresa, venda.id);
	return {
		dinheiro: totalItens,
		cartao: 0,
		pix: 0,
		prepago: 0,
		total: totalItens,
	};
}

export async function calcularTotaisTurnoCaixa(
	fechamento: FechamentoCaixa,
): Promise<TotaisTurnoCaixa> {
	if (fechamento.pdv == null) {
		return { dinheiro: 0, pix: 0, qtdVendas: 0 };
	}

	const dataInicio = fechamento.datacriacao ?? fechamento.datahora ?? null;
	const inicioMs = dataInicio ? new Date(dataInicio).getTime() : null;

	const vendasBrutas = await listarTodasVendasPdvGourmetTurno({
		idempresa: fechamento.idempresa,
		numeropdv: fechamento.pdv,
		dataInicio,
	});

	const vendas = vendasBrutas.filter((venda) => {
		if (inicioMs == null || !venda.datacriacao) return true;
		return new Date(venda.datacriacao).getTime() >= inicioMs;
	});

	const contaIds = [
		...new Set(
			vendas
				.map((venda) => venda.idcontamesa)
				.filter((id): id is string => !!id),
		),
	];

	const contasPorId = new Map<
		string,
		NonNullable<Awaited<ReturnType<typeof buscarContaMesaPorId>>>
	>();

	await Promise.all(
		contaIds.map(async (id) => {
			const conta = await buscarContaMesaPorId(id);
			if (conta) {
				contasPorId.set(id, conta);
			}
		}),
	);

	let pagamentos = pagamentosResumoVazio();

	for (const venda of vendas) {
		const pagamentoVenda = await resolverPagamentosVenda(venda, contasPorId);
		pagamentos = somarPagamentosResumo(pagamentos, pagamentoVenda);
	}

	return {
		dinheiro: pagamentos.dinheiro,
		pix: pagamentos.pix,
		qtdVendas: vendas.length,
	};
}
