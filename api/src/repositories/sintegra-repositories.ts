import { and, eq, gte, inArray, isNotNull, lte, ne, or, sql } from "drizzle-orm";
import {
	cfop,
	empresa,
	empresafiscal,
	entidade,
	inventariofiscal,
	ncm,
	notafiscal,
	notafiscalitem,
	produtos,
	saldoestoque,
	unidademedida,
} from "@/repositories/schema.js";
import { STATUS_NF_CONFIRMADA } from "@/util/nota-fiscal-constants.js";
import { NFE_STATUS, statusEhCancelada } from "@/util/nfe-status.js";
import { db } from "./connection.js";
import type {
	DadosContribuinteSintegra,
	InventarioSintegra,
	ItemNotaSintegra,
	NotaSintegra,
	ProdutoSintegra,
	ResumoNfceDiarioSintegra,
} from "@/service/sintegra/tipos-sintegra.js";

const STATUS_RASCUNHO_IMPORTACAO = 99;

export type ListarDadosSintegraParametros = {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	dataInventario?: string;
	incluirInventario?: boolean;
};

function parseNumero(valor: string | null | undefined): number {
	const numero = Number.parseFloat(String(valor ?? "0").replace(",", "."));
	return Number.isFinite(numero) ? numero : 0;
}

function resolverSituacaoNota(
	status: number | null,
	cancelada: boolean,
): NotaSintegra["situacao"] {
	if (cancelada || statusEhCancelada(status)) return "S";
	return "N";
}

function resolverEmitente(tipoorigem: number | null): "P" | "T" {
	return tipoorigem === 0 ? "T" : "P";
}

export async function buscarDadosContribuinteSintegra(
	idempresa: string,
): Promise<DadosContribuinteSintegra | null> {
	const [registro] = await db
		.select({
			cnpj: empresa.cnpj,
			inscricaoEstadual: empresafiscal.inscricaoestadual,
			razaosocial: empresafiscal.razaosocial,
			uf: empresafiscal.uf,
			fax: empresafiscal.telefone,
			logradouro: empresafiscal.logradouro,
			numero: empresafiscal.numero,
			complemento: empresafiscal.complemento,
			bairro: empresafiscal.bairro,
			cep: empresafiscal.cep,
			contato: empresafiscal.nomefantasia,
			telefone: empresafiscal.telefone,
			crt: empresafiscal.crt,
			codigoMunicipioIbge: empresafiscal.codigomunicipioibge,
		})
		.from(empresa)
		.innerJoin(empresafiscal, eq(empresafiscal.idempresa, empresa.id))
		.where(eq(empresa.id, idempresa));

	if (!registro) return null;

	return {
		cnpj: registro.cnpj,
		inscricaoEstadual: registro.inscricaoEstadual ?? "",
		razaosocial: registro.razaosocial ?? "",
		municipio: registro.codigoMunicipioIbge ?? "",
		uf: registro.uf ?? "MG",
		fax: registro.fax ?? "",
		logradouro: registro.logradouro ?? "",
		numero: registro.numero ?? "",
		complemento: registro.complemento ?? "",
		bairro: registro.bairro ?? "",
		cep: registro.cep ?? "",
		contato: registro.contato ?? "",
		telefone: registro.telefone ?? "",
		crt: registro.crt,
		codigoMunicipioIbge: registro.codigoMunicipioIbge,
	};
}

