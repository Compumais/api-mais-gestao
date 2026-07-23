import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { DadosImportacaoNota } from "@/model/nota-fiscal-importacao-model.js";
import type { NotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarPrimeiroLocalEstoqueEmpresa } from "@/repositories/local-estoque-repositories.js";
import {
	atualizarItemNotaFiscal,
	atualizarNotaFiscal,
	buscarNotaFiscalPorId,
	listarItensPorNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { listarMovimentosEstoquePorDocumento } from "@/repositories/movimento-estoque-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { estornarIntegracaoNotaFiscalCompraService } from "@/service/nota-fiscal/estornar-integracao-nota-fiscal-compra.js";
import { gerarContasPagarNfService } from "@/service/nota-fiscal/gerar-contas-pagar-nf.js";
import { registrarMovimentosEstoqueNf } from "@/service/nota-fiscal/registrar-movimentos-estoque-nf.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import {
	STATUS_NF_COMPRA_CANCELADA,
	STATUS_NF_CONFIRMADA,
	STATUS_RASCUNHO_IMPORTACAO,
} from "@/util/nota-fiscal-constants.js";
import { idOpcionalOuNulo, numeroOpcionalOuNulo } from "@/util/texto-util.js";

export type ItemAtualizacaoNotaFiscalCompra = {
	id: string;
	descricao?: string | null | undefined;
	quantidade?: string | null | undefined;
	precounitario?: string | null | undefined;
	total?: string | null | undefined;
	idcfop?: string | null | undefined;
	cfop?: string | null | undefined;
	idncm?: string | null | undefined;
	ncm?: string | null | undefined;
	idunidademedida?: string | null | undefined;
	unidade?: string | null | undefined;
	idproduto?: string | null | undefined;
	desconto?: string | null | undefined;
};

type AtualizarNotaFiscalCompraParametros = {
	notaFiscalId: string;
	idusuario: string;
	idempresa: string;
	dados: {
		identidade?: string | null | undefined;
		numero?: string | null | undefined;
		serie?: string | null | undefined;
		modelo?: string | null | undefined;
		chavenfe?: string | null | undefined;
		emissao?: string | null | undefined;
		entradasaida?: string | null | undefined;
		idcfop?: string | null | undefined;
		idplanocontas?: string | null | undefined;
		idcondicaopagto?: string | null | undefined;
		idtipodocumento?: string | null | undefined;
		valortotalnota?: string | null | undefined;
		totalproduto?: string | null | undefined;
		frete?: string | null | undefined;
		seguro?: string | null | undefined;
		outrasdespesas?: string | null | undefined;
		descontoproduto?: string | null | undefined;
		observacao?: string | null | undefined;
		itens?: ItemAtualizacaoNotaFiscalCompra[] | undefined;
		reintegrarEstoqueFinanceiro?: boolean | undefined;
	};
};

type AtualizarNotaFiscalCompraResposta = {
	notaFiscal: NotaFiscal;
	itens: NotaFiscalItem[];
	avisos: string[];
};

