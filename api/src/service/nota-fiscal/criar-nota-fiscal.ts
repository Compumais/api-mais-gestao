import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NotaFiscalItem,
	NovoNotaFiscalItem,
} from "@/model/nota-fiscal-item-model.js";
import type { NotaFiscal, NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarNotaFiscalComItens } from "@/repositories/nota-fiscal-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { registrarCustosNfService } from "@/service/custo-produto/registrar-custos-nf.js";
import { gerarContasPagarNfService } from "@/service/nota-fiscal/gerar-contas-pagar-nf.js";
import { vincularOuCriarFornecedorNf } from "@/service/nota-fiscal/vincular-ou-criar-fornecedor-nf.js";
import {
	type DadosProdutoNF,
	vincularOuCriarProdutoService,
} from "@/service/nota-fiscal/vincular-ou-criar-produto.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";
import {
	extrairMensagemErroBanco,
	idOpcionalOuNulo,
	normalizarCodigoBarras,
	normalizarDataHoraTimestamp,
	truncarTexto,
} from "@/util/texto-util.js";

export type ItemNotaFiscalEntrada = {
	idproduto?: string | undefined;
	codigoproduto?: number | undefined;
	ean?: string | undefined;
	descricaoproduto?: string | undefined;
	descricao?: string | undefined;
	quantidade?: string | number | undefined;
	precounitario?: string | number | undefined;
	total?: string | number | undefined;
	desconto?: string | number | undefined;
	idcfop?: string | undefined;
	cfop?: string | undefined;
	idncm?: string | undefined;
	ncm?: string | undefined;
	idunidademedida?: string | undefined;
	unidade?: string | undefined;
	situacaotributaria?: string | undefined;
	cstpis?: string | undefined;
	cstcofins?: string | undefined;
	percentualicms?: string | number | undefined;
	baseicms?: string | number | undefined;
	icms?: string | number | undefined;
	aliquotapis?: string | number | undefined;
	aliquotacofins?: string | number | undefined;
	pis?: string | number | undefined;
	cofins?: string | number | undefined;
	pisretido?: string | number | undefined;
	cofinsretido?: string | number | undefined;
	ipi?: string | number | undefined;
	inss?: string | number | undefined;
	frete?: string | number | undefined;
	seguro?: string | number | undefined;
	outrasdespesas?: string | number | undefined;
	origem?: number | undefined;
	custoaquisicao?: string | number | undefined;
	referenciafornecedor?: string | undefined;
	informacaoadicional?: string | undefined;
};

type CriarNotaFiscalParametros = {
	idusuario: string;
	dadosNotaFiscal: Omit<NovaNotaFiscal, "id">;
	itens: ItemNotaFiscalEntrada[];
	gerarCustos?: boolean | undefined;
	gerarFinanceiro?: boolean | undefined;
};

type CriarNotaFiscalResposta = {
	notaFiscal: NotaFiscal;
	itens: NotaFiscalItem[];
};

function paraString(valor: string | number | undefined | null): string | null {
	if (valor === undefined || valor === null) return null;
	return typeof valor === "number" ? valor.toString() : valor;
}

function sanitizarDadosNotaFiscal(
	dados: Omit<NovaNotaFiscal, "id">,
): Omit<NovaNotaFiscal, "id"> {
	return {
		...dados,
		identidade: idOpcionalOuNulo(dados.identidade) ?? null,
		idplanocontas: idOpcionalOuNulo(dados.idplanocontas) ?? null,
		idcondicaopagto: idOpcionalOuNulo(dados.idcondicaopagto) ?? null,
		idtipodocumento: idOpcionalOuNulo(dados.idtipodocumento) ?? null,
		idoperacaofiscal: idOpcionalOuNulo(dados.idoperacaofiscal) ?? null,
		idcfop: idOpcionalOuNulo(dados.idcfop) ?? null,
		numero: truncarTexto(dados.numero, 60),
		numeronotafiscal: truncarTexto(dados.numeronotafiscal, 11),
		serie: truncarTexto(dados.serie, 6),
		modelo: truncarTexto(dados.modelo, 4),
		chavenfe: truncarTexto(dados.chavenfe, 44),
		cnpjemissor: truncarTexto(dados.cnpjemissor, 14),
		razaosocial: truncarTexto(dados.razaosocial, 60),
		inscricaoestadual: truncarTexto(dados.inscricaoestadual, 20),
		protocolonfe: truncarTexto(dados.protocolonfe, 18),
		tipodocumento: truncarTexto(dados.tipodocumento, 2),
		datahoraemissao: normalizarDataHoraTimestamp(dados.datahoraemissao),
		datahoraentradasaida: normalizarDataHoraTimestamp(
			dados.datahoraentradasaida,
		),
	};
}

