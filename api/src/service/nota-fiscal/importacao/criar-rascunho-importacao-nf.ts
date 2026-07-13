import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	DadosImportacaoItem,
	DuplicataImportacaoNf,
	FornecedorSugeridoImportacao,
} from "@/model/nota-fiscal-importacao-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import type { NotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import type { NovoNotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import { buscarEntidadePorCnpj } from "@/repositories/entidade-repositories.js";
import { criarNotaFiscalComItens } from "@/repositories/nota-fiscal-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import { buscarProdutoParaNf } from "@/service/nota-fiscal/vincular-ou-criar-produto.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";
import { isCfopEntrada } from "@/util/cfop-entrada-validacao.js";
import { recalcularDadosConversao } from "@/util/calculo-importacao-nf.js";
import { STATUS_RASCUNHO_IMPORTACAO } from "@/util/nota-fiscal-constants.js";
import { parseNFeXml } from "@/util/nfe-xml-parser.js";
import {
	extrairMensagemErroBanco,
	idOpcionalOuNulo,
	normalizarDataHoraTimestamp,
	smallintValidoParaPostgres,
	truncarTexto,
} from "@/util/texto-util.js";
import {
	resolverCestImportacao,
	resolverCfopEntradaPorCfopXml,
	resolverNcmImportacao,
	resolverUnidadeImportacao,
} from "./resolver-referencias-importacao.js";

type CriarRascunhoImportacaoNfParametros = {
	idusuario: string;
	idempresa: string;
	xml: string;
	idplanocontas?: string | undefined;
	idcondicaopagto?: string | undefined;
	idtipodocumento?: string | undefined;
	idoperacaofiscal?: string | undefined;
};

type CriarRascunhoImportacaoNfResposta = {
	idRascunho: string;
	nota: NotaFiscal;
	itens: NotaFiscalItem[];
	fornecedor: FornecedorSugeridoImportacao;
};

type ItemMontadoImportacao = {
	dados: DadosImportacaoItem;
	codigoCfopEntrada?: string;
};

