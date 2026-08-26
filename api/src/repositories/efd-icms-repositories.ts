import { and, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
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
	unidademedida,
} from "@/repositories/schema.js";
import type {
	AjusteApuracaoEfd,
	ContribuinteEfd,
	InventarioEfd,
	ItemEfd,
	NotaEfd,
	ParticipanteEfd,
	ProdutoEfd,
} from "@/service/efd-icms/tipos-efd-icms.js";
import { obterDataCompetenciaNotaFiscal } from "@/util/data-competencia-nota-fiscal.js";
import { NFE_STATUS, statusEhCancelada } from "@/util/nfe-status.js";
import { STATUS_NF_CONFIRMADA } from "@/util/nota-fiscal-constants.js";
import { listarAjustesApuracaoEfd } from "./apuracao-efd-ajuste-repositories.js";
import { db } from "./connection.js";

const STATUS_RASCUNHO_IMPORTACAO = 99;

const dataCompetenciaSql = sql<string>`
	case
		when ${notafiscal.tipoorigem} = 0 then coalesce(${notafiscal.entradasaida}, ${notafiscal.emissao})
		else ${notafiscal.emissao}
	end
`;

export type ListarDadosEfdParametros = {
	idempresa: string;
	dataInicio: string;
	dataFim: string;
	dataInventario?: string;
	incluirInventario?: boolean;
};

export async function buscarContribuinteEfd(
	idempresa: string,
): Promise<ContribuinteEfd | null> {
	const [registro] = await db
		.select({
			cnpj: empresa.cnpj,
			inscricaoEstadual: empresafiscal.inscricaoestadual,
			inscricaoMunicipal: empresafiscal.inscricaomunicipal,
			razaosocial: empresafiscal.razaosocial,
			nomefantasia: empresafiscal.nomefantasia,
			uf: empresafiscal.uf,
			codigoMunicipioIbge: empresafiscal.codigomunicipioibge,
			logradouro: empresafiscal.logradouro,
			numero: empresafiscal.numero,
			complemento: empresafiscal.complemento,
			bairro: empresafiscal.bairro,
			cep: empresafiscal.cep,
			telefone: empresafiscal.telefone,
			email: empresafiscal.email,
			crt: empresafiscal.crt,
			indperfil: empresafiscal.indperfil,
			indativ: empresafiscal.indativ,
			cnae: empresafiscal.cnae,
		})
		.from(empresa)
		.innerJoin(empresafiscal, eq(empresafiscal.idempresa, empresa.id))
		.where(eq(empresa.id, idempresa));

	if (!registro) return null;

	const perfil =
		registro.indperfil === "B" || registro.indperfil === "C"
			? registro.indperfil
			: "A";

	return {
		cnpj: registro.cnpj ?? "",
		inscricaoEstadual: registro.inscricaoEstadual ?? "",
		inscricaoMunicipal: registro.inscricaoMunicipal,
		razaosocial: registro.razaosocial ?? "",
		nomefantasia: registro.nomefantasia,
		uf: registro.uf ?? "MG",
		codigoMunicipioIbge: registro.codigoMunicipioIbge,
		logradouro: registro.logradouro,
		numero: registro.numero,
		complemento: registro.complemento,
		bairro: registro.bairro,
		cep: registro.cep,
		telefone: registro.telefone,
		email: registro.email,
		crt: registro.crt,
		indperfil: perfil,
		indativ: registro.indativ === 0 ? 0 : 1,
		cnae: registro.cnae,
	};
}