export async function listarNotasSintegra({
	idempresa,
	dataInicio,
	dataFim,
}: ListarDadosSintegraParametros): Promise<NotaSintegra[]> {
	const notas = await db
		.select({
			id: notafiscal.id,
			emissao: notafiscal.emissao,
			modelo: notafiscal.modelo,
			serie: notafiscal.serie,
			numero: notafiscal.numero,
			numeronotafiscal: notafiscal.numeronotafiscal,
			cnpjCpf: sql<string | null>`coalesce(${entidade.cnpjcpf}, ${notafiscal.cnpjcpf})`,
			inscricaoEstadual: sql<string | null>`coalesce(${entidade.inscricaoestadual}, ${notafiscal.inscricaoestadual})`,
			uf: sql<string | null>`coalesce(${notafiscal.estado}, ${empresafiscal.uf})`,
			cfopCodigo: cfop.codigo,
			valorTotal: notafiscal.valortotalnota,
			baseIcms: notafiscal.baseicms,
			valorIcms: notafiscal.icms,
			valorIpi: notafiscal.ipi,
			baseIcmsSt: notafiscal.baseicmssubstituicao,
			valorIcmsSt: notafiscal.icmssubstituicao,
			tipoorigem: notafiscal.tipoorigem,
			status: notafiscal.status,
			cancelamento: notafiscal.cancelamento,
		})
		.from(notafiscal)
		.leftJoin(entidade, eq(notafiscal.identidade, entidade.id))
		.leftJoin(cfop, eq(notafiscal.idcfop, cfop.id))
		.leftJoin(empresafiscal, eq(empresafiscal.idempresa, notafiscal.idempresa))
		.where(
			and(
				eq(notafiscal.idempresa, idempresa),
				gte(notafiscal.emissao, dataInicio),
				lte(notafiscal.emissao, dataFim),
				ne(notafiscal.status, STATUS_RASCUNHO_IMPORTACAO),
				or(
					and(
						eq(notafiscal.tipoorigem, 0),
						eq(notafiscal.status, STATUS_NF_CONFIRMADA),
					),
					and(
						or(eq(notafiscal.tipoorigem, 1), eq(notafiscal.modelo, "65")),
						or(
							eq(notafiscal.status, NFE_STATUS.AUTORIZADA),
							eq(notafiscal.status, NFE_STATUS.CANCELADA),
							eq(notafiscal.status, NFE_STATUS.CANCELADA_FORA_PRAZO),
						),
						or(
							isNotNull(notafiscal.chavenfe),
							eq(notafiscal.modelo, "65"),
						),
					),
				),
			),
		)
		.orderBy(notafiscal.emissao);

	return notas.map((nota) => {
		const cancelada =
			statusEhCancelada(nota.status) || Boolean(nota.cancelamento);
		return {
			id: nota.id,
			emissao: nota.emissao,
			modelo: nota.modelo,
			serie: nota.serie,
			numero: nota.numero,
			numeronotafiscal: nota.numeronotafiscal,
			cnpjCpf: nota.cnpjCpf,
			inscricaoEstadual: nota.inscricaoEstadual,
			uf: nota.uf,
			cfopCodigo: nota.cfopCodigo,
			valorTotal: nota.valorTotal,
			baseIcms: nota.baseIcms,
			valorIcms: nota.valorIcms,
			valorIpi: nota.valorIpi,
			baseIcmsSt: nota.baseIcmsSt,
			valorIcmsSt: nota.valorIcmsSt,
			emitente: resolverEmitente(nota.tipoorigem),
			situacao: resolverSituacaoNota(nota.status, cancelada),
			tipoorigem: nota.tipoorigem,
			cancelada,
		};
	});
}

