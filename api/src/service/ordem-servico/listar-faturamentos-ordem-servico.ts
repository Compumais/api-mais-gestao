import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarFaturamentosPorOrdemServico } from "@/repositories/ordem-servico-faturamento-repositories.js";
import { listarItensPorOrdemServico } from "@/repositories/ordem-servico-item-repositories.js";
import { buscarOrdemServicoPorIdEempresa } from "@/repositories/ordem-servico-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type FaturamentoOrdemServico = Awaited<
	ReturnType<typeof listarFaturamentosPorOrdemServico>
>[number];

type ListarFaturamentosOrdemServicoResposta = {
	data: FaturamentoOrdemServico[];
	resumo: {
		possuiProdutos: boolean;
		possuiServicos: boolean;
		quantidadeProdutos: number;
		quantidadeServicos: number;
		valorProdutos: string;
		valorServicos: string;
		valorTotal: string;
		idNfe: string | null;
		statusNfe: number | null;
		idNfse: string | null;
		statusNfse: number | null;
		financeiroGerado: boolean;
	};
};

export async function listarFaturamentosOrdemServicoService(params: {
	ordemServicoId: string;
	idempresa: string;
	idusuario: string;
}): Promise<HttpResponse<ListarFaturamentosOrdemServicoResposta>> {
	const os = await buscarOrdemServicoPorIdEempresa(
		params.ordemServicoId,
		params.idempresa,
	);
	if (!os) return httpNaoEncontrado();

	const ok = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!ok) return httpProibido();

	const faturamentos = await listarFaturamentosPorOrdemServico(
		params.ordemServicoId,
		params.idempresa,
	);
	const itens = await listarItensPorOrdemServico(
		params.ordemServicoId,
		params.idempresa,
	);
	const itensAtivos = itens.filter((item) => item.cancelado !== 1);
	const itensProduto = itensAtivos.filter((item) => item.tipoproduto !== "S");
	const itensServico = itensAtivos.filter((item) => item.tipoproduto === "S");
	const nfe = faturamentos.find(
		(item) => item.idnotafiscal && item.modelonotafiscal === "55",
	);
	const nfse = faturamentos.find(
		(item) => item.idnotafiscal && item.modelonotafiscal === "NFS",
	);

	return httpOk({
		data: faturamentos,
		resumo: {
			possuiProdutos: itensProduto.length > 0,
			possuiServicos: itensServico.length > 0,
			quantidadeProdutos: itensProduto.length,
			quantidadeServicos: itensServico.length,
			valorProdutos: os.valorprodutos ?? "0.00",
			valorServicos: os.valorservicos ?? "0.00",
			valorTotal: os.valor ?? "0.00",
			idNfe: nfe?.idnotafiscal ?? null,
			statusNfe: nfe?.statusnotafiscal ?? null,
			idNfse: nfse?.idnotafiscal ?? null,
			statusNfse: nfse?.statusnotafiscal ?? null,
			financeiroGerado:
				os.geroufinanceiro === 1 ||
				faturamentos.some((item) => Boolean(item.idfaturamento)),
		},
	});
}
