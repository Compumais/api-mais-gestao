import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import {
	buscarEntidadePorId,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import {
	buscarNotaFiscalPorId,
	criarNotaFiscalComItens,
	listarItensPorNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import {
	buscarFaturamentoNfeAtivoPorOrdemServico,
	criarOrdemServicoFaturamento,
} from "@/repositories/ordem-servico-faturamento-repositories.js";
import {
	atualizarOrdemServico,
	buscarOrdemServicoPorIdEempresa,
} from "@/repositories/ordem-servico-repositories.js";
import {
	type FormaPagamentoOs,
	gerarContasReceberOrdemServicoService,
} from "@/service/ordem-servico/gerar-contas-receber-ordem-servico.js";
import { montarItensNfeOrdemServico } from "@/service/ordem-servico/montar-itens-nfe-ordem-servico.js";
import { garantirConfiguracaoOrdemServico } from "@/service/ordem-servico/ordem-servico-helpers.js";
import { montarSnapshotEmissaoNfe } from "@/util/dados-emissao-nfe-nota.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";

type GerarNfeRascunhoOsParametros = {
	ordemServicoId: string;
	idempresa: string;
	idusuario: string;
	idserienfe?: string | undefined;
	formasPagamento?: FormaPagamentoOs[] | undefined;
};

type GerarNfeRascunhoOsResposta = {
	idnotafiscal: string;
	status: number;
	idordemservico: string;
	notaFiscal: NotaFiscal;
	itens: NotaFiscalItem[];
	avisos: string[];
	financeiro?: {
		parcelasGeradas: number;
		titulosExistentes: number;
		lancamentosCaixa: number;
	};
};

export async function gerarNfeRascunhoOrdemServicoService({
	ordemServicoId,
	idempresa,
	idusuario,
	idserienfe,
	formasPagamento,
}: GerarNfeRascunhoOsParametros): Promise<
	HttpResponse<GerarNfeRascunhoOsResposta>
> {
	const os = await buscarOrdemServicoPorIdEempresa(ordemServicoId, idempresa);
	if (!os) return httpNaoEncontrado();

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) return httpProibido();

	if (!os.idcliente) {
		return httpBadRequest("Ordem de serviço sem cliente vinculado");
	}

	const faturamentoAtivo = await buscarFaturamentoNfeAtivoPorOrdemServico(
		ordemServicoId,
		idempresa,
	);
	if (faturamentoAtivo?.idnotafiscal) {
		const notaExistente = await buscarNotaFiscalPorId(
			faturamentoAtivo.idnotafiscal,
		);
		if (notaExistente) {
			const itensExistentes = await listarItensPorNotaFiscal(
				faturamentoAtivo.idnotafiscal,
			);
			const financeiroExistente = await gerarContasReceberOrdemServicoService({
				ordemServicoId,
				idempresa,
				idusuario,
				formasPagamento,
			});
			return httpCriacao({
				idnotafiscal: notaExistente.id,
				status: notaExistente.status ?? NFE_STATUS.PENDENTE,
				idordemservico: ordemServicoId,
				notaFiscal: notaExistente,
				itens: itensExistentes,
				avisos: ["Rascunho NF-e já existente; documento reutilizado"],
				...(financeiroExistente.success && financeiroExistente.body
					? { financeiro: financeiroExistente.body }
					: {}),
			});
		}
	}

	const cliente = await buscarEntidadePorId(os.idcliente);
	if (!cliente || cliente.idempresa !== idempresa) {
		return httpBadRequest("Cliente não encontrado");
	}

	const config = await garantirConfiguracaoOrdemServico(idempresa);
	const { itens, pendencias, itensServicoIgnorados } =
		await montarItensNfeOrdemServico({
			idempresa,
			idordemservico: ordemServicoId,
			config,
			ufCliente: cliente.idestado,
		});

	const pendenciasBloqueantes = pendencias.filter(
		(p) => !p.includes("serviço ignorado"),
	);
	if (pendenciasBloqueantes.length > 0) {
		return httpBadRequest(pendenciasBloqueantes.join("; "));
	}

	if (itens.length === 0) {
		return httpBadRequest(
			itensServicoIgnorados > 0
				? "A OS possui apenas serviços; gere NFS-e para faturar serviços"
				: "Ordem de serviço sem itens de produto válidos para NF-e",
		);
	}

	const agora = new Date().toISOString();
	const idnotafiscal = uuidv4();
	const valorTotal = itens.reduce(
		(acc, item) => acc + item.quantidade * item.valorUnitario,
		0,
	);
	const codigoOs = os.codigo != null ? Number(os.codigo) : undefined;

	// Desconto da OS é do documento inteiro; na NF-e rateia só sobre produtos.
	const descontoOs = parseFloat(os.descontosubtotal ?? "0") || 0;
	const valorOs = parseFloat(os.valor ?? "0") || 0;
	const descontoProdutos =
		descontoOs > 0 && valorOs > 0
			? Number(((descontoOs * valorTotal) / valorOs).toFixed(2))
			: 0;

	const dadosimportacao = montarSnapshotEmissaoNfe({
		idserienfe,
		idordemservico: ordemServicoId,
		codigoOS: codigoOs,
		gerarFinanceiro: false,
		gerarEstoque: false,
		totais: {
			desconto: descontoProdutos,
		},
	});

	const nota: Parameters<typeof criarNotaFiscalComItens>[0] = {
		id: idnotafiscal,
		idempresa,
		identidade: os.idcliente,
		idusuarioinclusao: idusuario,
		datainclusao: agora,
		emissao: agora.substring(0, 10),
		datahoraemissao: agora,
		currenttimemillis: Date.now(),
		modelo: "55",
		tipoorigem: 1,
		status: NFE_STATUS.PENDENTE,
		idcondicaopagto: os.idcondicaopagamento ?? null,
		idtipodocumento: os.idtipodocumentofinanceiro ?? null,
		razaosocial: cliente.razaosocial ?? cliente.nome ?? os.nomecliente,
		cnpjcpf: cliente.cnpjcpf ?? os.cnpjcpfcliente,
		valortotalnota: valorTotal.toFixed(2),
		totalproduto: valorTotal.toFixed(2),
		observacao: `OS: ${os.codigo ?? ordemServicoId.slice(0, 8)}`,
		dadosimportacao,
	};

	const itensPersistencia = itens.map((item, index) => ({
		id: uuidv4(),
		idnotafiscal,
		idproduto: item.idproduto ?? null,
		descricao: item.descricao,
		quantidade: item.quantidade.toFixed(4),
		precounitario: item.valorUnitario.toFixed(6),
		total: (item.quantidade * item.valorUnitario).toFixed(2),
		cfop: item.cfop,
		ncm: item.ncm,
		unidade: item.unidade,
		situacaotributaria: item.cst ?? item.csosn ?? null,
		origem: item.orig ?? 0,
		contador: index + 1,
		tipo: "P",
		currenttimemillis: Date.now(),
	}));

	const resultado = await criarNotaFiscalComItens(nota, itensPersistencia);
	if (!resultado.notaFiscal) {
		return httpBadRequest("Falha ao criar NF-e pendente");
	}

	await criarOrdemServicoFaturamento({
		id: uuidv4(),
		idempresa,
		idordemservico: ordemServicoId,
		idnotafiscal,
		datacriacao: agora,
		dataalteracao: agora,
	});

	await atualizarOrdemServico(ordemServicoId, idempresa, {
		iddocumentofiscal: idnotafiscal,
		faturouparanota: 1,
	});

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
	const avisos = pendencias.filter((p) => p.includes("serviço ignorado"));
	if (!resultadoFinanceiro.success) {
		avisos.push(
			typeof resultadoFinanceiro.error === "string"
				? `Financeiro não gerado: ${resultadoFinanceiro.error}`
				: "Financeiro não gerado; revise a forma de pagamento da OS",
		);
	}

	return httpCriacao({
		idnotafiscal,
		status: NFE_STATUS.PENDENTE,
		idordemservico: ordemServicoId,
		notaFiscal: resultado.notaFiscal,
		itens: resultado.itens,
		avisos,
		...(resultadoFinanceiro.success && resultadoFinanceiro.body
			? { financeiro: resultadoFinanceiro.body }
			: {}),
	});
}