export async function listarItensNotasSintegra(
	idsNotas: string[],
): Promise<ItemNotaSintegra[]> {
	if (idsNotas.length === 0) return [];

	const itens = await db
		.select({
			id: notafiscalitem.id,
			idnotafiscal: notafiscalitem.idnotafiscal,
			contador: notafiscalitem.contador,
			cnpjCpf: sql<string | null>`coalesce(${entidade.cnpjcpf}, ${notafiscal.cnpjcpf})`,
			modelo: notafiscal.modelo,
			serie: notafiscal.serie,
			numero: sql<string | null>`coalesce(${notafiscal.numero}, ${notafiscal.numeronotafiscal})`,
			cfop: sql<string | null>`coalesce(${notafiscalitem.cfop}, ${cfop.codigo})`,
			cst: notafiscalitem.situacaotributaria,
			csosn: notafiscalitem.situacaotributariasn,
			codigoProduto: sql<string | null>`${produtos.codigo}::text`,
			quantidade: notafiscalitem.quantidade,
			valorProduto: notafiscalitem.total,
			desconto: notafiscalitem.desconto,
			baseIcms: notafiscalitem.baseicms,
			baseIcmsSt: sql<string | null>`'0'`,
			valorIpi: notafiscalitem.ipi,
			aliquotaIcms: notafiscalitem.percentualicms,
		})
		.from(notafiscalitem)
		.innerJoin(notafiscal, eq(notafiscalitem.idnotafiscal, notafiscal.id))
		.leftJoin(entidade, eq(notafiscal.identidade, entidade.id))
		.leftJoin(cfop, eq(notafiscalitem.idcfop, cfop.id))
		.leftJoin(produtos, eq(notafiscalitem.idproduto, produtos.id))
		.where(inArray(notafiscalitem.idnotafiscal, idsNotas))
		.orderBy(notafiscalitem.idnotafiscal, notafiscalitem.contador);

	return itens.map((item, indice) => ({
		id: item.id,
		idnotafiscal: item.idnotafiscal,
		numeroItem: item.contador ?? indice + 1,
		cnpjCpf: item.cnpjCpf,
		modelo: item.modelo,
		serie: item.serie,
		numero: item.numero,
		cfop: item.cfop,
		cst: item.cst,
		csosn: item.csosn,
		codigoProduto: item.codigoProduto,
		quantidade: item.quantidade,
		valorProduto: item.valorProduto,
		desconto: item.desconto,
		baseIcms: item.baseIcms,
		baseIcmsSt: item.baseIcmsSt,
		valorIpi: item.valorIpi,
		aliquotaIcms: item.aliquotaIcms,
	}));
}

export async function listarProdutosSintegra(
	idempresa: string,
	codigosProdutos: string[],
): Promise<ProdutoSintegra[]> {
	if (codigosProdutos.length === 0) return [];

	const produtosEncontrados = await db
		.select({
			codigo: sql<string>`${produtos.codigo}::text`,
			descricao: produtos.descricao,
			ncm: ncm.codigo,
			unidade: sql<string | null>`coalesce(${unidademedida.codigo}, ${produtos.unidademedida})`,
			aliquotaIcms: produtos.aliquotaicmsinterna,
			aliquotaIpi: sql<string | null>`'0'`,
			reducaoBaseIcms: produtos.aliquotareducaoicmsnfcesat,
			baseIcmsSt: sql<string | null>`'0'`,
		})
		.from(produtos)
		.leftJoin(ncm, eq(produtos.idncm, ncm.id))
		.leftJoin(unidademedida, eq(produtos.idunidademedida, unidademedida.id))
		.where(eq(produtos.idempresa, idempresa));

	const codigosSet = new Set(codigosProdutos);
	const filtrados = produtosEncontrados.filter(
		(produto) => produto.codigo && codigosSet.has(produto.codigo),
	);

	const mapa = new Map<string, ProdutoSintegra>();
	for (const produto of filtrados) {
		if (!produto.codigo) continue;
		mapa.set(produto.codigo, {
			codigo: produto.codigo,
			descricao: produto.descricao,
			ncm: produto.ncm,
			unidade: produto.unidade,
			aliquotaIcms: produto.aliquotaIcms,
			aliquotaIpi: produto.aliquotaIpi,
			reducaoBaseIcms: produto.reducaoBaseIcms,
			baseIcmsSt: produto.baseIcmsSt,
		});
	}

	for (const codigo of codigosProdutos) {
		if (mapa.has(codigo)) continue;
		mapa.set(codigo, {
			codigo,
			descricao: codigo,
			ncm: null,
			unidade: "UN",
			aliquotaIcms: "0",
			aliquotaIpi: "0",
			reducaoBaseIcms: "0",
			baseIcmsSt: "0",
		});
	}

	return [...mapa.values()].sort((a, b) => a.codigo.localeCompare(b.codigo));
}