async function montarDadosImportacaoItem(
	itemXml: ReturnType<typeof parseNFeXml>["itens"][number],
	idempresa: string,
	_identidade?: string | undefined,
	ufEmitente?: string | undefined,
): Promise<ItemMontadoImportacao> {
	const fatorConversao = "1";
	const quantidadeXml = itemXml.quantidade ?? "0";
	const precounitarioXml = itemXml.precounitario ?? "0";
	const { quantidadeEstoque, precounitarioEstoque } = recalcularDadosConversao(
		quantidadeXml,
		precounitarioXml,
		fatorConversao,
	);

	const produtoEncontrado = await buscarProdutoParaNf({
		idempresa,
		codigoproduto: itemXml.codigoproduto,
		ean: itemXml.ean,
		descricaoproduto: itemXml.descricaoproduto,
	});

	const ncm = await resolverNcmImportacao(idempresa, itemXml.ncm);
	const cest = await resolverCestImportacao(idempresa, itemXml.cest);
	const unidade = await resolverUnidadeImportacao(idempresa, itemXml.unidade);

	const statusVinculo = produtoEncontrado ? "vinculado" : "pendente";

	// Prioridade CFOP de entrada:
	// 1) cadastro do produto (idcfopentrada)
	// 2) depara planilha / cadastro (CFOP XML saída → entrada)
	// Cabeçalho da nota permanece sem CFOP — usuário escolhe.
	let idcfopEntrada: string | undefined;
	let codigoCfopEntrada: string | undefined;

	if (produtoEncontrado?.idcfopentrada) {
		const cfopProduto = await buscarCfopPorId(produtoEncontrado.idcfopentrada);
		if (cfopProduto?.codigo && isCfopEntrada(cfopProduto.codigo)) {
			idcfopEntrada = produtoEncontrado.idcfopentrada;
			codigoCfopEntrada = cfopProduto.codigo;
		}
	}

	if (!idcfopEntrada && itemXml.cfop) {
		const cfopDepara = await resolverCfopEntradaPorCfopXml(
			idempresa,
			itemXml.cfop,
			ufEmitente,
		);
		if (cfopDepara) {
			idcfopEntrada = cfopDepara.id;
			codigoCfopEntrada = cfopDepara.codigo;
		}
	}

	return {
		dados: {
			codigoFornecedor:
				itemXml.referenciafornecedor ?? itemXml.codigoproduto?.toString(),
			descricaoFornecedor: itemXml.descricaoproduto,
			eanXml: itemXml.ean,
			statusVinculo,
			idproduto: produtoEncontrado?.id,
			produtoEncontrado: produtoEncontrado
				? {
						id: produtoEncontrado.id,
						nome: produtoEncontrado.nome ?? produtoEncontrado.descricao ?? "",
						codigo: produtoEncontrado.codigo ?? undefined,
					}
				: undefined,
			confirmarCadastro: false,
			unidadeXml: itemXml.unidade,
			unidadeEstoque: unidade?.codigo ?? itemXml.unidade,
			unidadeTributavelXml: itemXml.unidadeTributavel,
			quantidadeTributavelXml: itemXml.quantidadeTributavel,
			precounitarioTributavelXml: itemXml.precounitarioTributavel,
			idunidademedida: unidade?.id,
			fatorConversao,
			quantidadeXml,
			quantidadeEstoque,
			precounitarioXml,
			precounitarioEstoque,
			cfopXml: itemXml.cfop,
			idcfop: idcfopEntrada,
			ncmXml: itemXml.ncm,
			idncm: ncm?.id,
			cestXml: itemXml.cest,
			idcest: cest?.id,
			rastrosXml: itemXml.rastros,
			tributacao: {
				situacaotributaria: itemXml.situacaotributaria,
				cstpis: itemXml.cstpis,
				cstcofins: itemXml.cstcofins,
				baseicms: itemXml.baseicms,
				percentualicms: itemXml.percentualicms,
				icms: itemXml.icms,
				baseicmsst: itemXml.baseicmsst,
				icmsst: itemXml.icmsst,
				mvaicmsst: itemXml.mvaicmsst,
				fcpst: itemXml.fcpst,
				aliquotapis: itemXml.aliquotapis,
				aliquotacofins: itemXml.aliquotacofins,
				pis: itemXml.pis,
				cofins: itemXml.cofins,
				ipi: itemXml.ipi,
				cstipi: itemXml.cstipi,
				enquadramentoipi: itemXml.enquadramentoipi,
				origem: smallintValidoParaPostgres(itemXml.origem),
			},
		},
		...(codigoCfopEntrada ? { codigoCfopEntrada } : {}),
	};
}

export async function criarRascunhoImportacaoNfService({
	idusuario,
	idempresa,
	xml,
	idplanocontas,
	idcondicaopagto,
	idtipodocumento,
	idoperacaofiscal,
}: CriarRascunhoImportacaoNfParametros): Promise<
	HttpResponse<CriarRascunhoImportacaoNfResposta>
> {
	try {
		return await executarCriarRascunhoImportacaoNf({
			idusuario,
			idempresa,
			xml,
			idplanocontas,
			idcondicaopagto,
			idtipodocumento,
			idoperacaofiscal,
		});
	} catch (erro) {
		console.error("Erro inesperado ao criar rascunho de importação:", erro);
		const mensagem = extrairMensagemErroBanco(erro);

		if (
			mensagem.includes("does not exist") ||
			mensagem.includes("não existe") ||
			mensagem.includes("migration")
		) {
			return httpBadRequest(mensagem);
		}

		return httpErroInterno();
	}
}