function sanitizarItemNotaFiscal(
	item: ItemNotaFiscalEntrada,
): ItemNotaFiscalEntrada {
	const descricao =
		truncarTexto(item.descricao ?? item.descricaoproduto, 120) ?? undefined;

	return {
		...item,
		descricao,
		descricaoproduto: truncarTexto(item.descricaoproduto, 120) ?? descricao,
		cfop: truncarTexto(item.cfop, 20) ?? undefined,
		ncm: truncarTexto(item.ncm, 11) ?? undefined,
		unidade: truncarTexto(item.unidade, 6) ?? undefined,
		situacaotributaria: truncarTexto(item.situacaotributaria, 3) ?? undefined,
		cstpis: truncarTexto(item.cstpis, 2) ?? undefined,
		cstcofins: truncarTexto(item.cstcofins, 2) ?? undefined,
		referenciafornecedor:
			truncarTexto(item.referenciafornecedor, 60) ?? undefined,
	};
}

export async function criarNotaFiscalService({
	idusuario,
	dadosNotaFiscal,
	itens,
	gerarCustos = true,
	gerarFinanceiro = true,
}: CriarNotaFiscalParametros): Promise<HttpResponse<CriarNotaFiscalResposta>> {
	if (itens.length === 0) {
		return httpBadRequest("Informe ao menos um item da nota fiscal");
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosNotaFiscal.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const dadosSanitizados = sanitizarDadosNotaFiscal(dadosNotaFiscal);
	const itensSanitizados = itens.map(sanitizarItemNotaFiscal);

	const identidadeFornecedor = await vincularOuCriarFornecedorNf({
		idempresa: dadosSanitizados.idempresa,
		identidade: dadosSanitizados.identidade,
		cnpj: dadosSanitizados.cnpjemissor,
		razaosocial: dadosSanitizados.razaosocial,
		inscricaoestadual: dadosSanitizados.inscricaoestadual,
	});

	if (dadosSanitizados.cnpjemissor && !identidadeFornecedor) {
		return httpBadRequest("Falha ao cadastrar o fornecedor da nota fiscal");
	}

	if (identidadeFornecedor) {
		dadosSanitizados.identidade = identidadeFornecedor;
	}

	const produtosResolvidos: Array<{
		idproduto: string;
		item: ItemNotaFiscalEntrada;
	}> = [];

	for (const item of itensSanitizados) {
		const dadosProduto: DadosProdutoNF = {
			idempresa: dadosSanitizados.idempresa,
			idproduto: item.idproduto,
			codigoproduto: item.codigoproduto,
			ean:
				normalizarCodigoBarras(
					typeof item.ean === "number" ? String(item.ean) : item.ean,
				) ?? undefined,
			descricaoproduto: item.descricaoproduto ?? item.descricao,
			idncm: item.idncm,
			idunidademedida: item.idunidademedida,
			idcfopentrada: item.idcfop,
			idfornecedor: identidadeFornecedor ?? undefined,
			custoaquisicao: paraString(item.custoaquisicao) ?? undefined,
		};

		const resultado = await vincularOuCriarProdutoService(dadosProduto);

		if (!resultado.produto) {
			return httpBadRequest(resultado.erro ?? "Produto inválido");
		}

		produtosResolvidos.push({ idproduto: resultado.produto.id, item });
	}

	const notaFiscalId = uuidv4();
	const datahoraAtual = new Date().toISOString();

	const notaFiscal: NovaNotaFiscal = {
		...dadosSanitizados,
		id: notaFiscalId,
		tipoorigem: 0,
		idusuarioinclusao: idusuario,
		datainclusao: datahoraAtual,
		currenttimemillis: Date.now(),
	};

	const itensParaInserir: NovoNotaFiscalItem[] = produtosResolvidos.map(
		({ idproduto, item }, index) => ({
			id: uuidv4(),
			idnotafiscal: notaFiscalId,
			idproduto,
			descricao: item.descricao ?? item.descricaoproduto ?? null,
			quantidade: paraString(item.quantidade),
			precounitario: paraString(item.precounitario),
			total: paraString(item.total),
			desconto: paraString(item.desconto),
			idcfop: item.idcfop ?? null,
			cfop: item.cfop ?? null,
			idncm: item.idncm ?? null,
			ncm: item.ncm ?? null,
			idunidademedida: item.idunidademedida ?? null,
			unidade: item.unidade ?? null,
			situacaotributaria: item.situacaotributaria ?? null,
			cstpis: item.cstpis ?? null,
			cstcofins: item.cstcofins ?? null,
			percentualicms: paraString(item.percentualicms),
			baseicms: paraString(item.baseicms),
			icms: paraString(item.icms),
			aliquotapis: paraString(item.aliquotapis),
			aliquotacofins: paraString(item.aliquotacofins),
			pis: paraString(item.pis),
			cofins: paraString(item.cofins),
			pisretido: paraString(item.pisretido),
			cofinsretido: paraString(item.cofinsretido),
			ipi: paraString(item.ipi),
			inss: paraString(item.inss),
			frete: paraString(item.frete),
			seguro: paraString(item.seguro),
			outrasdespesas: paraString(item.outrasdespesas),
			origem: item.origem ?? 0,
			custoaquisicao: paraString(item.custoaquisicao),
			referenciafornecedor: item.referenciafornecedor ?? null,
			informacaoadicional: item.informacaoadicional ?? null,
			contador: index + 1,
			tipo: "P",
			currenttimemillis: Date.now(),
		}),
	);

	let resultado: Awaited<ReturnType<typeof criarNotaFiscalComItens>>;

	try {
		resultado = await criarNotaFiscalComItens(notaFiscal, itensParaInserir);
	} catch (erro) {
		console.error("Erro ao inserir nota fiscal:", erro);
		return httpBadRequest(extrairMensagemErroBanco(erro));
	}

	if (!resultado.notaFiscal) {
		return httpErroInterno();
	}

	if (gerarCustos) {
		const itensCustos = produtosResolvidos
			.filter(({ item }) => item.precounitario !== undefined)
			.map(({ idproduto, item }) => ({
				idproduto,
				precocompra: paraString(item.precounitario) ?? "0",
				custo: paraString(item.custoaquisicao) ?? undefined,
				desconto: paraString(item.desconto) ?? undefined,
				ipi: paraString(item.ipi) ?? undefined,
			}));

		if (itensCustos.length > 0) {
			try {
				await registrarCustosNfService({
					idusuario,
					idempresa: dadosSanitizados.idempresa,
					idnotafiscal: notaFiscalId,
					itens: itensCustos,
				});
			} catch (erro) {
				console.error("Erro ao registrar custos da NF:", erro);
			}
		}
	}

	if (
		gerarFinanceiro &&
		dadosSanitizados.idcondicaopagto &&
		dadosSanitizados.valortotalnota
	) {
		try {
			await gerarContasPagarNfService({
				idempresa: dadosSanitizados.idempresa,
				idnotafiscal: notaFiscalId,
				identidade: dadosSanitizados.identidade ?? undefined,
				idcondicaopagto: dadosSanitizados.idcondicaopagto,
				idtipodocumento: dadosSanitizados.idtipodocumento ?? undefined,
				idplanocontas: dadosSanitizados.idplanocontas ?? undefined,
				valortotalnota: dadosSanitizados.valortotalnota,
				emissao: dadosSanitizados.emissao ?? datahoraAtual,
				numero:
					dadosSanitizados.numero ??
					dadosSanitizados.numeronotafiscal ??
					undefined,
				serie: dadosSanitizados.serie ?? undefined,
				chavenfe: dadosSanitizados.chavenfe ?? undefined,
				razaosocial: dadosSanitizados.razaosocial ?? undefined,
			});
		} catch (erro) {
			console.error("Erro ao gerar contas a pagar da NF:", erro);
		}
	}

	try {
		await criarAuditoriaService({
			id: uuidv4(),
			acao: "criar_nota_fiscal_compra",
			idusuario,
			recurso: "nota_fiscal",
			idrecurso: notaFiscalId,
			idempresa: dadosSanitizados.idempresa,
			criadoem: datahoraAtual,
			metadados: {
				numero: resultado.notaFiscal.numero,
				quantidadeItens: itens.length,
				tipoorigem: 0,
			},
		});
	} catch (erro) {
		console.error("Erro ao registrar auditoria da NF:", erro);
	}

	return httpCriacao<CriarNotaFiscalResposta>({
		notaFiscal: resultado.notaFiscal,
		itens: resultado.itens,
	});
}
