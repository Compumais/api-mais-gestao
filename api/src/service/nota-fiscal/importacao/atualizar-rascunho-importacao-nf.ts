import type { HttpResponse } from "@/model/http-model.js";
import type { DadosImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import type { NotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarItemNotaFiscal,
	atualizarNotaFiscal,
	buscarItemNotaFiscalPorId,
	buscarNotaFiscalRascunhoPorId,
	listarItensPorNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { buscarHierarquiaPorId } from "@/repositories/hierarquia-repositories.js";
import type { DadosImportacaoNota } from "@/model/nota-fiscal-importacao-model.js";
import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { recalcularDadosConversao } from "@/util/calculo-importacao-nf.js";
import {
	isCfopEntrada,
	mensagemInconsistenciaCfopEntrada,
} from "@/util/cfop-entrada-validacao.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { idOpcionalOuNulo, numeroOpcionalOuNulo } from "@/util/texto-util.js";
import { buscarUnidadeMedidaPorId } from "@/repositories/unidade-medida-repositories.js";
import { validarEanProdutoNf } from "@/service/nota-fiscal/validar-ean-produto-nf.js";
import { resolverNcmImportacao } from "./resolver-referencias-importacao.js";

type AtualizarCabecalhoRascunhoParametros = {
	idusuario: string;
	idempresa: string;
	idRascunho: string;
	dados: {
		identidade?: string | null | undefined;
		idcfop?: string | null | undefined;
		idplanocontas?: string | null | undefined;
		idcondicaopagto?: string | null | undefined;
		idtipodocumento?: string | null | undefined;
		idoperacaofiscal?: string | null | undefined;
		observacao?: string | null | undefined;
		entradasaida?: string | null | undefined;
		aplicarCfopItens?: boolean | undefined;
	};
};

type AtualizarItemRascunhoParametros = {
	idusuario: string;
	idempresa: string;
	idRascunho: string;
	idItem: string;
	dados: Partial<DadosImportacaoItem>;
};

async function validarAcessoRascunho(
	idusuario: string,
	idempresa: string,
	idRascunho: string,
) {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return { erro: httpProibido() } as const;
	}

	const nota = await buscarNotaFiscalRascunhoPorId(idRascunho, idempresa);

	if (!nota) {
		return { erro: httpNaoEncontrado() } as const;
	}

	return { nota } as const;
}

async function resolverCfopEntradaPorId(idcfop: string | null | undefined): Promise<
	| { ok: true; idcfop: string; codigo: string }
	| { ok: false; erro: string }
	| { ok: true; idcfop: null; codigo: null }
> {
	if (!idcfop) {
		return { ok: true, idcfop: null, codigo: null };
	}

	const cfop = await buscarCfopPorId(idcfop);
	if (!cfop?.codigo) {
		return { ok: false, erro: "CFOP não encontrado" };
	}

	if (!isCfopEntrada(cfop.codigo)) {
		return {
			ok: false,
			erro: mensagemInconsistenciaCfopEntrada("cfop_nao_entrada"),
		};
	}

	return { ok: true, idcfop: cfop.id, codigo: cfop.codigo };
}

export async function atualizarCabecalhoRascunhoImportacaoNfService({
	idusuario,
	idempresa,
	idRascunho,
	dados,
}: AtualizarCabecalhoRascunhoParametros): Promise<HttpResponse<NotaFiscal>> {
	const validacao = await validarAcessoRascunho(idusuario, idempresa, idRascunho);

	if ("erro" in validacao) {
		return validacao.erro as HttpResponse<NotaFiscal>;
	}

	let codigoCfopEntrada: string | null = null;

	if (dados.idcfop !== undefined) {
		const cfopResolvido = await resolverCfopEntradaPorId(
			idOpcionalOuNulo(dados.idcfop),
		);
		if (!cfopResolvido.ok) {
			return httpBadRequest(cfopResolvido.erro);
		}
		codigoCfopEntrada = cfopResolvido.codigo;
	}

	const notaAtualizada = await atualizarNotaFiscal(idRascunho, {
		identidade: idOpcionalOuNulo(dados.identidade) ?? undefined,
		idcfop: idOpcionalOuNulo(dados.idcfop) ?? undefined,
		idplanocontas: idOpcionalOuNulo(dados.idplanocontas) ?? undefined,
		idcondicaopagto: idOpcionalOuNulo(dados.idcondicaopagto) ?? undefined,
		idtipodocumento: idOpcionalOuNulo(dados.idtipodocumento) ?? undefined,
		idoperacaofiscal: idOpcionalOuNulo(dados.idoperacaofiscal) ?? undefined,
		observacao: dados.observacao ?? undefined,
		entradasaida: dados.entradasaida ?? undefined,
	});

	if (!notaAtualizada) {
		return httpNaoEncontrado();
	}

	if (dados.aplicarCfopItens && dados.idcfop) {
		const idcfop = idOpcionalOuNulo(dados.idcfop);
		if (idcfop && codigoCfopEntrada) {
			const itens = await listarItensPorNotaFiscal(idRascunho);
			for (const item of itens) {
				const dadosAtuais =
					(item.dadosimportacao as DadosImportacaoItem | null) ?? {
						descricaoFornecedor: item.descricao ?? "",
						statusVinculo: "pendente" as const,
						confirmarCadastro: false,
						fatorConversao: "1",
						quantidadeXml: item.quantidade ?? "0",
						quantidadeEstoque: item.quantidade ?? "0",
						precounitarioXml: item.precounitario ?? "0",
						precounitarioEstoque: item.precounitario ?? "0",
						tributacao: {},
					};

				await atualizarItemNotaFiscal(item.id, {
					idcfop,
					cfop: codigoCfopEntrada,
					dadosimportacao: {
						...dadosAtuais,
						idcfop,
						cfopXml: dadosAtuais.cfopXml,
					},
				});
			}
		}
	}

	return httpOk<NotaFiscal>(notaAtualizada);
}

export async function atualizarItemRascunhoImportacaoNfService({
	idusuario,
	idempresa,
	idRascunho,
	idItem,
	dados,
}: AtualizarItemRascunhoParametros): Promise<
	HttpResponse<NotaFiscalItem & { dadosimportacao: DadosImportacaoItem | null }>
> {
	const validacao = await validarAcessoRascunho(idusuario, idempresa, idRascunho);

	if ("erro" in validacao) {
		return validacao.erro as HttpResponse<
			NotaFiscalItem & { dadosimportacao: DadosImportacaoItem | null }
		>;
	}

	const item = await buscarItemNotaFiscalPorId(idItem, idRascunho);

	if (!item) {
		return httpNaoEncontrado();
	}

	const dadosAtuais = (item.dadosimportacao as DadosImportacaoItem | null) ?? {
		descricaoFornecedor: item.descricao ?? "",
		statusVinculo: "pendente" as const,
		confirmarCadastro: false,
		fatorConversao: "1",
		quantidadeXml: item.quantidade ?? "0",
		quantidadeEstoque: item.quantidade ?? "0",
		precounitarioXml: item.precounitario ?? "0",
		precounitarioEstoque: item.precounitario ?? "0",
		tributacao: {},
	};

	// Nunca sobrescrever cfopXml com o CFOP operacional selecionado no combobox
	const { cfopXml: _cfopXmlIgnorado, ...dadosSemCfopXml } = dados;

	let dadosMesclados: DadosImportacaoItem = {
		...dadosAtuais,
		...dadosSemCfopXml,
		cfopXml: dadosAtuais.cfopXml,
		tributacao: {
			...dadosAtuais.tributacao,
			...dados.tributacao,
		},
	};

	let codigoCfopEntrada: string | null = item.cfop ?? null;

	if (dados.statusVinculo === "vinculado" && dados.idproduto) {
		const produto = await buscarProdutoPorId(dados.idproduto);

		if (!produto || produto.idempresa !== idempresa) {
			return httpBadRequest("Produto não encontrado para vínculo");
		}

		dadosMesclados = {
			...dadosMesclados,
			statusVinculo: "vinculado",
			idproduto: produto.id,
			produtoEncontrado: {
				id: produto.id,
				nome: produto.nome ?? produto.descricao ?? "",
				codigo: produto.codigo ?? undefined,
			},
			confirmarCadastro: false,
			precoVenda:
				dadosMesclados.precoVenda?.trim() ||
				(produto.preco?.trim() ? produto.preco : undefined),
		};

		if (!dadosMesclados.idcfop && produto.idcfopentrada) {
			const cfopProduto = await resolverCfopEntradaPorId(produto.idcfopentrada);
			if (cfopProduto.ok && cfopProduto.idcfop) {
				dadosMesclados = {
					...dadosMesclados,
					idcfop: cfopProduto.idcfop,
				};
				codigoCfopEntrada = cfopProduto.codigo;
			}
		}
	}

	if (dados.statusVinculo === "novo") {
		dadosMesclados = {
			...dadosMesclados,
			statusVinculo: "novo",
			idproduto: undefined,
			produtoEncontrado: undefined,
			confirmarCadastro: true,
		};
	}

	if (dados.statusVinculo === "pendente") {
		dadosMesclados = {
			...dadosMesclados,
			statusVinculo: "pendente",
			idproduto: undefined,
			produtoEncontrado: undefined,
			confirmarCadastro: false,
		};
	}

	if (
		dados.fatorConversao !== undefined ||
		dados.quantidadeXml !== undefined ||
		dados.precounitarioXml !== undefined
	) {
		const { quantidadeEstoque, precounitarioEstoque } = recalcularDadosConversao(
			dadosMesclados.quantidadeXml,
			dadosMesclados.precounitarioXml,
			dadosMesclados.fatorConversao,
		);

		dadosMesclados = {
			...dadosMesclados,
			quantidadeEstoque,
			precounitarioEstoque,
		};
	} else if (
		dados.quantidadeEstoque !== undefined ||
		dados.precounitarioEstoque !== undefined
	) {
		dadosMesclados = {
			...dadosMesclados,
			...(dados.quantidadeEstoque !== undefined && {
				quantidadeEstoque: dados.quantidadeEstoque,
			}),
			...(dados.precounitarioEstoque !== undefined && {
				precounitarioEstoque: dados.precounitarioEstoque,
			}),
		};
	}

	if (dados.ncmXml !== undefined) {
		const ncm = await resolverNcmImportacao(idempresa, dadosMesclados.ncmXml);
		dadosMesclados = {
			...dadosMesclados,
			idncm: ncm?.id,
		};
	}

	if (dados.idunidademedida !== undefined) {
		if (dados.idunidademedida) {
			const unidade = await buscarUnidadeMedidaPorId(dados.idunidademedida);
			dadosMesclados = {
				...dadosMesclados,
				idunidademedida: unidade?.id ?? dados.idunidademedida,
				unidadeEstoque:
					dados.unidadeEstoque ??
					unidade?.codigo ??
					dadosMesclados.unidadeEstoque,
			};
		} else {
			dadosMesclados = {
				...dadosMesclados,
				idunidademedida: undefined,
			};
		}
	}

	if (dados.idcfop !== undefined) {
		const cfopResolvido = await resolverCfopEntradaPorId(
			idOpcionalOuNulo(dados.idcfop),
		);
		if (!cfopResolvido.ok) {
			return httpBadRequest(cfopResolvido.erro);
		}
		dadosMesclados = {
			...dadosMesclados,
			idcfop: cfopResolvido.idcfop ?? undefined,
		};
		codigoCfopEntrada = cfopResolvido.codigo;
	} else if (dadosMesclados.idcfop && !codigoCfopEntrada) {
		const cfopResolvido = await resolverCfopEntradaPorId(dadosMesclados.idcfop);
		if (cfopResolvido.ok && cfopResolvido.codigo) {
			codigoCfopEntrada = cfopResolvido.codigo;
		}
	}

	if (
		dadosMesclados.statusVinculo === "novo" ||
		dadosMesclados.statusVinculo === "vinculado"
	) {
		const validacaoEanAtual = await validarEanProdutoNf(
			idempresa,
			dadosMesclados.eanXml,
			dadosMesclados.statusVinculo === "vinculado"
				? dadosMesclados.idproduto
				: undefined,
		);

		if (!validacaoEanAtual.valido) {
			return httpBadRequest(validacaoEanAtual.mensagem);
		}
	}

	const itemAtualizado = await atualizarItemNotaFiscal(idItem, {
		idproduto: dadosMesclados.idproduto ?? null,
		descricao: dadosMesclados.descricaoFornecedor,
		quantidade: numeroOpcionalOuNulo(dadosMesclados.quantidadeXml) ?? null,
		precounitario: numeroOpcionalOuNulo(dadosMesclados.precounitarioXml) ?? null,
		idcfop: idOpcionalOuNulo(dadosMesclados.idcfop) ?? null,
		cfop: codigoCfopEntrada,
		idncm: idOpcionalOuNulo(dadosMesclados.idncm) ?? null,
		ncm: idOpcionalOuNulo(dadosMesclados.ncmXml) ?? null,
		idunidademedida: idOpcionalOuNulo(dadosMesclados.idunidademedida) ?? null,
		unidade: dadosMesclados.unidadeEstoque ?? dadosMesclados.unidadeXml ?? null,
		situacaotributaria:
			idOpcionalOuNulo(dadosMesclados.tributacao.situacaotributaria) ?? null,
		cstpis: idOpcionalOuNulo(dadosMesclados.tributacao.cstpis) ?? null,
		cstcofins: idOpcionalOuNulo(dadosMesclados.tributacao.cstcofins) ?? null,
		baseicms: numeroOpcionalOuNulo(dadosMesclados.tributacao.baseicms) ?? null,
		percentualicms:
			numeroOpcionalOuNulo(dadosMesclados.tributacao.percentualicms) ?? null,
		icms: numeroOpcionalOuNulo(dadosMesclados.tributacao.icms) ?? null,
		aliquotapis: numeroOpcionalOuNulo(dadosMesclados.tributacao.aliquotapis) ?? null,
		aliquotacofins:
			numeroOpcionalOuNulo(dadosMesclados.tributacao.aliquotacofins) ?? null,
		pis: numeroOpcionalOuNulo(dadosMesclados.tributacao.pis) ?? null,
		cofins: numeroOpcionalOuNulo(dadosMesclados.tributacao.cofins) ?? null,
		ipi: numeroOpcionalOuNulo(dadosMesclados.tributacao.ipi) ?? null,
		origem: dadosMesclados.tributacao.origem ?? 0,
		dadosimportacao: dadosMesclados,
	});

	if (!itemAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk({
		...itemAtualizado,
		dadosimportacao: dadosMesclados,
	});
}

type AplicarGrupoPadraoRascunhoParametros = {
	idusuario: string;
	idempresa: string;
	idRascunho: string;
	idgrupo: string;
};

export type AplicarGrupoPadraoRascunhoResposta = {
	idgrupoPadrao: string;
	quantidadeItens: number;
};

export async function aplicarGrupoPadraoRascunhoImportacaoNfService({
	idusuario,
	idempresa,
	idRascunho,
	idgrupo,
}: AplicarGrupoPadraoRascunhoParametros): Promise<
	HttpResponse<AplicarGrupoPadraoRascunhoResposta>
> {
	const validacao = await validarAcessoRascunho(idusuario, idempresa, idRascunho);

	if ("erro" in validacao) {
		return validacao.erro as HttpResponse<AplicarGrupoPadraoRascunhoResposta>;
	}

	const grupo = await buscarHierarquiaPorId(idgrupo);

	if (!grupo || grupo.idempresa !== idempresa) {
		return httpBadRequest("Grupo não encontrado para esta empresa");
	}

	const itens = await listarItensPorNotaFiscal(idRascunho);
	const dadosNotaAtual =
		(validacao.nota.dadosimportacao as DadosImportacaoNota | null) ?? {};

	const notaAtualizada = await atualizarNotaFiscal(idRascunho, {
		dadosimportacao: {
			...dadosNotaAtual,
			idgrupoPadrao: idgrupo,
		},
	});

	if (!notaAtualizada) {
		return httpNaoEncontrado();
	}

	for (const item of itens) {
		const dadosAtuais = (item.dadosimportacao as DadosImportacaoItem | null) ?? {
			descricaoFornecedor: item.descricao ?? "",
			statusVinculo: "pendente" as const,
			confirmarCadastro: false,
			fatorConversao: "1",
			quantidadeXml: item.quantidade ?? "0",
			quantidadeEstoque: item.quantidade ?? "0",
			precounitarioXml: item.precounitario ?? "0",
			precounitarioEstoque: item.precounitario ?? "0",
			tributacao: {},
		};

		await atualizarItemNotaFiscal(item.id, {
			dadosimportacao: {
				...dadosAtuais,
				idgrupo,
			},
		});
	}

	return httpOk({
		idgrupoPadrao: idgrupo,
		quantidadeItens: itens.length,
	});
}