export async function listarInventarioFiscalSintegra({
	idempresa,
	dataInventario,
	incluirInventario,
}: ListarDadosSintegraParametros): Promise<InventarioSintegra[]> {
	if (!incluirInventario || !dataInventario) return [];

	const registros = await db
		.select()
		.from(inventariofiscal)
		.where(
			and(
				eq(inventariofiscal.idempresa, idempresa),
				eq(inventariofiscal.databaixa, dataInventario),
			),
		);

	if (registros.length > 0) {
		return registros.map((registro) => ({
			dataInventario: registro.databaixa,
			codigoProduto: registro.codigoproduto,
			quantidade: registro.quantidade,
			valorTotal: registro.valortotal,
			codigoPosse: (registro.codigoposse ?? "1") as InventarioSintegra["codigoPosse"],
			cnpjPossuidor: registro.cnpjpossuidor,
			inscricaoEstadualPossuidor: registro.inscricaoestadualpossuidor,
			ufPossuidor: registro.ufpossuidor,
		}));
	}

	const saldos = await db
		.select({
			codigoProduto: saldoestoque.codigoproduto,
			quantidade: saldoestoque.quantidadefiscal,
			custo: produtos.customedioinicial,
			custoAquisicao: produtos.custoaquisicao,
		})
		.from(saldoestoque)
		.leftJoin(
			produtos,
			and(
				eq(produtos.idempresa, saldoestoque.idempresa),
				eq(sql`${produtos.codigo}::text`, saldoestoque.codigoproduto),
			),
		)
		.where(eq(saldoestoque.idempresa, idempresa));

	return saldos
		.filter((saldo) => parseNumero(saldo.quantidade) > 0 && saldo.codigoProduto)
		.map((saldo) => {
			const quantidade = parseNumero(saldo.quantidade);
			const valorUnitario =
				parseNumero(saldo.custo) || parseNumero(saldo.custoAquisicao);
			return {
				dataInventario,
				codigoProduto: saldo.codigoProduto ?? "0",
				quantidade: saldo.quantidade ?? "0",
				valorTotal: (quantidade * valorUnitario).toFixed(2),
				codigoPosse: "1" as const,
				cnpjPossuidor: null,
				inscricaoEstadualPossuidor: null,
				ufPossuidor: null,
			};
		});
}

export async function listarResumoNfceDiarioSintegra({
	idempresa,
	dataInicio,
	dataFim,
}: ListarDadosSintegraParametros): Promise<ResumoNfceDiarioSintegra[]> {
	const notas = await db
		.select({
			emissao: notafiscal.emissao,
			modelo: notafiscal.modelo,
			serie: notafiscal.serie,
			numero: sql<string | null>`coalesce(${notafiscal.numero}, ${notafiscal.numeronotafiscal})`,
			valorTotal: notafiscal.valortotalnota,
			baseIcms: notafiscal.baseicms,
			valorIcms: notafiscal.icms,
			aliquota: notafiscal.aliquotaicms,
		})
		.from(notafiscal)
		.where(
			and(
				eq(notafiscal.idempresa, idempresa),
				eq(notafiscal.modelo, "65"),
				eq(notafiscal.status, NFE_STATUS.AUTORIZADA),
				gte(notafiscal.emissao, dataInicio),
				lte(notafiscal.emissao, dataFim),
			),
		)
		.orderBy(notafiscal.emissao);

	const agrupados = new Map<string, ResumoNfceDiarioSintegra>();

	for (const nota of notas) {
		const data = nota.emissao?.slice(0, 10) ?? "";
		const chave = `${data}|${nota.serie ?? ""}|${nota.modelo ?? "65"}`;
		const existente = agrupados.get(chave);
		const numeroAtual = nota.numero ?? "0";

		if (!existente) {
			agrupados.set(chave, {
				data,
				modelo: nota.modelo ?? "65",
				serie: nota.serie ?? "",
				numeroInicial: numeroAtual,
				numeroFinal: numeroAtual,
				valorTotal: nota.valorTotal ?? "0",
				baseIcms: nota.baseIcms ?? "0",
				valorIcms: nota.valorIcms ?? "0",
				valorIsento: "0",
				valorOutras: "0",
				aliquota: nota.aliquota ?? "0",
			});
			continue;
		}

		agrupados.set(chave, {
			...existente,
			numeroFinal: numeroAtual,
			valorTotal: String(parseNumero(existente.valorTotal) + parseNumero(nota.valorTotal)),
			baseIcms: String(parseNumero(existente.baseIcms) + parseNumero(nota.baseIcms)),
			valorIcms: String(parseNumero(existente.valorIcms) + parseNumero(nota.valorIcms)),
		});
	}

	return [...agrupados.values()].sort((a, b) => a.data.localeCompare(b.data));
}

