import { and, asc, eq, gt, sql } from "drizzle-orm";
import type { Lote, NovoLote } from "@/model/lote-model.js";
import { lote } from "@/repositories/schema.js";
import { db } from "./connection.js";

export async function buscarLotePorId(id: string) {
	const [registro] = await db.select().from(lote).where(eq(lote.id, id)).limit(1);

	return registro;
}

export async function buscarLotePorNumero(
	idempresa: string,
	idproduto: string,
	numero: string,
) {
	const [registro] = await db
		.select()
		.from(lote)
		.where(
			and(
				eq(lote.idempresa, idempresa),
				eq(lote.idproduto, idproduto),
				eq(lote.numero, numero),
			),
		)
		.limit(1);

	return registro;
}

export async function criarLote(dados: NovoLote) {
	const [registro] = await db.insert(lote).values(dados).returning();

	return registro;
}

export async function atualizarLote(id: string, dados: Partial<NovoLote>) {
	const [registro] = await db
		.update(lote)
		.set(dados)
		.where(eq(lote.id, id))
		.returning();

	return registro;
}

export async function listarLotesPorProduto(
	idempresa: string,
	idproduto: string,
	opcoes?: {
		somenteComSaldo?: boolean | undefined;
		tipoSaldo?: "operacional" | "fiscal" | "ambos" | undefined;
	},
) {
	const condicoes = [
		eq(lote.idempresa, idempresa),
		eq(lote.idproduto, idproduto),
		eq(lote.inativo, 0),
	];

	if (opcoes?.somenteComSaldo) {
		const tipoSaldo = opcoes.tipoSaldo ?? "operacional";
		if (tipoSaldo === "fiscal") {
			condicoes.push(gt(sql`cast(${lote.quantidadefiscal} as numeric)`, 0));
		} else if (tipoSaldo === "ambos") {
			condicoes.push(gt(sql`cast(${lote.quantidade} as numeric)`, 0));
			condicoes.push(gt(sql`cast(${lote.quantidadefiscal} as numeric)`, 0));
		} else {
			condicoes.push(gt(sql`cast(${lote.quantidade} as numeric)`, 0));
		}
	}

	return db
		.select()
		.from(lote)
		.where(and(...condicoes))
		.orderBy(
			sql`case when ${lote.datavalidade} is null then 1 else 0 end`,
			asc(lote.datavalidade),
			sql`case when ${lote.datafabricacao} is null then 1 else 0 end`,
			asc(lote.datafabricacao),
			asc(lote.numero),
		);
}

export async function somarSaldoLotesProduto(
	idempresa: string,
	idproduto: string,
): Promise<number> {
	const [resultado] = await db
		.select({
			total: sql<string>`coalesce(sum(cast(${lote.quantidade} as numeric)), 0)`,
		})
		.from(lote)
		.where(
			and(
				eq(lote.idempresa, idempresa),
				eq(lote.idproduto, idproduto),
				eq(lote.inativo, 0),
			),
		);

	return Number.parseFloat(resultado?.total ?? "0") || 0;
}

export async function aplicarDeltaSaldoLote(
	id: string,
	deltaOperacional: number,
	deltaFiscal: number,
): Promise<Lote | undefined> {
	const registro = await buscarLotePorId(id);
	if (!registro) return undefined;

	const operacional =
		(Number.parseFloat(registro.quantidade ?? "0") || 0) + deltaOperacional;
	const fiscal =
		(Number.parseFloat(registro.quantidadefiscal ?? "0") || 0) + deltaFiscal;

	return atualizarLote(id, {
		quantidade: Math.max(0, operacional).toFixed(6),
		quantidadefiscal: Math.max(0, fiscal).toFixed(6),
	});
}
