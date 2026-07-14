import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	DadosImportacaoItem,
	DadosImportacaoNota,
	RastroTributacaoSaidaImportacao,
} from "@/model/nota-fiscal-importacao-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import type { NotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarPrimeiroLocalEstoqueEmpresa } from "@/repositories/local-estoque-repositories.js";
import {
	buscarNotaFiscalPorChaveNfe,
	buscarNotaFiscalRascunhoPorId,
	excluirNotaFiscal,
	finalizarRascunhoNotaFiscal,
	listarItensPorNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { vincularProdutoFornecedorSeNaoExistir } from "@/repositories/produto-fornecedor-repositories.js";
import { atualizarProduto, buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { registrarCustosNfService } from "@/service/custo-produto/registrar-custos-nf.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { gerarContasPagarNfService } from "@/service/nota-fiscal/gerar-contas-pagar-nf.js";
import {
	montarDadosProdutoNfImportacao,
	parseQuantidadePadraoImportacao,
	resolverTipoprodutoPorCfopEntrada,
} from "@/service/nota-fiscal/montar-dados-produto-nf-importacao.js";
import { registrarMovimentosEstoqueNf } from "@/service/nota-fiscal/registrar-movimentos-estoque-nf.js";
import { validarEanProdutoNf } from "@/service/nota-fiscal/validar-ean-produto-nf.js";
import { vincularOuCriarFornecedorNf } from "@/service/nota-fiscal/vincular-ou-criar-fornecedor-nf.js";
import {
	criarProdutoParaNf,
	montarAtualizacaoProdutoNf,
} from "@/service/nota-fiscal/vincular-ou-criar-produto.js";
import { resolverCfopSaidaDeEntrada } from "@/service/nota-fiscal/importacao/resolver-referencias-importacao.js";
import { aplicarParametrizacaoTributosProduto } from "@/service/parametrizacao-tributos/aplicar-parametrizacao-tributos-produto.js";
import { calcularTotalItemXmlImportacao } from "@/util/calculo-importacao-nf.js";
import {
	calcularCustoContabilItem,
	calcularRateioItensImportacaoNf,
	montarItemCustoNfFromImportacao,
} from "@/util/calcular-rateio-custo-nf.js";
import { obterFlagsCreditoItemImportacao } from "@/util/cfop-depara-util.js";
import {
	mensagemInconsistenciaCfopEntrada,
	validarCoerenciaCfopEntradaItem,
} from "@/util/cfop-entrada-validacao.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { montarSnapshotImportacaoItem } from "@/util/montar-snapshot-importacao-nf.js";
import { numeroOpcionalOuNulo, truncarTexto } from "@/util/texto-util.js";
import {
	normalizarDataRastro,
	obterLotePrincipalItem,
} from "@/util/rastro-importacao-nf.js";
import {
	mesclarSugestaoTributacaoSaidaProduto,
	sugerirTributacaoSaidaProdutoNf,
} from "@/util/sugerir-tributacao-saida-produto-nf.js";
import {
	STATUS_NF_CONFIRMADA,
	STATUS_RASCUNHO_IMPORTACAO,
} from "@/util/nota-fiscal-constants.js";
import { obterConfigRegimeImportacaoNf } from "@/util/regime-tributario-empresa.js";

type FinalizarRascunhoImportacaoNfParametros = {
	idusuario: string;
	idempresa: string;
	idRascunho: string;
	gerarCustos?: boolean | undefined;
	gerarFinanceiro?: boolean | undefined;
};

type FinalizarRascunhoImportacaoNfResposta = {
	notaFiscal: NotaFiscal;
	itens: NotaFiscalItem[];
};

function itemResolvido(dados: DadosImportacaoItem): boolean {
	if (dados.statusVinculo === "vinculado") {
		return !!dados.idproduto;
	}

	if (dados.statusVinculo === "novo") {
		return true;
	}

	return false;
}

async function validarItensRascunho(
	itens: Array<{
		dadosimportacao: DadosImportacaoItem | null;
		contador: number | null;
		cfop: string | null;
		idcfop?: string | null;
	}>,
): Promise<string[]> {
	const pendencias: string[] = [];

	for (const item of itens) {
		const dados = item.dadosimportacao;

		if (!dados) {
			pendencias.push(`Item ${item.contador ?? "?"}: dados de importação ausentes`);
			continue;
		}

		if (!itemResolvido(dados)) {
			pendencias.push(
				`Item ${item.contador ?? "?"} (${dados.descricaoFornecedor}): produto pendente de vínculo ou cadastro`,
			);
			continue;
		}

		const qtdEstoque = parseFloat(dados.quantidadeEstoque);
		if (Number.isNaN(qtdEstoque) || qtdEstoque <= 0) {
			pendencias.push(
				`Item ${item.contador ?? "?"}: quantidade de estoque inválida`,
			);
		}

		const precoEstoque = parseFloat(dados.precounitarioEstoque);
		if (Number.isNaN(precoEstoque) || precoEstoque < 0) {
			pendencias.push(
				`Item ${item.contador ?? "?"}: preço unitário de estoque inválido`,
			);
		}

		let codigoCfopEntrada = item.cfop;
		if (dados.idcfop && !codigoCfopEntrada) {
			const cfop = await buscarCfopPorId(dados.idcfop);
			codigoCfopEntrada = cfop?.codigo ?? null;
		}

		const inconsistenciaCfop = validarCoerenciaCfopEntradaItem({
			idcfop: dados.idcfop,
			codigoCfopEntrada,
			tributacao: dados.tributacao,
		});

		if (inconsistenciaCfop) {
			pendencias.push(
				`Item ${item.contador ?? "?"} (${dados.descricaoFornecedor}): ${mensagemInconsistenciaCfopEntrada(inconsistenciaCfop)}`,
			);
		}

		if (dados.statusVinculo === "novo" && !dados.idgrupo) {
			pendencias.push(
				`Item ${item.contador ?? "?"} (${dados.descricaoFornecedor}): informe o grupo do produto`,
			);
		}

		if (dados.statusVinculo === "novo" && !dados.idunidademedida) {
			pendencias.push(
				`Item ${item.contador ?? "?"} (${dados.descricaoFornecedor}): informe a unidade de medida do produto`,
			);
		}
	}

	return pendencias;
}

export async function finalizarRascunhoImportacaoNfService({
	idusuario,
	idempresa,
	idRascunho,
	gerarCustos = true,
	gerarFinanceiro = true,
}: FinalizarRascunhoImportacaoNfParametros): Promise<
	HttpResponse<FinalizarRascunhoImportacaoNfResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const nota = await buscarNotaFiscalRascunhoPorId(idRascunho, idempresa);

	if (!nota) {
		return httpNaoEncontrado();
	}

	const itens = await listarItensPorNotaFiscal(idRascunho);

	const itensComDados = itens.map((item) => ({
		...item,
		dadosimportacao: item.dadosimportacao as DadosImportacaoItem | null,
	}));

	const pendencias = await validarItensRascunho(itensComDados);

	if (pendencias.length > 0) {
		return httpBadRequest(pendencias.join("; "));
	}

	const dadosNotaImportacao =
		(nota.dadosimportacao as DadosImportacaoNota | null) ?? {};
	const duplicatasXml = dadosNotaImportacao.duplicatas ?? [];
	const temDuplicatasXml = duplicatasXml.some(
		(dup) => dup.valor && parseFloat(dup.valor) > 0,
	);

	if (gerarFinanceiro && !nota.idcondicaopagto && !temDuplicatasXml) {
		return httpBadRequest(
			"Informe a condição de pagamento ou importe duplicatas do XML para gerar contas a pagar",
		);
	}

	if (nota.chavenfe) {
		const duplicada = await buscarNotaFiscalPorChaveNfe(
			idempresa,
			nota.chavenfe,
			idRascunho,
		);

		if (duplicada && duplicada.status !== STATUS_RASCUNHO_IMPORTACAO) {
			return httpBadRequest("Já existe uma nota fiscal com esta chave NF-e");
		}
	}

	const identidadeFornecedor = await vincularOuCriarFornecedorNf({
		idempresa,
		identidade: nota.identidade,
		cnpj: nota.cnpjemissor,
		razaosocial: nota.razaosocial,
		inscricaoestadual: nota.inscricaoestadual,
	});

	if (nota.cnpjemissor && !identidadeFornecedor) {
		return httpBadRequest("Falha ao cadastrar o fornecedor da nota fiscal");
	}

	const empresa = await buscarEmpresaPorId(idempresa);
	const configRegime = obterConfigRegimeImportacaoNf(empresa?.regimetributario);
	const localEstoque = await buscarPrimeiroLocalEstoqueEmpresa(idempresa);
	const finalizadoEm = new Date().toISOString();

	const rateioMap = calcularRateioItensImportacaoNf(
		itensComDados.map((item) => item.dadosimportacao as DadosImportacaoItem),
		{
			totalproduto: nota.totalproduto,
			frete: nota.frete,
			seguro: nota.seguro,
			outrasdespesas: nota.outrasdespesas,
			descontoproduto: nota.descontoproduto,
		},
	);

	for (let i = 0; i < itensComDados.length; i++) {
		const dados = itensComDados[i]?.dadosimportacao;
		if (!dados) continue;

		const rateio = rateioMap.get(i);
		dados.rateio = rateio;
		dados.custoContabilCalculado = calcularCustoContabilItem(
			dados.precounitarioEstoque,
			dados.quantidadeEstoque,
			rateio,
			dados.tributacao,
		);
	}

	const produtosResolvidos = new Map<string, string>();
	const rastroTributacaoPorItem = new Map<string, RastroTributacaoSaidaImportacao>();

	for (const item of itensComDados) {
		const dados = item.dadosimportacao;
		if (!dados) continue;

		const parametrizacao = await aplicarParametrizacaoTributosProduto({
			idempresa,
			dados,
			ufemitente: dadosNotaImportacao.ufemitente,
		});

		const cfopSaida = parametrizacao?.sugestao.idcfopsaida
			? {
					id: parametrizacao.sugestao.idcfopsaida,
					codigo: undefined,
				}
			: await resolverCfopSaidaDeEntrada(
					idempresa,
					dados.idcfop,
					dados.cfopXml,
					dadosNotaImportacao.ufemitente,
				);

		const sugestaoSaida =
			parametrizacao?.sugestao ??
			sugerirTributacaoSaidaProdutoNf(configRegime, dados.tributacao);

		rastroTributacaoPorItem.set(item.id, {
			origem: parametrizacao
				? "parametrizacao"
				: cfopSaida?.id
					? "cfop-depara"
					: "heuristica",
			idparametrizacaotributos: parametrizacao?.regra.id,
		});

		const opcoesProduto = {
			idfornecedor: identidadeFornecedor ?? undefined,
			idcfopsaida: cfopSaida?.id ?? parametrizacao?.sugestao.idcfopsaida,
			configRegime,
		};

		if (dados.statusVinculo === "vinculado" && dados.idproduto) {
			const produtoAtual = await buscarProdutoPorId(dados.idproduto);
			const dadosProduto = montarDadosProdutoNfImportacao(
				dados,
				idempresa,
				opcoesProduto,
			);

			const tipoprodutoResolvido =
				dados.tipoproduto?.trim() ||
				parametrizacao?.sugestao.tipoproduto?.trim() ||
				(!produtoAtual?.tipoproduto
					? await resolverTipoprodutoPorCfopEntrada(dadosProduto.idcfopentrada)
					: undefined);

			const quantidadeImportada = parseQuantidadePadraoImportacao(
				dados.quantidadeEstoque,
			);

			await atualizarProduto(dados.idproduto, {
				...montarAtualizacaoProdutoNf({
					...dadosProduto,
					...sugestaoSaida,
					idcfopsaidanfce:
						sugestaoSaida.idcfopsaidanfce ?? dadosProduto.idcfopsaidanfce,
					cfopvendaecf: sugestaoSaida.cfopvendaecf,
					...(tipoprodutoResolvido
						? { tipoproduto: tipoprodutoResolvido }
						: {}),
				}),
				quantidadepadrao:
					(produtoAtual?.quantidadepadrao ?? 0) + quantidadeImportada,
				...(produtoAtual
					? mesclarSugestaoTributacaoSaidaProduto(produtoAtual, sugestaoSaida)
					: sugestaoSaida),
			});

			produtosResolvidos.set(item.id, dados.idproduto);

			if (identidadeFornecedor && dados.codigoFornecedor) {
				await vincularProdutoFornecedorSeNaoExistir({
					id: uuidv4(),
					idempresa,
					identidade: identidadeFornecedor,
					cnpjfornecedor: nota.cnpjemissor ?? null,
					idproduto: dados.idproduto,
					codigofornecedor: dados.codigoFornecedor,
					descricaofornecedor: dados.descricaoFornecedor,
					criadoem: finalizadoEm,
				});
			}

			continue;
		}

		if (dados.statusVinculo === "novo") {
			const validacaoEan = await validarEanProdutoNf(idempresa, dados.eanXml);

			if (!validacaoEan.valido) {
				return httpBadRequest(
					`Item ${item.contador ?? "?"}: ${validacaoEan.mensagem}`,
				);
			}

			const dadosProduto = montarDadosProdutoNfImportacao(
				dados,
				idempresa,
				opcoesProduto,
			);

			const tipoprodutoResolvido =
				dados.tipoproduto?.trim() ||
				parametrizacao?.sugestao.tipoproduto?.trim() ||
				(await resolverTipoprodutoPorCfopEntrada(dadosProduto.idcfopentrada));

			const novoProduto = await criarProdutoParaNf({
				...dadosProduto,
				...sugestaoSaida,
				idcfopsaidanfce:
					sugestaoSaida.idcfopsaidanfce ?? dadosProduto.idcfopsaidanfce,
				cfopvendaecf: sugestaoSaida.cfopvendaecf,
				...(tipoprodutoResolvido
					? { tipoproduto: tipoprodutoResolvido }
					: {}),
			});

			if (!novoProduto) {
				return httpBadRequest(
					`Falha ao cadastrar produto: ${dados.descricaoFornecedor}`,
				);
			}

			produtosResolvidos.set(item.id, novoProduto.id);

			if (identidadeFornecedor && dados.codigoFornecedor) {
				await vincularProdutoFornecedorSeNaoExistir({
					id: uuidv4(),
					idempresa,
					identidade: identidadeFornecedor,
					cnpjfornecedor: nota.cnpjemissor ?? null,
					idproduto: novoProduto.id,
					codigofornecedor: dados.codigoFornecedor,
					descricaofornecedor: dados.descricaoFornecedor,
					criadoem: finalizadoEm,
				});
			}
		}
	}

	const itensFinalizados = await Promise.all(
		itensComDados.map(async (item) => {
			const dados = item.dadosimportacao;
			const idproduto = produtosResolvidos.get(item.id);

			if (!dados || !idproduto) {
				throw new Error("Item inconsistente na finalização");
			}

			const total = calcularTotalItemXmlImportacao(
				dados.quantidadeXml,
				dados.precounitarioXml,
				item.total,
			);

			const flagsCredito = obterFlagsCreditoItemImportacao(
				configRegime,
				dados.tributacao,
			);

			const lotePrincipal = obterLotePrincipalItem(dados.rastrosXml);
			const loteNumero = truncarTexto(lotePrincipal?.numeroLote, 30);
			const dataFabricacao = normalizarDataRastro(lotePrincipal?.dataFabricacao);
			const dataValidade = normalizarDataRastro(lotePrincipal?.dataValidade);

			let codigoCfopEntrada = item.cfop ?? null;
			if (dados.idcfop && !codigoCfopEntrada) {
				const cfop = await buscarCfopPorId(dados.idcfop);
				codigoCfopEntrada = cfop?.codigo ?? null;
			}

			return {
				id: item.id,
				idproduto,
				descricao: dados.descricaoFornecedor,
				quantidade: dados.quantidadeXml,
				precounitario: dados.precounitarioXml,
				total,
				idcfop: dados.idcfop ?? null,
				cfop: codigoCfopEntrada,
				idncm: dados.idncm ?? null,
				ncm: dados.ncmXml ?? null,
				idunidademedida: dados.idunidademedida ?? null,
				unidade: dados.unidadeEstoque ?? dados.unidadeXml ?? null,
				lote: loteNumero ?? null,
				datalote: dataFabricacao,
				datavalidade: dataValidade,
				idlote: loteNumero ? `${item.id}-${loteNumero}` : null,
				situacaotributaria: dados.tributacao.situacaotributaria ?? null,
				cstpis: dados.tributacao.cstpis ?? null,
				cstcofins: dados.tributacao.cstcofins ?? null,
				baseicms: numeroOpcionalOuNulo(dados.tributacao.baseicms) ?? null,
				percentualicms:
					numeroOpcionalOuNulo(dados.tributacao.percentualicms) ?? null,
				icms: numeroOpcionalOuNulo(dados.tributacao.icms) ?? null,
				aliquotapis: numeroOpcionalOuNulo(dados.tributacao.aliquotapis) ?? null,
				aliquotacofins:
					numeroOpcionalOuNulo(dados.tributacao.aliquotacofins) ?? null,
				pis: numeroOpcionalOuNulo(dados.tributacao.pis) ?? null,
				cofins: numeroOpcionalOuNulo(dados.tributacao.cofins) ?? null,
				ipi: numeroOpcionalOuNulo(dados.tributacao.ipi) ?? null,
				origem: dados.tributacao.origem ?? 0,
				custoaquisicao:
					dados.custoContabilCalculado ?? dados.precounitarioEstoque,
				gerarcreditoipi: flagsCredito.gerarcreditoipi,
				gerarcreditoicmsst: flagsCredito.gerarcreditoicmsst,
				dadosimportacao: montarSnapshotImportacaoItem(
					{
						...dados,
						rastroTributacaoSaida: rastroTributacaoPorItem.get(item.id),
					},
					finalizadoEm,
				),
			};
		}),
	);

	const xmlArquivado = nota.arquivoxmlnotaoriginal
		? await arquivarXmlNotaFiscal({
				idnotafiscal: idRascunho,
				idempresa,
				xml: nota.arquivoxmlnotaoriginal,
				chavenfe: nota.chavenfe,
				protocolonfe: nota.protocolonfe,
			})
		: null;

	const resultado = await finalizarRascunhoNotaFiscal(
		idRascunho,
		{
			status: STATUS_NF_CONFIRMADA,
			identidade: identidadeFornecedor ?? nota.identidade,
			totalproduto: nota.totalproduto,
			valortotalnota: nota.valortotalnota,
			datainclusao: finalizadoEm,
			dadosimportacao: {
				duplicatas: dadosNotaImportacao.duplicatas,
				finalizadoEm,
				versao: 1,
				xmlArquivado: xmlArquivado
					? {
							chavenfe: xmlArquivado.chavenfe ?? undefined,
							protocolonfe: xmlArquivado.protocolonfe ?? undefined,
							hashsha256: xmlArquivado.hashsha256 ?? undefined,
							tamanhobytes: xmlArquivado.tamanhobytes ?? undefined,
						}
					: undefined,
			},
			idlocalestoque: localEstoque?.id ?? nota.idlocalestoque,
		},
		itensFinalizados,
	);

	if (!resultado.notaFiscal) {
		return httpBadRequest("Falha ao finalizar rascunho");
	}

	if (gerarCustos) {
		const itensCustos = itensComDados
			.filter((item) => produtosResolvidos.has(item.id))
			.map((item) => {
				const dados = item.dadosimportacao as DadosImportacaoItem;
				return montarItemCustoNfFromImportacao(
					produtosResolvidos.get(item.id) as string,
					dados,
				);
			});

		try {
			await registrarCustosNfService({
				idusuario,
				idempresa,
				idnotafiscal: idRascunho,
				itens: itensCustos,
			});
		} catch (erro) {
			console.error("Erro ao registrar custos da NF:", erro);
		}
	}

	try {
		await registrarMovimentosEstoqueNf({
			idempresa,
			idnotafiscal: idRascunho,
			idlocalestoque: localEstoque?.id ?? nota.idlocalestoque ?? undefined,
			dataMovimento: nota.emissao ?? finalizadoEm,
			sentido: "entrada",
			itens: itensComDados
				.filter((item) => produtosResolvidos.has(item.id))
				.map((item) => {
					const dados = item.dadosimportacao as DadosImportacaoItem;
					const lotePrincipal = obterLotePrincipalItem(dados.rastrosXml);
					const loteNumero = truncarTexto(lotePrincipal?.numeroLote, 30);
					return {
						iditem: item.id,
						idproduto: produtosResolvidos.get(item.id) as string,
						quantidade: dados.quantidadeEstoque,
						custoUnitario:
							dados.custoContabilCalculado ?? dados.precounitarioEstoque,
						lote: loteNumero ?? undefined,
						idlote: loteNumero ? `${item.id}-${loteNumero}` : undefined,
					};
				}),
		});
	} catch (erro) {
		console.error("Erro ao registrar movimentos de estoque da NF:", erro);
	}

	if (
		gerarFinanceiro &&
		(nota.valortotalnota || temDuplicatasXml) &&
		(nota.idcondicaopagto || temDuplicatasXml)
	) {
		try {
			await gerarContasPagarNfService({
				idempresa,
				idnotafiscal: idRascunho,
				identidade: identidadeFornecedor ?? nota.identidade ?? undefined,
				idcondicaopagto: nota.idcondicaopagto ?? undefined,
				duplicatas: temDuplicatasXml ? duplicatasXml : undefined,
				idtipodocumento: nota.idtipodocumento ?? undefined,
				idplanocontas: nota.idplanocontas ?? undefined,
				valortotalnota: nota.valortotalnota ?? "0",
				emissao: nota.emissao ?? finalizadoEm,
				numero: nota.numero ?? nota.numeronotafiscal ?? undefined,
				serie: nota.serie ?? undefined,
				chavenfe: nota.chavenfe ?? undefined,
				razaosocial: nota.razaosocial ?? undefined,
			});
		} catch (erro) {
			console.error("Erro ao gerar contas a pagar da NF:", erro);
		}
	}

	try {
		await criarAuditoriaService({
			id: uuidv4(),
			acao: "finalizar_rascunho_importacao_nf",
			idusuario,
			recurso: "nota_fiscal",
			idrecurso: idRascunho,
			idempresa,
			criadoem: new Date().toISOString(),
			metadados: {
				numero: resultado.notaFiscal.numero,
				quantidadeItens: itens.length,
			},
		});
	} catch (erro) {
		console.error("Erro ao registrar auditoria da NF:", erro);
	}

	return httpOk<FinalizarRascunhoImportacaoNfResposta>({
		notaFiscal: resultado.notaFiscal,
		itens: resultado.itens,
	});
}

export async function excluirRascunhoImportacaoNfService({
	idusuario,
	idempresa,
	idRascunho,
}: {
	idusuario: string;
	idempresa: string;
	idRascunho: string;
}): Promise<HttpResponse<null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const nota = await buscarNotaFiscalRascunhoPorId(idRascunho, idempresa);

	if (!nota) {
		return httpNaoEncontrado();
	}

	await excluirNotaFiscal(idRascunho);

	return httpOk(null);
}

export async function listarRascunhosImportacaoNfService({
	idusuario,
	idempresa,
	page = 1,
	limit = 10,
}: {
	idusuario: string;
	idempresa: string;
	page?: number;
	limit?: number;
}) {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const { listarNotasFiscaisPorEmpresa } = await import(
		"@/repositories/nota-fiscal-repositories.js"
	);

	const resultado = await listarNotasFiscaisPorEmpresa({
		idempresa,
		somenteRascunhos: true,
		page,
		limit,
	});

	const total = resultado.total ?? 0;

	return httpOk({
		data: resultado.notas,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});
}