async function executarCriarRascunhoImportacaoNf({
	idusuario,
	idempresa,
	xml,
	idplanocontas,
	idcondicaopagto,
	idtipodocumento,
	idoperacaofiscal,
}: CriarRascunhoImportacaoNfParametros): Promise<
	HttpResponse<CriarRascunhoImportacaoNfResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	let dadosXml: ReturnType<typeof parseNFeXml>;

	try {
		dadosXml = parseNFeXml(xml);
	} catch (erro) {
		return httpBadRequest(
			`Falha ao processar o XML: ${erro instanceof Error ? erro.message : "XML inválido"}`,
		);
	}

	if (!dadosXml.itens || dadosXml.itens.length === 0) {
		return httpBadRequest("O XML não contém itens válidos.");
	}

	const entidadeFornecedor = dadosXml.cnpjemissor
		? await buscarEntidadePorCnpj(idempresa, dadosXml.cnpjemissor)
		: undefined;

	const fornecedor: FornecedorSugeridoImportacao = {
		id: entidadeFornecedor?.id,
		cnpj: dadosXml.cnpjemissor,
		razaosocial: dadosXml.razaosocial ?? entidadeFornecedor?.razaosocial ?? undefined,
		inscricaoestadual:
			dadosXml.inscricaoestadual ?? entidadeFornecedor?.inscricaoestadual ?? undefined,
		encontrado: !!entidadeFornecedor,
	};

	const duplicatasNota: DuplicataImportacaoNf[] | undefined =
		dadosXml.duplicatas && dadosXml.duplicatas.length > 0
			? dadosXml.duplicatas
			: undefined;

	const notaFiscalId = uuidv4();
	const datahoraAtual = new Date().toISOString();

	const notaFiscal: NovaNotaFiscal = {
		id: notaFiscalId,
		idempresa,
		identidade: entidadeFornecedor?.id ?? null,
		numero: truncarTexto(dadosXml.numero, 60),
		numeronotafiscal: truncarTexto(dadosXml.numeronotafiscal, 11),
		serie: truncarTexto(dadosXml.serie, 6),
		modelo: truncarTexto(dadosXml.modelo, 4),
		chavenfe: truncarTexto(dadosXml.chavenfe, 44),
		emissao: dadosXml.emissao ?? null,
		entradasaida: dadosXml.entradasaida ?? null,
		datahoraemissao: normalizarDataHoraTimestamp(dadosXml.datahoraemissao),
		datahoraentradasaida: normalizarDataHoraTimestamp(
			dadosXml.datahoraentradasaida,
		),
		tipodocumento: truncarTexto(dadosXml.tipodocumento, 2),
		cnpjemissor: truncarTexto(dadosXml.cnpjemissor, 14),
		razaosocial: truncarTexto(dadosXml.razaosocial, 60),
		inscricaoestadual: truncarTexto(dadosXml.inscricaoestadual, 20),
		totalproduto: dadosXml.totalproduto ?? null,
		frete: dadosXml.frete ?? null,
		seguro: dadosXml.seguro ?? null,
		outrasdespesas: dadosXml.outrasdespesas ?? null,
		descontoproduto: dadosXml.descontoproduto ?? null,
		baseicms: dadosXml.baseicms ?? null,
		icms: dadosXml.icms ?? null,
		ipi: dadosXml.ipi ?? null,
		pis: dadosXml.pis ?? null,
		cofins: dadosXml.cofins ?? null,
		valortotalnota: dadosXml.valortotalnota ?? null,
		pesobruto: dadosXml.pesobruto ?? null,
		pesoliquido: dadosXml.pesoliquido ?? null,
		observacao: dadosXml.observacao ?? null,
		protocolonfe: truncarTexto(dadosXml.protocolonfe, 18),
		// CFOP do XML é do emitente (saída) — cabeçalho de entrada inicia vazio
		idcfop: null,
		idplanocontas: idOpcionalOuNulo(idplanocontas) ?? null,
		idcondicaopagto: idOpcionalOuNulo(idcondicaopagto) ?? null,
		idtipodocumento: idOpcionalOuNulo(idtipodocumento) ?? null,
		idoperacaofiscal: idOpcionalOuNulo(idoperacaofiscal) ?? null,
		arquivoxmlnotaoriginal: xml,
		dadosimportacao: {
			versao: 1,
			...(dadosXml.ufemitente ? { ufemitente: dadosXml.ufemitente } : {}),
			...(dadosXml.cfopOperacao
				? { cfopOperacaoXml: dadosXml.cfopOperacao }
				: {}),
			...(dadosXml.natOp ? { natOpXml: dadosXml.natOp } : {}),
			...(dadosXml.finNFe !== undefined ? { finNFe: dadosXml.finNFe } : {}),
			...(dadosXml.chaveReferenciada
				? { chaveReferenciadaXml: dadosXml.chaveReferenciada }
				: {}),
			...(dadosXml.ipiDevolvido
				? { ipiDevolvidoXml: dadosXml.ipiDevolvido }
				: {}),
			...(duplicatasNota ? { duplicatas: duplicatasNota } : {}),
		},
		tipoorigem: 0,
		status: STATUS_RASCUNHO_IMPORTACAO,
		idusuarioinclusao: idusuario,
		datainclusao: datahoraAtual,
		currenttimemillis: Date.now(),
	};

	let itensMontados: ItemMontadoImportacao[];

	try {
		itensMontados = await Promise.all(
			dadosXml.itens.map((item) =>
				montarDadosImportacaoItem(
					item,
					idempresa,
					entidadeFornecedor?.id,
					dadosXml.ufemitente,
				),
			),
		);
	} catch (erro) {
		console.error("Erro ao montar itens do rascunho:", erro);
		return httpBadRequest(extrairMensagemErroBanco(erro));
	}

	const itensParaInserir: NovoNotaFiscalItem[] = itensMontados.map(
		({ dados: dadosImportacao, codigoCfopEntrada }, index) => {
			const itemXml = dadosXml.itens[index];
			if (!itemXml) {
				throw new Error("Item XML não encontrado");
			}

			return {
				id: uuidv4(),
				idnotafiscal: notaFiscalId,
				idproduto: dadosImportacao.idproduto ?? null,
				descricao: truncarTexto(itemXml.descricaoproduto, 120),
				quantidade: dadosImportacao.quantidadeXml,
				precounitario: dadosImportacao.precounitarioXml,
				total: itemXml.total ?? null,
				desconto: itemXml.desconto ?? null,
				idcfop: dadosImportacao.idcfop ?? null,
				// Campo textual do item = CFOP de entrada (não o do XML do emitente)
				cfop: codigoCfopEntrada ?? null,
				idncm: dadosImportacao.idncm ?? null,
				ncm: itemXml.ncm ?? null,
				idunidademedida: dadosImportacao.idunidademedida ?? null,
				unidade: itemXml.unidade ?? null,
				situacaotributaria: itemXml.situacaotributaria ?? null,
				cstpis: itemXml.cstpis ?? null,
				cstcofins: itemXml.cstcofins ?? null,
				percentualicms: itemXml.percentualicms ?? null,
				baseicms: itemXml.baseicms ?? null,
				icms: itemXml.icms ?? null,
				aliquotapis: itemXml.aliquotapis ?? null,
				aliquotacofins: itemXml.aliquotacofins ?? null,
				pis: itemXml.pis ?? null,
				cofins: itemXml.cofins ?? null,
				ipi: itemXml.ipi ?? null,
				origem: smallintValidoParaPostgres(itemXml.origem) ?? 0,
				referenciafornecedor: itemXml.referenciafornecedor ?? null,
				informacaoadicional: itemXml.informacaoadicional ?? null,
				contador: index + 1,
				tipo: "P",
				currenttimemillis: Date.now(),
				dadosimportacao: dadosImportacao,
			};
		},
	);

	let resultado: Awaited<ReturnType<typeof criarNotaFiscalComItens>>;

	try {
		resultado = await criarNotaFiscalComItens(notaFiscal, itensParaInserir);
	} catch (erro) {
		console.error("Erro ao inserir rascunho de importação:", erro);
		return httpBadRequest(extrairMensagemErroBanco(erro));
	}

	if (!resultado.notaFiscal) {
		return httpBadRequest("Falha ao criar rascunho de importação");
	}

	return httpCriacao<CriarRascunhoImportacaoNfResposta>({
		idRascunho: resultado.notaFiscal.id,
		nota: resultado.notaFiscal,
		itens: resultado.itens,
		fornecedor,
	});
}