export function agruparItensRegistro50(
	notas: NotaSintegra[],
	itens: ItemNotaSintegra[],
): import("@/service/sintegra/tipos-sintegra.js").AgrupamentoRegistro50[] {
	const itensPorNota = new Map<string, ItemNotaSintegra[]>();
	for (const item of itens) {
		const lista = itensPorNota.get(item.idnotafiscal) ?? [];
		lista.push(item);
		itensPorNota.set(item.idnotafiscal, lista);
	}

	const agrupamentos: import("@/service/sintegra/tipos-sintegra.js").AgrupamentoRegistro50[] =
		[];

	for (const nota of notas) {
		const itensNota = itensPorNota.get(nota.id) ?? [];
		if (itensNota.length === 0) {
			agrupamentos.push({
				nota,
				cfop: nota.cfopCodigo ?? "0000",
				aliquota: "0",
				valorTotal: parseNumero(nota.valorTotal),
				baseIcms: parseNumero(nota.baseIcms),
				valorIcms: parseNumero(nota.valorIcms),
				valorIsento: 0,
				valorOutras: 0,
			});
			continue;
		}

		const grupos = new Map<string, ItemNotaSintegra[]>();
		for (const item of itensNota) {
			const cfop = item.cfop ?? nota.cfopCodigo ?? "0000";
			const aliquota = item.aliquotaIcms ?? "0";
			const chave = `${cfop}|${aliquota}`;
			const lista = grupos.get(chave) ?? [];
			lista.push(item);
			grupos.set(chave, lista);
		}

		for (const [chave, grupoItens] of grupos) {
			const [cfopCodigo, aliquota] = chave.split("|");
			const valorTotal = grupoItens.reduce(
				(total, item) => total + parseNumero(item.valorProduto),
				0,
			);
			const baseIcms = grupoItens.reduce(
				(total, item) => total + parseNumero(item.baseIcms),
				0,
			);
			const valorIcms =
				baseIcms * (parseNumero(aliquota) / 100) ||
				grupoItens.reduce((total, item) => total + parseNumero(item.baseIcms), 0);

			agrupamentos.push({
				nota,
				cfop: cfopCodigo ?? "0000",
				aliquota: aliquota ?? "0",
				valorTotal,
				baseIcms,
				valorIcms,
				valorIsento: 0,
				valorOutras: 0,
			});
		}
	}

	return agrupamentos.sort((a, b) => {
		const dataA = a.nota.emissao ?? "";
		const dataB = b.nota.emissao ?? "";
		return dataA.localeCompare(dataB);
	});
}

export function somarIpiPorNota(itens: ItemNotaSintegra[]): Map<string, number> {
	const mapa = new Map<string, number>();
	for (const item of itens) {
		const atual = mapa.get(item.idnotafiscal) ?? 0;
		mapa.set(item.idnotafiscal, atual + parseNumero(item.valorIpi));
	}
	return mapa;
}
