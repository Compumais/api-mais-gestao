import { v4 as uuidv4 } from "uuid";
import type { ContaMesa } from "@/model/conta-mesa-model.js";
import type { ContaMesaItem } from "@/model/conta-mesa-item-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import type { LancamentoPagamentoPdv } from "@/model/venda-pdv-pagamento-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarContaMesa,
	buscarContaMesaPorId,
} from "@/repositories/conta-mesa-repositories.js";
import {
	buscarItensPorIds,
	contarItensPendentes,
	listarItensPendentesPorConta,
	marcarItensComoPagos,
} from "@/repositories/conta-mesa-item-repositories.js";
import { criarVendaPdvItem } from "@/repositories/venda-pdv-item-repositories.js";
import { excluirVendaPdvGourmet } from "@/repositories/venda-pdv-gourmet-repositories.js";
import { criarVendaPdvGourmetService } from "@/service/venda-pdv-gourmet/criar-venda-pdv-gourmet.js";
import {
	type PagamentoErpVendaPdv,
} from "@/service/venda-pdv-gourmet/gerar-contas-receber-venda-pdv.js";
import {
	arredondarMoeda,
	calcularPrecoTotalItem,
	partirPorItens,
	type TotaisContaGourmet,
} from "@/util/conta-gourmet.js";
import {
	httpErro,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import {
	normalizarValorPagamentoParaBanco,
	parseValorMonetario,
} from "@/util/recebimentos-venda-util.js";

const STATUS_MESA_ABERTO = 1;

export type FecharFatiaItensPagamento = {
	valordinheiro?: string | undefined;
	valorcartao?: string | undefined;
	valorcartaocredito?: string | undefined;
	valorcartaodebito?: string | undefined;
	valorpix?: string | undefined;
	valorprepago?: string | undefined;
	desconto?: string | undefined;
	valortaxaservico?: string | undefined;
	valorcouverartistico?: string | undefined;
	valortroco?: string | undefined;
	identidade?: string | undefined;
	idcondicaopagto?: string | undefined;
	pagamentosErp?: PagamentoErpVendaPdv[] | undefined;
};

export type FecharFatiaItensContaMesaParametros = {
	contaMesaId: string;
	idusuario: string;
	idempresa: string;
	numeropdv: number;
	idsItens: string[];
	pagamento: FecharFatiaItensPagamento;
	pagamentos?: LancamentoPagamentoPdv[] | undefined;
};

export type FecharFatiaItensContaMesaResultado = {
	venda: VendaPdvGourmet;
	contaFechada: false;
	todosItensPagos: boolean;
	conta: ContaMesa | null;
};

function calcularTroco(total: number, pagamento: FecharFatiaItensPagamento): number {
	const pago =
		parseValorMonetario(pagamento.valordinheiro) +
		parseValorMonetario(pagamento.valorcartaocredito) +
		parseValorMonetario(pagamento.valorcartaodebito) +
		parseValorMonetario(pagamento.valorcartao) +
		parseValorMonetario(pagamento.valorpix) +
		parseValorMonetario(pagamento.valorprepago);
	return Math.max(0, arredondarMoeda(pago - total));
}

function montarTotaisConta(
	itensPendentes: ContaMesaItem[],
	pagamento: FecharFatiaItensPagamento,
	conta: ContaMesa,
): TotaisContaGourmet {
	const subtotal = arredondarMoeda(
		itensPendentes.reduce(
			(acc, item) =>
				acc + calcularPrecoTotalItem(item.quantidade, item.precounitario),
			0,
		),
	);
	const desconto = arredondarMoeda(
		parseValorMonetario(pagamento.desconto) ||
			parseValorMonetario(conta.desconto),
	);
	const taxa = arredondarMoeda(
		parseValorMonetario(pagamento.valortaxaservico) ||
			parseValorMonetario(conta.valortaxaservico),
	);
	const couvert = arredondarMoeda(
		parseValorMonetario(pagamento.valorcouverartistico) ||
			parseValorMonetario(conta.valorcouverartistico),
	);
	const valortotal = arredondarMoeda(
		Math.max(0, subtotal - desconto + taxa + couvert),
	);

	return {
		subtotal,
		valordesconto: desconto,
		valortaxaservico: taxa,
		valorcouvert: couvert,
		valorentrega: 0,
		valortotal,
		numeropessoas: conta.numeropessoas ?? 1,
	};
}

export async function fecharFatiaItensContaMesaService({
	contaMesaId,
	idusuario,
	idempresa,
	numeropdv,
	idsItens,
	pagamento,
	pagamentos,
}: FecharFatiaItensContaMesaParametros): Promise<
	HttpResponse<FecharFatiaItensContaMesaResultado | null>
> {
	if (!idsItens.length) {
		return httpErro();
	}

	const conta = await buscarContaMesaPorId(contaMesaId);

	if (!conta) {
		return httpNaoEncontrado();
	}

	if (conta.status !== STATUS_MESA_ABERTO) {
		return {
			success: false,
			status: 400,
			error: "Conta não está aberta",
			code: "CONTA_NAO_ABERTA",
		};
	}

	if (conta.idempresa !== idempresa) {
		return httpProibido();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const itensPendentes = await listarItensPendentesPorConta(contaMesaId);
	const idsSet = new Set(idsItens);
	const itensFatia = await buscarItensPorIds(idsItens);

	if (itensFatia.length !== idsSet.size) {
		return {
			success: false,
			status: 400,
			error: "Há item inválido na fatia",
			code: "ITEM_INVALIDO",
		};
	}

	for (const item of itensFatia) {
		if (item.idcontamesa !== contaMesaId) {
			return {
				success: false,
				status: 400,
				error: "Item não pertence à conta",
				code: "ITEM_CONTA_INVALIDA",
			};
		}
		if (item.pago === 1) {
			return {
				success: false,
				status: 400,
				error: "Item já foi pago",
				code: "ITEM_JA_PAGO",
			};
		}
	}

	const totaisConta = montarTotaisConta(itensPendentes, pagamento, conta);
	const restoIds = itensPendentes
		.filter((item) => !idsSet.has(item.id))
		.map((item) => item.id);
	const grupos = restoIds.length ? [idsItens, restoIds] : [idsItens];

	const itensParaRateio = itensPendentes.map((item) => ({
		id: item.id,
		precototal: calcularPrecoTotalItem(item.quantidade, item.precounitario),
	}));

	let fatia: ReturnType<typeof partirPorItens>[number];
	try {
		fatia = partirPorItens(itensParaRateio, grupos, totaisConta)[0]!;
	} catch (error) {
		return {
			success: false,
			status: 400,
			error:
				error instanceof Error
					? error.message
					: "Não foi possível calcular a fatia",
			code: "FATIA_INVALIDA",
		};
	}

	const valortroco = calcularTroco(fatia.total, pagamento);
	const vendaId = uuidv4();

	const resultadoVenda = await criarVendaPdvGourmetService({
		dadosVendaPdvGourmet: {
			id: vendaId,
			idempresa,
			idcontamesa: contaMesaId,
			numeropdv,
			usuarioquefechouvenda: idusuario,
			vendalocal: 1,
			valordinheiro: normalizarValorPagamentoParaBanco(pagamento.valordinheiro),
			valorcartaocredito: normalizarValorPagamentoParaBanco(
				pagamento.valorcartaocredito,
			),
			valorcartaodebito: normalizarValorPagamentoParaBanco(
				pagamento.valorcartaodebito,
			),
			valorcartao: normalizarValorPagamentoParaBanco(pagamento.valorcartao),
			valorpix: normalizarValorPagamentoParaBanco(pagamento.valorpix),
			valorprepago: normalizarValorPagamentoParaBanco(pagamento.valorprepago),
			valortroco: valortroco.toFixed(2),
			valortotal: fatia.total.toFixed(2),
			...(pagamento.identidade ? { identidade: pagamento.identidade } : {}),
			...(pagamento.idcondicaopagto
				? { idcondicaopagto: pagamento.idcondicaopagto }
				: {}),
		},
		idusuario,
		pagamentosErp: pagamento.pagamentosErp,
		pagamentos,
	});

	if (!resultadoVenda.success || !resultadoVenda.body) {
		return resultadoVenda as HttpResponse<null>;
	}

	try {
		for (const item of itensFatia) {
			await criarVendaPdvItem({
				id: uuidv4(),
				idempresa,
				idvenda: vendaId,
				idproduto: item.idproduto,
				quantidade: item.quantidade,
				precounitario: item.precounitario,
				precototal: calcularPrecoTotalItem(
					item.quantidade,
					item.precounitario,
				).toFixed(2),
				precopromocao: item.precopromocao,
				precoalterado: item.precoalterado,
				taxaservico: item.taxaservico ?? 0,
			});
		}

		await marcarItensComoPagos(idsItens);

		const pendentesRestantes = await contarItensPendentes(contaMesaId);
		const todosItensPagos = pendentesRestantes === 0;

		const descontoRestante = arredondarMoeda(
			Math.max(0, totaisConta.valordesconto - fatia.desconto),
		);
		const taxaRestante = arredondarMoeda(
			Math.max(0, totaisConta.valortaxaservico - fatia.taxa),
		);
		const couvertRestante = arredondarMoeda(
			Math.max(0, totaisConta.valorcouvert - fatia.couvert),
		);

		const dadosContaAtualizacao = {
			desconto: todosItensPagos
				? "0.00"
				: descontoRestante.toFixed(2),
			valortaxaservico: todosItensPagos
				? "0.00"
				: taxaRestante.toFixed(2),
			valorcouverartistico: todosItensPagos
				? "0.00"
				: couvertRestante.toFixed(2),
			dataalteracao: new Date().toISOString(),
		};

		const contaAtualizada = await atualizarContaMesa(
			contaMesaId,
			dadosContaAtualizacao,
		);

		return httpOk<FecharFatiaItensContaMesaResultado>({
			venda: resultadoVenda.body,
			contaFechada: false,
			todosItensPagos,
			conta: contaAtualizada ?? null,
		});
	} catch (error) {
		await excluirVendaPdvGourmet(vendaId);
		throw error;
	}
}
