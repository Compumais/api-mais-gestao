import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarPrimeiroLocalEstoqueEmpresa } from "@/repositories/local-estoque-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalPorId,
	listarItensPorNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	gerarContasReceberNfService,
	type FormaPagamentoNfVenda,
} from "@/service/nota-fiscal/gerar-contas-receber-nf.js";
import { registrarMovimentosEstoqueNf } from "@/service/nota-fiscal/registrar-movimentos-estoque-nf.js";
import {
	FIN_NFE_DEVOLUCAO,
	resolverTipoDevolucaoEmissao,
} from "@/util/cfop-devolucao-emissao-nfe.js";
import { extrairDadosEmissaoNfeSalvos } from "@/util/dados-emissao-nfe-nota.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";

export type IntegrarNotaFiscalVendaAutorizadaParametros = {
	idusuario: string;
	idnotafiscal: string;
	gerarFinanceiro?: boolean | undefined;
	gerarEstoque?: boolean | undefined;
};

export type ResultadoIntegracaoNotaFiscalVenda = {
	parcelasGeradas: number;
	lancamentosCaixa: number;
	movimentosGerados: number;
	avisos: string[];
};

export async function integrarNotaFiscalVendaAutorizadaService({
	idusuario,
	idnotafiscal,
	gerarFinanceiro: gerarFinanceiroParam,
	gerarEstoque: gerarEstoqueParam,
}: IntegrarNotaFiscalVendaAutorizadaParametros): Promise<
	HttpResponse<ResultadoIntegracaoNotaFiscalVenda>
> {
	const nota = await buscarNotaFiscalPorId(idnotafiscal);

	if (!nota) {
		return httpBadRequest("Nota fiscal não encontrada");
	}

	if (nota.tipoorigem !== 1) {
		return httpBadRequest("Integração operacional disponível apenas para NF-e de venda");
	}

	if (nota.status !== NFE_STATUS.AUTORIZADA) {
		return httpBadRequest("Integração operacional exige NF-e autorizada");
	}

	const emissaoSalva = extrairDadosEmissaoNfeSalvos(nota.dadosimportacao);
	const gerarFinanceiro = gerarFinanceiroParam ?? emissaoSalva?.gerarFinanceiro ?? true;
	const gerarEstoque = gerarEstoqueParam ?? emissaoSalva?.gerarEstoque ?? true;

	const avisos: string[] = [];
	let parcelasGeradas = 0;
	let lancamentosCaixa = 0;
	let movimentosGerados = 0;
	const agora = new Date().toISOString();

	const itens = await listarItensPorNotaFiscal(idnotafiscal);

	if (gerarEstoque) {
		const localEstoque =
			nota.idlocalestoque ??
			(await buscarPrimeiroLocalEstoqueEmpresa(nota.idempresa))?.id;

		const tipoDevolucao = await resolverTipoDevolucaoEmissao(
			nota.idempresa,
			itens.map((item) => item.cfop ?? ""),
		);

		const finDevolucao = nota.finalidadeemissaonfe === FIN_NFE_DEVOLUCAO;
		let sentido: "entrada" | "saida" = "saida";

		if (finDevolucao && tipoDevolucao === "venda") {
			sentido = "entrada";
		} else if (finDevolucao && tipoDevolucao === "compra") {
			sentido = "saida";
		}

		try {
			const resultadoEstoque = await registrarMovimentosEstoqueNf({
				idempresa: nota.idempresa,
				idnotafiscal,
				idlocalestoque: localEstoque ?? undefined,
				dataMovimento: nota.emissao ?? agora,
				sentido,
				itens: itens
					.filter((item) => item.idproduto)
					.map((item) => ({
						iditem: item.id,
						idproduto: item.idproduto as string,
						quantidade: item.quantidade ?? "0",
						custoUnitario: item.custoaquisicao ?? item.precounitario ?? "0",
					})),
			});

			movimentosGerados = resultadoEstoque.movimentosCriados;
			avisos.push(...resultadoEstoque.avisos);
		} catch (erro) {
			console.error("Erro ao registrar movimentos de estoque da NF venda:", erro);
			avisos.push("Falha ao registrar movimentos de estoque");
		}
	}

	const valorTotal = parseFloat(nota.valortotalnota ?? "0");
	const formaPagamentoXml = emissaoSalva?.formaPagamento ?? "01";
	const semPagamento = formaPagamentoXml === "90";

	if (gerarFinanceiro && valorTotal > 0 && !semPagamento) {
		try {
			const formasPagamento: FormaPagamentoNfVenda[] | undefined =
				emissaoSalva?.formasPagamento?.map((forma) => ({
					idtipodocumentofinanceiro: forma.idtipodocumentofinanceiro,
					valor: forma.valor,
					indPag: forma.indPag,
				}));

			const resultadoFinanceiro = await gerarContasReceberNfService({
				idempresa: nota.idempresa,
				idnotafiscal,
				idusuario,
				identidade: nota.identidade ?? undefined,
				idcondicaopagto: nota.idcondicaopagto ?? undefined,
				idtipodocumento: nota.idtipodocumento ?? undefined,
				idplanocontas: nota.idplanocontas ?? undefined,
				valortotalnota: nota.valortotalnota ?? "0",
				emissao: nota.emissao ?? agora,
				numero: nota.numeronotafiscal ?? nota.numero ?? undefined,
				serie: nota.serie ?? undefined,
				chavenfe: nota.chavenfe ?? undefined,
				razaosocial: nota.razaosocial ?? undefined,
				formasPagamento,
			});

			if (resultadoFinanceiro.success && resultadoFinanceiro.body) {
				parcelasGeradas = resultadoFinanceiro.body.parcelasGeradas;
				lancamentosCaixa = resultadoFinanceiro.body.lancamentosCaixa;
			} else if (!resultadoFinanceiro.success && resultadoFinanceiro.error) {
				avisos.push(String(resultadoFinanceiro.error));
			}
		} catch (erro) {
			console.error("Erro ao gerar contas a receber da NF venda:", erro);
			avisos.push("Falha ao gerar contas a receber");
		}
	}

	const integracaoSnapshot = {
		financeiroGeradoEm: gerarFinanceiro ? agora : undefined,
		estoqueGeradoEm: gerarEstoque ? agora : undefined,
		parcelasGeradas,
		lancamentosCaixa,
		movimentosGerados,
		avisos: avisos.length > 0 ? avisos : undefined,
	};

	const dadosimportacaoAtual =
		nota.dadosimportacao && typeof nota.dadosimportacao === "object"
			? (nota.dadosimportacao as Record<string, unknown>)
			: {};

	const emissaoAtual =
		dadosimportacaoAtual.emissao &&
		typeof dadosimportacaoAtual.emissao === "object"
			? (dadosimportacaoAtual.emissao as Record<string, unknown>)
			: {};

	await atualizarNotaFiscal(idnotafiscal, {
		dadosimportacao: {
			...dadosimportacaoAtual,
			emissao: {
				...emissaoAtual,
				integracao: integracaoSnapshot,
			},
		},
	});

	try {
		await criarAuditoriaService({
			id: uuidv4(),
			acao: "integrar_nota_fiscal_venda",
			idusuario,
			recurso: "nota_fiscal",
			idrecurso: idnotafiscal,
			idempresa: nota.idempresa,
			criadoem: agora,
			metadados: integracaoSnapshot,
		});
	} catch (erro) {
		console.error("Erro ao registrar auditoria da integração NF venda:", erro);
	}

	return httpOk({
		parcelasGeradas,
		lancamentosCaixa,
		movimentosGerados,
		avisos,
	});
}