export async function listarNotasEfd({
	idempresa,
	dataInicio,
	dataFim,
}: ListarDadosEfdParametros): Promise<NotaEfd[]> {
	const notas = await db
		.select({
			id: notafiscal.id,
			tipoorigem: notafiscal.tipoorigem,
			modelo: notafiscal.modelo,
			serie: notafiscal.serie,
			numero: sql<
				string | null
			>`coalesce(${notafiscal.numero}, ${notafiscal.numeronotafiscal})`,
			chave: notafiscal.chavenfe,
			emissao: notafiscal.emissao,
			entradasaida: notafiscal.entradasaida,
			codigoParticipante: notafiscal.identidade,
			valorDocumento: notafiscal.valortotalnota,
			valorMercadoria: notafiscal.totalproduto,
			desconto: notafiscal.descontoproduto,
			frete: notafiscal.frete,
			seguro: notafiscal.seguro,
			outrasDespesas: notafiscal.outrasdespesas,
			baseIcms: notafiscal.baseicms,
			valorIcms: notafiscal.icms,
			baseIcmsSt: notafiscal.baseicmssubstituicao,
			valorIcmsSt: notafiscal.icmssubstituicao,
			valorIpi: notafiscal.ipi,
			valorPis: notafiscal.pis,
			valorCofins: notafiscal.cofins,
			indFrete: notafiscal.tipofrete,
			status: notafiscal.status,
			cancelamento: notafiscal.cancelamento,
		})
		.from(notafiscal)
		.where(
			and(
				eq(notafiscal.idempresa, idempresa),
				gte(dataCompetenciaSql, dataInicio),
				lte(dataCompetenciaSql, dataFim),
				ne(notafiscal.status, STATUS_RASCUNHO_IMPORTACAO),
				or(
					and(
						eq(notafiscal.tipoorigem, 0),
						or(
							eq(notafiscal.status, STATUS_NF_CONFIRMADA),
							eq(notafiscal.status, 2),
						),
					),
					and(
						or(eq(notafiscal.tipoorigem, 1), eq(notafiscal.modelo, "65")),
						or(
							eq(notafiscal.status, NFE_STATUS.AUTORIZADA),
							eq(notafiscal.status, NFE_STATUS.CANCELADA),
							eq(notafiscal.status, NFE_STATUS.CANCELADA_FORA_PRAZO),
							eq(notafiscal.status, NFE_STATUS.DENEGADA),
							eq(notafiscal.status, NFE_STATUS.INUTILIZADA),
						),
					),
				),
			),
		)
		.orderBy(dataCompetenciaSql, notafiscal.modelo, notafiscal.serie);

	return notas.map((nota) => ({
		id: nota.id,
		tipoorigem: nota.tipoorigem,
		modelo: nota.modelo,
		serie: nota.serie,
		numero: nota.numero,
		chave: nota.chave,
		emissao: obterDataCompetenciaNotaFiscal({
			tipoorigem: nota.tipoorigem,
			emissao: nota.emissao,
			entradasaida: nota.entradasaida,
		}),
		dataEntradaSaida: nota.entradasaida ?? nota.emissao,
		codigoParticipante: nota.codigoParticipante,
		valorDocumento: nota.valorDocumento,
		valorMercadoria: nota.valorMercadoria,
		desconto: nota.desconto,
		frete: nota.frete,
		seguro: nota.seguro,
		outrasDespesas: nota.outrasDespesas,
		baseIcms: nota.baseIcms,
		valorIcms: nota.valorIcms,
		baseIcmsSt: nota.baseIcmsSt,
		valorIcmsSt: nota.valorIcmsSt,
		valorIpi: nota.valorIpi,
		valorPis: nota.valorPis,
		valorCofins: nota.valorCofins,
		indFrete: nota.indFrete,
		status: nota.status,
		cancelada: statusEhCancelada(nota.status) || Boolean(nota.cancelamento),
	}));
}

