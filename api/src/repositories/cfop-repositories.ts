import { and, count, eq, ilike, or, sql } from "drizzle-orm";
import type { NovoCFOP } from "@/model/cfop-model";
import type { TipoMovimentoCfop } from "@/util/cfop-padrao.js";
import { cfop } from "@/repositories/schema.js";
import { db } from "./connection";

export type { NovoCFOP };

const DIGITOS_CFOP_ENTRADA = ["1", "2", "3"] as const;
const DIGITOS_CFOP_SAIDA = ["5", "6", "7"] as const;

function filtroTipoMovimentoCfop(tipomovimento: TipoMovimentoCfop) {
	const digitos =
		tipomovimento === "E" ? DIGITOS_CFOP_ENTRADA : DIGITOS_CFOP_SAIDA;

	return or(
		...digitos.map((digito) =>
			sql`left(regexp_replace(${cfop.codigo}, '[^0-9]', '', 'g'), 1) = ${digito}`,
		),
	);
}

export async function buscarCfopPorId(id: string) {
	const [registro] = await db.select().from(cfop).where(eq(cfop.id, id));

	return registro;
}

export async function buscarCfopPorCodigo(
	idempresa: string,
	codigo: string,
) {
	const codigoNormalizado = codigo.replace(/\D/g, "");

	const [registro] = await db
		.select()
		.from(cfop)
		.where(
			and(
				eq(cfop.idempresa, idempresa),
				or(eq(cfop.codigo, codigoNormalizado), eq(cfop.codigo, codigo)),
			),
		)
		.limit(1);

	return registro;
}

export async function verificarEmpresaPossuiCfops(
	idempresa: string,
): Promise<boolean> {
	const [resultado] = await db
		.select({ value: count() })
		.from(cfop)
		.where(eq(cfop.idempresa, idempresa));

	return (resultado?.value ?? 0) > 0;
}

export async function criarCfop(dadosCfop: NovoCFOP) {
	const [registro] = await db.insert(cfop).values(dadosCfop).returning();

	return registro;
}

const TAMANHO_LOTE_CFOP = 100;

export async function criarCfopsEmLote(dadosCfops: NovoCFOP[]) {
	if (dadosCfops.length === 0) {
		return [];
	}

	const registrosCriados = [];

	for (let indice = 0; indice < dadosCfops.length; indice += TAMANHO_LOTE_CFOP) {
		const lote = dadosCfops.slice(indice, indice + TAMANHO_LOTE_CFOP);
		const registros = await db.insert(cfop).values(lote).returning();
		registrosCriados.push(...registros);
	}

	return registrosCriados;
}

export async function atualizarCfop(id: string, dadosCfop: Partial<NovoCFOP>) {
	const [registro] = await db
		.update(cfop)
		.set(dadosCfop)
		.where(eq(cfop.id, id))
		.returning();

	return registro;
}

export async function excluirCfop(id: string) {
	const [registro] = await db.delete(cfop).where(eq(cfop.id, id)).returning();

	return registro;
}

export type ListarCfopsParametros = {
	idempresa: string;
	descricao?: string | undefined;
	codigo?: string | undefined;
	tipomovimento?: TipoMovimentoCfop | undefined;
	page?: number;
	limit?: number;
};

export async function listarCfops({
	idempresa,
	descricao,
	codigo,
	tipomovimento,
	page = 1,
	limit = 10,
}: ListarCfopsParametros) {
	const where = [];

	where.push(eq(cfop.idempresa, idempresa));

	if (descricao) {
		where.push(ilike(cfop.descricao, `%${descricao}%`));
	}

	if (codigo) {
		where.push(ilike(cfop.codigo, `%${codigo}%`));
	}

	if (tipomovimento) {
		where.push(filtroTipoMovimentoCfop(tipomovimento));
	}

	const offset = (page - 1) * limit;

	const [totalCount, cfops] = await Promise.all([
		db
			.select({ value: count() })
			.from(cfop)
			.where(and(...where)),
		db
			.select()
			.from(cfop)
			.where(and(...where))
			.orderBy(cfop.codigo)
			.limit(limit)
			.offset(offset),
	]);

	return {
		cfops,
		total: totalCount[0]?.value ?? 0,
	};
}