export async function atualizarNotaFiscalCompraService({
	notaFiscalId,
	idusuario,
	idempresa,
	dados,
}: AtualizarNotaFiscalCompraParametros): Promise<
	HttpResponse<AtualizarNotaFiscalCompraResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const nota = await buscarNotaFiscalPorId(notaFiscalId);

	if (!nota || nota.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	if (nota.tipoorigem !== 0 && nota.tipoorigem !== null) {
		return httpBadRequest("Esta rota atualiza apenas notas fiscais de compra");
	}

	if (nota.status === STATUS_RASCUNHO_IMPORTACAO) {
		return httpBadRequest(
			"Use as rotas de rascunho para editar importações pendentes",
		);
	}

	if (nota.status === STATUS_NF_COMPRA_CANCELADA) {
		return httpBadRequest("Nota fiscal de compra cancelada não pode ser editada");
	}

	const itensAtuais = await listarItensPorNotaFiscal(notaFiscalId);
	const avisos: string[] = [];
	const agora = new Date().toISOString();

	const notaAtualizada = await atualizarNotaFiscal(notaFiscalId, {
		identidade: idOpcionalOuNulo(dados.identidade) ?? undefined,
		numero: dados.numero ?? undefined,
		serie: dados.serie ?? undefined,
		modelo: dados.modelo ?? undefined,
		chavenfe: dados.chavenfe ?? undefined,
		emissao: dados.emissao ?? undefined,
		entradasaida: dados.entradasaida ?? undefined,
		idcfop: idOpcionalOuNulo(dados.idcfop) ?? undefined,
		idplanocontas: idOpcionalOuNulo(dados.idplanocontas) ?? undefined,
		idcondicaopagto: idOpcionalOuNulo(dados.idcondicaopagto) ?? undefined,
		idtipodocumento: idOpcionalOuNulo(dados.idtipodocumento) ?? undefined,
		valortotalnota: numeroOpcionalOuNulo(dados.valortotalnota) ?? undefined,
		totalproduto: numeroOpcionalOuNulo(dados.totalproduto) ?? undefined,
		frete: numeroOpcionalOuNulo(dados.frete) ?? undefined,
		seguro: numeroOpcionalOuNulo(dados.seguro) ?? undefined,
		outrasdespesas: numeroOpcionalOuNulo(dados.outrasdespesas) ?? undefined,
		descontoproduto: numeroOpcionalOuNulo(dados.descontoproduto) ?? undefined,
		observacao: dados.observacao ?? undefined,
		idusuarioalteracao: idusuario,
		dataalteracao: agora,
		currenttimemillis: Date.now(),
	});

	if (!notaAtualizada) {
		return httpNaoEncontrado();
	}

	const itensAtualizados: NotaFiscalItem[] = [];

	if (dados.itens && dados.itens.length > 0) {
		const idsValidos = new Set(itensAtuais.map((item) => item.id));

		for (const itemDados of dados.itens) {
			if (!idsValidos.has(itemDados.id)) {
				return httpBadRequest(`Item ${itemDados.id} não pertence à nota`);
			}

			const itemAtualizado = await atualizarItemNotaFiscal(itemDados.id, {
				descricao: itemDados.descricao ?? undefined,
				quantidade: numeroOpcionalOuNulo(itemDados.quantidade) ?? undefined,
				precounitario: numeroOpcionalOuNulo(itemDados.precounitario) ?? undefined,
				total: numeroOpcionalOuNulo(itemDados.total) ?? undefined,
				idcfop: idOpcionalOuNulo(itemDados.idcfop) ?? undefined,
				cfop: itemDados.cfop ?? undefined,
				idncm: idOpcionalOuNulo(itemDados.idncm) ?? undefined,
				ncm: itemDados.ncm ?? undefined,
				idunidademedida: idOpcionalOuNulo(itemDados.idunidademedida) ?? undefined,
				unidade: itemDados.unidade ?? undefined,
				idproduto: idOpcionalOuNulo(itemDados.idproduto) ?? undefined,
				desconto: numeroOpcionalOuNulo(itemDados.desconto) ?? undefined,
			});

			if (itemAtualizado) {
				itensAtualizados.push(itemAtualizado);
			}
		}
	}

	const itensFinais =
		itensAtualizados.length > 0
			? await listarItensPorNotaFiscal(notaFiscalId)
			: itensAtuais;

	const deveReintegrar =
		dados.reintegrarEstoqueFinanceiro !== false &&
		(nota.status === STATUS_NF_CONFIRMADA ||
			nota.status === null ||
			nota.status === undefined);

	if (deveReintegrar) {
		const movimentos = await listarMovimentosEstoquePorDocumento(notaFiscalId);
		const movimentosAtivos = movimentos.filter((m) => m.cancelado !== 1);
		const tinhaIntegracao = movimentosAtivos.length > 0;

		if (tinhaIntegracao || nota.status === STATUS_NF_CONFIRMADA) {
			const estorno = await estornarIntegracaoNotaFiscalCompraService({
				idusuario,
				idnotafiscal: notaFiscalId,
				bloquearBaixaParcial: true,
			});

			if (!estorno.success) {
				return {
					success: false,
					status: estorno.status,
					error: estorno.error,
				} as HttpResponse<AtualizarNotaFiscalCompraResposta>;
			}

			avisos.push(...(estorno.body?.avisos ?? []));

			const localEstoque =
				nota.idlocalestoque ??
				movimentosAtivos[0]?.idlocalestoque ??
				(await buscarPrimeiroLocalEstoqueEmpresa(idempresa))?.id;

			if (localEstoque) {
				const itensEstoque = itensFinais
					.filter((item) => item.idproduto)
					.map((item) => ({
						iditem: item.id,
						idproduto: item.idproduto as string,
						quantidade: item.quantidade ?? "0",
						custoUnitario:
							item.custoaquisicao ?? item.precounitario ?? "0",
					}));

				const resultadoEstoque = await registrarMovimentosEstoqueNf({
					idempresa,
					idnotafiscal: notaFiscalId,
					idlocalestoque: localEstoque,
					dataMovimento: notaAtualizada.entradasaida ?? agora,
					sentido: "entrada",
					itens: itensEstoque,
				});
				avisos.push(...resultadoEstoque.avisos);
			}

			const dadosImportacao =
				(notaAtualizada.dadosimportacao as DadosImportacaoNota | null) ?? {};
			const valorTotal =
				notaAtualizada.valortotalnota ??
				notaAtualizada.totalproduto ??
				"0";

			if (
				notaAtualizada.idcondicaopagto ||
				(dadosImportacao.duplicatas && dadosImportacao.duplicatas.length > 0)
			) {
				const financeiro = await gerarContasPagarNfService({
					idempresa,
					idnotafiscal: notaFiscalId,
					identidade: notaAtualizada.identidade ?? undefined,
					idcondicaopagto: notaAtualizada.idcondicaopagto ?? undefined,
					duplicatas: dadosImportacao.duplicatas,
					idtipodocumento: notaAtualizada.idtipodocumento ?? undefined,
					idplanocontas: notaAtualizada.idplanocontas ?? undefined,
					valortotalnota: valorTotal,
					emissao:
						notaAtualizada.emissao ??
						notaAtualizada.entradasaida ??
						agora.substring(0, 10),
					numero: notaAtualizada.numero ?? undefined,
					serie: notaAtualizada.serie ?? undefined,
					chavenfe: notaAtualizada.chavenfe ?? undefined,
					razaosocial: notaAtualizada.razaosocial ?? undefined,
				});

				if (!financeiro.success) {
					avisos.push(
						typeof financeiro.error === "string"
							? financeiro.error
							: "Falha ao regenerar contas a pagar",
					);
				}
			}

			if (notaAtualizada.status !== STATUS_NF_CONFIRMADA) {
				await atualizarNotaFiscal(notaFiscalId, {
					status: STATUS_NF_CONFIRMADA,
				});
			}
		}
	}

	try {
		await criarAuditoriaService({
			id: uuidv4(),
			acao: "atualizar_nota_fiscal_compra",
			idusuario,
			recurso: "nota_fiscal",
			idrecurso: notaFiscalId,
			idempresa,
			criadoem: agora,
			metadados: {
				itensAtualizados: itensAtualizados.length,
				reintegrado: deveReintegrar,
			},
		});
	} catch (erro) {
		console.error("Erro ao registrar auditoria de atualização NF compra:", erro);
	}

	const notaFinal = (await buscarNotaFiscalPorId(notaFiscalId)) ?? notaAtualizada;

	return httpOk({
		notaFiscal: notaFinal,
		itens: itensFinais,
		avisos,
	});
}