export async function listarItensEfd(idsNotas: string[]): Promise<ItemEfd[]> {
	if (idsNotas.length === 0) return [];

	const itens = await db
		.select({
			id: notafiscalitem.id,
			idnotafiscal: notafiscalitem.idnotafiscal,
			contador: notafiscalitem.contador,
			codigoProduto: sql<
				string | null
			>`coalesce(${produtos.codigo}::text, ${notafiscalitem.produto})`,
			descricao: notafiscalitem.descricao,
			unidade: sql<
				string | null
			>`coalesce(${unidademedida.codigo}, ${notafiscalitem.unidade})`,
			quantidade: notafiscalitem.quantidade,
			valorItem: notafiscalitem.total,
			desconto: notafiscalitem.desconto,
			cfop: sql<
				string | null
			>`coalesce(${notafiscalitem.cfop}, ${cfop.codigo})`,
			cstIcms: notafiscalitem.situacaotributaria,
			csosn: notafiscalitem.situacaotributariasn,
			origem: notafiscalitem.origem,
			baseIcms: notafiscalitem.baseicms,
			aliquotaIcms: notafiscalitem.percentualicms,
			valorIcms: notafiscalitem.icms,
			baseIcmsSt: notafiscalitem.baseicmsst,
			aliquotaIcmsSt: notafiscalitem.aliquotaicmsst,
			valorIcmsSt: notafiscalitem.valoricmsst,
			cstIpi: notafiscalitem.situacaotributariaipi,
			valorIpi: notafiscalitem.ipi,
			cstPis: notafiscalitem.cstpis,
			basePis: notafiscalitem.basepis,
			aliquotaPis: notafiscalitem.aliquotapis,
			valorPis: notafiscalitem.pis,
			cstCofins: notafiscalitem.cstcofins,
			baseCofins: notafiscalitem.basecofins,
			aliquotaCofins: notafiscalitem.aliquotacofins,
			valorCofins: notafiscalitem.cofins,
		})
		.from(notafiscalitem)
		.leftJoin(produtos, eq(notafiscalitem.idproduto, produtos.id))
		.leftJoin(cfop, eq(notafiscalitem.idcfop, cfop.id))
		.leftJoin(
			unidademedida,
			eq(notafiscalitem.idunidademedida, unidademedida.id),
		)
		.where(inArray(notafiscalitem.idnotafiscal, idsNotas))
		.orderBy(notafiscalitem.idnotafiscal, notafiscalitem.contador);

	return itens.map((item, indice) => ({
		id: item.id,
		idnotafiscal: item.idnotafiscal,
		numeroItem: item.contador ?? indice + 1,
		codigoProduto: item.codigoProduto,
		descricao: item.descricao,
		unidade: item.unidade,
		quantidade: item.quantidade,
		valorItem: item.valorItem,
		desconto: item.desconto,
		cfop: item.cfop,
		cstIcms: item.cstIcms,
		csosn: item.csosn,
		origem: item.origem,
		baseIcms: item.baseIcms,
		aliquotaIcms: item.aliquotaIcms,
		valorIcms: item.valorIcms,
		baseIcmsSt: item.baseIcmsSt,
		aliquotaIcmsSt: item.aliquotaIcmsSt,
		valorIcmsSt: item.valorIcmsSt,
		cstIpi: item.cstIpi,
		valorIpi: item.valorIpi,
		cstPis: item.cstPis,
		basePis: item.basePis,
		aliquotaPis: item.aliquotaPis,
		valorPis: item.valorPis,
		cstCofins: item.cstCofins,
		baseCofins: item.baseCofins,
		aliquotaCofins: item.aliquotaCofins,
		valorCofins: item.valorCofins,
	}));
}

export async function listarParticipantesEfd(
	idsParticipantes: string[],
): Promise<ParticipanteEfd[]> {
	const ids = [...new Set(idsParticipantes.filter(Boolean))];
	if (ids.length === 0) return [];

	const registros = await db
		.select({
			id: entidade.id,
			nome: sql<string>`coalesce(${entidade.razaosocial}, ${entidade.nome})`,
			cnpjCpf: entidade.cnpjcpf,
			inscricaoEstadual: entidade.inscricaoestadual,
			codigoMunicipio: entidade.idcidade,
			endereco: entidade.endereco,
			numero: entidade.numeroendereco,
			complemento: entidade.complemento,
			bairro: entidade.bairro,
			pais: entidade.pais,
		})
		.from(entidade)
		.where(inArray(entidade.id, ids));

	return registros.map((registro) => ({
		codigo: registro.id,
		nome: registro.nome,
		cnpjCpf: registro.cnpjCpf,
		inscricaoEstadual: registro.inscricaoEstadual,
		codigoMunicipio: registro.codigoMunicipio,
		endereco: registro.endereco,
		numero: registro.numero,
		complemento: registro.complemento,
		bairro: registro.bairro,
		pais: registro.pais,
	}));
}

