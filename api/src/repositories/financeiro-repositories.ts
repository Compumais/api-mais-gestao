import {
	and,
	asc,
	count,
	desc,
	eq,
	getTableColumns,
	gte,
	ilike,
	inArray,
	isNull,
	lte,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import type { NovoFinanceiro } from "@/model/financeiro-model.js";
import * as schema from "@/repositories/schema.js";
import { db } from "./connection.js";

export const ORDENAR_FINANCEIROS_CAMPOS = [
	"documento",
	"tipodocumentodescricao",
	"emitente",
	"nomecliente",
	"historico",
	"parcela",
	"status",
	"emissao",
	"vencimento",
	"vencimentooriginal",
	"pagamento",
	"ultimopagamento",
	"baixa",
	"datareferencia",
	"entrada",
	"valor",
	"saldo",
	"valorpagorecebido",
	"planocontasnome",
	"banconome",
	"nossonumero",
	"historico",
	"currenttimemillis",
] as const;

export type OrdenarFinanceirosCampo =
	(typeof ORDENAR_FINANCEIROS_CAMPOS)[number];

const sqlUltimoPagamento = sql<string | null>`COALESCE((SELECT MAX(fl.pagamento) FROM financeirolancamento fl WHERE fl.idfinanceiro = ${schema.financeiro.id} AND COALESCE(fl.cancelado, 0) = 0), ${schema.financeiro.pagamento})`;

const sqlEntidadeNome = sql<string | null>`COALESCE(${schema.entidade.nome}, ${schema.entidade.razaosocial})`;

const sqlCentroCustoNome = sql<string | null>`(SELECT string_agg(DISTINCT cc.nome, ', ' ORDER BY cc.nome) FROM apropriacao_centro_custo acc INNER JOIN centrocusto cc ON cc.id = acc.idcentrocusto WHERE acc.origemtipo = 'financeiro' AND acc.origemid = ${schema.financeiro.id})`;

// Remove prefixo "NF 90 - " / "NF 89/2 - " gravado no emitente (bases migradas/NF).
const NOME_CLIENTE_SQL = sql<string | null>`coalesce(
	nullif(trim(${schema.entidade.razaosocial}), ''),
	nullif(trim(${schema.entidade.nome}), ''),
	nullif(trim(regexp_replace(${schema.financeiro.emitente}, '^[[:space:]]*NF[[:space:]]+[^[:space:]]+[[:space:]]*-[[:space:]]*', '', 'i')), ''),
	nullif(trim(${schema.financeiro.emitente}), '')
)`;

const COLUNAS_ORDENACAO: Record<OrdenarFinanceirosCampo, SQL | Parameters<typeof asc>[0]> = {
	documento: schema.financeiro.documento,
	tipodocumentodescricao: schema.tipodocumentofinanceiro.descricao,
	emitente: sql`COALESCE(NULLIF(TRIM(${schema.financeiro.emitente}), ''), ${schema.entidade.nome}, ${schema.entidade.razaosocial})`,
	nomecliente: NOME_CLIENTE_SQL,
	parcela: schema.financeiro.parcela,
	status: schema.financeiro.status,
	emissao: schema.financeiro.emissao,
	vencimento: schema.financeiro.vencimento,
	vencimentooriginal: schema.financeiro.vencimentooriginal,
	pagamento: sqlUltimoPagamento,
	ultimopagamento: sqlUltimoPagamento,
	baixa: schema.financeiro.baixa,
	datareferencia: schema.financeiro.datareferencia,
	entrada: schema.financeiro.entrada,
	valor: schema.financeiro.valor,
	saldo: schema.financeiro.saldo,
	valorpagorecebido: schema.financeiro.valorpagorecebido,
	planocontasnome: schema.planocontas.nome,
	banconome: schema.banco.nome,
	nossonumero: schema.financeiro.nossonumero,
	historico: schema.financeiro.historico,
	currenttimemillis: schema.financeiro.currenttimemillis,
};

function adicionarFiltroTexto(
	where: SQL[],
	coluna: Parameters<typeof ilike>[0],
	valor: string | null | undefined,
) {
	if (valor?.trim()) {
		where.push(ilike(coluna, `%${valor.trim()}%`));
	}
}

export async function criarFinanceiro(data: NovoFinanceiro) {
	const [financeiro] = await db
		.insert(schema.financeiro)
		.values(data)
		.returning();

	return financeiro;
}

export async function criarFinanceiros(dados: NovoFinanceiro[]) {
	if (dados.length === 0) return [];
	return db.transaction((tx) =>
		tx.insert(schema.financeiro).values(dados).returning(),
	);
}

export async function buscarFinanceiroPorId(id: string) {
	const [financeiro] = await db
		.select()
		.from(schema.financeiro)
		.where(eq(schema.financeiro.id, id));

	return financeiro;
}

export async function buscarFinanceiroPorNossoNumero(params: {
	idempresa: string;
	nossonumero: string;
}) {
	const digitos = params.nossonumero.replace(/\D/g, "");
	const candidatos = [
		params.nossonumero.trim(),
		digitos,
		digitos.padStart(11, "0"),
		digitos.replace(/^0+/, ""),
	];
	const unicos = [...new Set(candidatos.filter((c) => c.length > 0))];

	for (const candidato of unicos) {
		const [titulo] = await db
			.select()
			.from(schema.financeiro)
			.where(
				and(
					eq(schema.financeiro.idempresa, params.idempresa),
					eq(schema.financeiro.nossonumero, candidato),
				),
			)
			.limit(1);
		if (titulo) return titulo;
	}

	return undefined;
}

export async function deletarFinanceiro(id: string) {
	const resultado = await db
		.delete(schema.financeiro)
		.where(eq(schema.financeiro.id, id));

	return resultado;
}

export async function atualizarFinanceiro(
	id: string,
	data: Partial<NovoFinanceiro>,
) {
	const [financeiro] = await db
		.update(schema.financeiro)
		.set(data)
		.where(eq(schema.financeiro.id, id))
		.returning();

	return financeiro;
}

export async function buscarFinanceirosPorOrigem(
	idempresa: string,
	tipoorigem: number,
	idorigem: string,
) {
	return db
		.select()
		.from(schema.financeiro)
		.where(
			and(
				eq(schema.financeiro.idempresa, idempresa),
				eq(schema.financeiro.tipoorigem, tipoorigem),
				eq(schema.financeiro.idorigem, idorigem),
			),
		);
}

export async function excluirFinanceirosPorOrigem(
	idempresa: string,
	tipoorigem: number,
	idorigem: string,
) {
	const removidos = await db
		.delete(schema.financeiro)
		.where(
			and(
				eq(schema.financeiro.idempresa, idempresa),
				eq(schema.financeiro.tipoorigem, tipoorigem),
				eq(schema.financeiro.idorigem, idorigem),
			),
		)
		.returning({ id: schema.financeiro.id });

	return removidos.length;
}

interface ListarFinanceiroParametros {
	idempresas: string[];
	page?: number;
	limit?: number;
	saldo?: string | null | undefined;
	q?: string | null | undefined;
	emissao?: string | null | undefined;
	documento?: string | null | undefined;
	tipodocumentodescricao?: string | null | undefined;
	emitente?: string | null | undefined;
	planocontasnome?: string | null | undefined;
	nossonumero?: string | null | undefined;
	historico?: string | null | undefined;
	emissaoInicio?: string | null | undefined;
	emissaoFim?: string | null | undefined;
	vencimentoInicio?: string | null | undefined;
	vencimentoFim?: string | null | undefined;
	vencimentooriginalInicio?: string | null | undefined;
	vencimentooriginalFim?: string | null | undefined;
	pagamentoInicio?: string | null | undefined;
	pagamentoFim?: string | null | undefined;
	baixaInicio?: string | null | undefined;
	baixaFim?: string | null | undefined;
	datareferenciaInicio?: string | null | undefined;
	datareferenciaFim?: string | null | undefined;
	entradaInicio?: string | null | undefined;
	entradaFim?: string | null | undefined;
	status?: string | null | undefined;
	tipo?: "P" | "R" | null | undefined;
	identidade?: string | null | undefined;
	idtipocobranca?: string | null | undefined;
	remessagerada?: number | null | undefined;
	permiteBoleto?: boolean | null | undefined;
	ordenarPor?: OrdenarFinanceirosCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
}

export async function listarFinanceiro({
	idempresas,
	page = 1,
	limit = 10,
	saldo,
	q,
	emissao,
	documento,
	tipodocumentodescricao,
	emitente,
	planocontasnome,
	nossonumero,
	historico,
	emissaoInicio,
	emissaoFim,
	vencimentoInicio,
	vencimentoFim,
	vencimentooriginalInicio,
	vencimentooriginalFim,
	pagamentoInicio,
	pagamentoFim,
	baixaInicio,
	baixaFim,
	datareferenciaInicio,
	datareferenciaFim,
	entradaInicio,
	entradaFim,
	status,
	tipo,
	identidade,
	idtipocobranca,
	remessagerada,
	permiteBoleto,
	ordenarPor,
	ordem = "desc",
}: ListarFinanceiroParametros) {
	if (idempresas.length === 0) {
		return {
			financeiros: [],
			total: 0,
		};
	}

	const offset = (page - 1) * limit;

	const where: SQL[] = [];

	if (q?.trim()) {
		const termo = `%${q.trim()}%`;
		where.push(
			or(
				ilike(schema.financeiro.documento, termo),
				ilike(schema.financeiro.emitente, termo),
				ilike(schema.financeiro.historico, termo),
				ilike(schema.tipodocumentofinanceiro.descricao, termo),
				ilike(schema.entidade.razaosocial, termo),
				ilike(schema.entidade.nome, termo),
				ilike(schema.entidade.cnpjcpf, termo),
				ilike(schema.financeiro.cnpjcpfemitente, termo),
				sql`${schema.financeiro.valor}::text ilike ${termo}`,
				sql`${schema.financeiro.saldo}::text ilike ${termo}`,
				sql`${schema.financeiro.emissao}::text ilike ${termo}`,
				sql`${schema.financeiro.vencimento}::text ilike ${termo}`,
				sql`${NOME_CLIENTE_SQL} ilike ${termo}`,
			)!,
		);
	}

	if (saldo) {
		where.push(ilike(schema.financeiro.saldo, saldo));
	}

	if (emissao) {
		where.push(ilike(schema.financeiro.emissao, emissao));
	}

	adicionarFiltroTexto(where, schema.financeiro.documento, documento);
	adicionarFiltroTexto(
		where,
		schema.tipodocumentofinanceiro.descricao,
		tipodocumentodescricao,
	);
	adicionarFiltroTexto(where, schema.planocontas.nome, planocontasnome);
	adicionarFiltroTexto(where, schema.financeiro.nossonumero, nossonumero);
	adicionarFiltroTexto(where, schema.financeiro.historico, historico);

	if (emitente?.trim()) {
		const termo = `%${emitente.trim()}%`;
		const condNome = or(
			ilike(schema.financeiro.emitente, termo),
			ilike(schema.entidade.nome, termo),
			ilike(schema.entidade.razaosocial, termo),
		);
		if (condNome) {
			where.push(condNome);
		}
	}

	if (emissaoInicio?.trim()) {
		where.push(gte(schema.financeiro.emissao, emissaoInicio.trim()));
	}
	if (emissaoFim?.trim()) {
		where.push(lte(schema.financeiro.emissao, emissaoFim.trim()));
	}

	if (vencimentoInicio?.trim()) {
		where.push(gte(schema.financeiro.vencimento, vencimentoInicio.trim()));
	}
	if (vencimentoFim?.trim()) {
		where.push(lte(schema.financeiro.vencimento, vencimentoFim.trim()));
	}

	if (vencimentooriginalInicio?.trim()) {
		where.push(
			gte(schema.financeiro.vencimentooriginal, vencimentooriginalInicio.trim()),
		);
	}
	if (vencimentooriginalFim?.trim()) {
		where.push(
			lte(schema.financeiro.vencimentooriginal, vencimentooriginalFim.trim()),
		);
	}

	if (pagamentoInicio?.trim()) {
		where.push(sql`${sqlUltimoPagamento} >= ${pagamentoInicio.trim()}`);
	}
	if (pagamentoFim?.trim()) {
		where.push(sql`${sqlUltimoPagamento} <= ${pagamentoFim.trim()}`);
	}

	if (baixaInicio?.trim()) {
		where.push(gte(schema.financeiro.baixa, baixaInicio.trim()));
	}
	if (baixaFim?.trim()) {
		where.push(lte(schema.financeiro.baixa, baixaFim.trim()));
	}

	if (datareferenciaInicio?.trim()) {
		where.push(
			gte(schema.financeiro.datareferencia, datareferenciaInicio.trim()),
		);
	}
	if (datareferenciaFim?.trim()) {
		where.push(
			lte(schema.financeiro.datareferencia, datareferenciaFim.trim()),
		);
	}

	if (entradaInicio?.trim()) {
		where.push(gte(schema.financeiro.entrada, entradaInicio.trim()));
	}
	if (entradaFim?.trim()) {
		where.push(lte(schema.financeiro.entrada, entradaFim.trim()));
	}

	if (status) {
		where.push(eq(schema.financeiro.status, status));
	}

	if (tipo) {
		where.push(eq(schema.financeiro.tipo, tipo));
	}

	if (identidade?.trim()) {
		where.push(eq(schema.financeiro.identidade, identidade.trim()));
	}

	if (idtipocobranca?.trim()) {
		where.push(eq(schema.financeiro.idtipocobranca, idtipocobranca.trim()));
	}

	if (remessagerada !== undefined && remessagerada !== null) {
		if (remessagerada === 0) {
			where.push(
				or(
					eq(schema.financeiro.remessagerada, 0),
					isNull(schema.financeiro.remessagerada),
				)!,
			);
		} else {
			where.push(eq(schema.financeiro.remessagerada, remessagerada));
		}
	}

	if (permiteBoleto === true) {
		// Aceita flag explícita ou forma de pagamento NF-e 15 (boleto bancário).
		where.push(
			or(
				eq(schema.tipodocumentofinanceiro.permitegerarboleto, 1),
				eq(schema.tipodocumentofinanceiro.formapagamentonfe, "15"),
			)!,
		);
	}

	const ordenacao =
		ordenarPor && COLUNAS_ORDENACAO[ordenarPor]
			? ordem === "asc"
				? asc(COLUNAS_ORDENACAO[ordenarPor])
				: desc(COLUNAS_ORDENACAO[ordenarPor])
			: desc(schema.financeiro.currenttimemillis);

	const condicao = and(
		inArray(schema.financeiro.idempresa, idempresas),
		...where,
	);

	const joinTipoDocumento = eq(
		schema.financeiro.idtipodocumentofinanceiro,
		schema.tipodocumentofinanceiro.id,
	);
	const joinEntidade = eq(schema.financeiro.identidade, schema.entidade.id);
	const joinPlanoContas = eq(
		schema.financeiro.idplanocontas,
		schema.planocontas.id,
	);
	const joinBanco = eq(schema.financeiro.idbanco, schema.banco.id);
	const joinTipoCobranca = eq(
		schema.financeiro.idtipocobranca,
		schema.tipocobranca.id,
	);

	const [totalCount, financeiros] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.financeiro)
			.leftJoin(schema.tipodocumentofinanceiro, joinTipoDocumento)
			.leftJoin(schema.entidade, joinEntidade)
			.leftJoin(schema.planocontas, joinPlanoContas)
			.leftJoin(schema.banco, joinBanco)
			.leftJoin(schema.tipocobranca, joinTipoCobranca)
			.where(condicao),
		db
			.select({
				...getTableColumns(schema.financeiro),
				tipodocumentodescricao: schema.tipodocumentofinanceiro.descricao,
				tipocobrancadescricao: schema.tipocobranca.descricao,
				entidadenome: sqlEntidadeNome,
				nomecliente: NOME_CLIENTE_SQL,
				planocontasnome: schema.planocontas.nome,
				planocontascodigo: schema.planocontas.codigo,
				banconome: schema.banco.nome,
				centrocustonome: sqlCentroCustoNome,
				ultimopagamento: sqlUltimoPagamento,
			})
			.from(schema.financeiro)
			.leftJoin(schema.tipodocumentofinanceiro, joinTipoDocumento)
			.leftJoin(schema.entidade, joinEntidade)
			.leftJoin(schema.planocontas, joinPlanoContas)
			.leftJoin(schema.banco, joinBanco)
			.leftJoin(schema.tipocobranca, joinTipoCobranca)
			.where(condicao)
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		financeiros,
		total: totalCount[0]?.value ?? 0,
	};
}