export async function listarProdutosEfd(
	idempresa: string,
	codigos: string[],
): Promise<ProdutoEfd[]> {
	const unicos = [...new Set(codigos.filter(Boolean))];
	if (unicos.length === 0) return [];

	const encontrados = await db
		.select({
			codigo: sql<string>`${produtos.codigo}::text`,
			descricao: sql<string>`coalesce(${produtos.descricao}, ${produtos.nome})`,
			barra: produtos.ean,
			unidade: sql<
				string | null
			>`coalesce(${unidademedida.codigo}, ${produtos.unidademedida})`,
			tipoItem: produtos.tipoproduto,
			ncm: sql<string | null>`coalesce(${ncm.codigo}, ${produtos.ncm})`,
			cest: sql<string | null>`${produtos.cest}::text`,
			aliquotaIcms: produtos.aliquotaicmsinterna,
		})
		.from(produtos)
		.leftJoin(ncm, eq(produtos.idncm, ncm.id))
		.leftJoin(unidademedida, eq(produtos.idunidademedida, unidademedida.id))
		.where(eq(produtos.idempresa, idempresa));

	const mapa = new Map<string, ProdutoEfd>();
	for (const produto of encontrados) {
		if (!produto.codigo || !unicos.includes(produto.codigo)) continue;
		mapa.set(produto.codigo, {
			codigo: produto.codigo,
			descricao: produto.descricao,
			barra: produto.barra,
			unidade: produto.unidade ?? "UN",
			tipoItem: produto.tipoItem ?? "00",
			ncm: produto.ncm,
			cest: produto.cest,
			aliquotaIcms: produto.aliquotaIcms,
		});
	}

	for (const codigo of unicos) {
		if (mapa.has(codigo)) continue;
		mapa.set(codigo, {
			codigo,
			descricao: codigo,
			barra: null,
			unidade: "UN",
			tipoItem: "00",
			ncm: null,
			cest: null,
			aliquotaIcms: null,
		});
	}

	return [...mapa.values()];
}

export async function listarInventarioEfd(
	params: ListarDadosEfdParametros,
): Promise<InventarioEfd[]> {
	if (!params.incluirInventario || !params.dataInventario) return [];

	const registros = await db
		.select({
			codigoProduto: inventariofiscal.codigoproduto,
			quantidade: inventariofiscal.quantidade,
			valorUnitario: inventariofiscal.valorunitario,
			valorTotal: inventariofiscal.valortotal,
			indicadorPosse: inventariofiscal.codigoposse,
			unidade: sql<
				string | null
			>`coalesce(${unidademedida.codigo}, ${produtos.unidademedida})`,
		})
		.from(inventariofiscal)
		.leftJoin(produtos, eq(inventariofiscal.idproduto, produtos.id))
		.leftJoin(unidademedida, eq(produtos.idunidademedida, unidademedida.id))
		.where(
			and(
				eq(inventariofiscal.idempresa, params.idempresa),
				eq(inventariofiscal.databaixa, params.dataInventario),
			),
		);

	return registros.map((registro) => ({
		codigoProduto: registro.codigoProduto,
		unidade: registro.unidade,
		quantidade: registro.quantidade,
		valorUnitario: registro.valorUnitario,
		valorTotal: registro.valorTotal,
		indicadorPosse: registro.indicadorPosse ?? "1",
	}));
}

export async function listarAjustesIcmsEfd(
	idempresa: string,
	competencia: string,
): Promise<AjusteApuracaoEfd[]> {
	return listarAjustesApuracaoEfd(idempresa, competencia, "icms");
}
