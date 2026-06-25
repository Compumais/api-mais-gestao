import {
	and,
	count,
	desc,
	eq,
	ilike,
	isNull,
	ne,
	or,
	sql,
} from "drizzle-orm";
import { parametrizacaotributos } from "@/repositories/schema.js";
import { db } from "./connection";

export type ParametrizacaoTributos = typeof parametrizacaotributos.$inferSelect;
export type NovaParametrizacaoTributos =
	typeof parametrizacaotributos.$inferInsert;

export type BuscarParametrizacaoTributosParametros = {
	idempresa: string;
	codigocfopentrada?: string | undefined;
	cstentrada?: string | undefined;
	csosnentrada?: string | undefined;
	ncm?: string | undefined;
	uf?: string | undefined;
	ignorarprimeirodigitocst?: boolean | undefined;
};

function normalizarCstEntrada(
	cst?: string | undefined,
	ignorarPrimeiroDigito?: boolean | number | null,
) {
	if (!cst) return undefined;
	const valor = cst.trim();
	if (!valor) return undefined;
	if (ignorarPrimeiroDigito && valor.length > 2) {
		return valor.slice(-2);
	}
	return valor;
}

export async function buscarParametrizacaoTributosImportacao({
	idempresa,
	codigocfopentrada,
	cstentrada,
	csosnentrada,
	ncm,
	uf,
}: BuscarParametrizacaoTributosParametros) {
	if (!codigocfopentrada) return undefined;

	const ufNormalizada = uf?.trim().toUpperCase() || undefined;

	const registros = await db
		.select()
		.from(parametrizacaotributos)
		.where(
			and(
				eq(parametrizacaotributos.idempresa, idempresa),
				eq(parametrizacaotributos.inativo, 0),
				eq(parametrizacaotributos.codigocfopentrada, codigocfopentrada),
			),
		);

	const candidatos = registros.filter((registro) => {
		if (ufNormalizada && registro.uf && registro.uf !== ufNormalizada) {
			return false;
		}

		if (registro.cstentrada && cstentrada) {
			const cstEntradaNormalizado = normalizarCstEntrada(
				cstentrada,
				registro.ignorarprimeirodigitocst,
			);
			const cstRegraNormalizado = normalizarCstEntrada(
				registro.cstentrada,
				registro.ignorarprimeirodigitocst,
			);
			if (cstRegraNormalizado !== cstEntradaNormalizado) return false;
		} else if (registro.cstentrada) {
			return false;
		}

		if (registro.csosnentrada && csosnentrada) {
			if (registro.csosnentrada !== csosnentrada.trim()) return false;
		} else if (registro.csosnentrada) {
			return false;
		}

		if (registro.ncm && ncm) {
			if (registro.ncm !== ncm.trim()) return false;
		} else if (registro.ncm) {
			return false;
		}

		return true;
	});

	if (candidatos.length === 0) return undefined;

	candidatos.sort((a, b) => {
		const score = (item: ParametrizacaoTributos) =>
			(item.ncm ? 8 : 0) +
			(item.cstentrada ? 4 : 0) +
			(item.csosnentrada ? 2 : 0) +
			(item.uf ? 1 : 0);

		return score(b) - score(a);
	});

	return candidatos[0];
}

export type ListarParametrizacaoTributosParametros = {
	idempresa: string;
	busca?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarParametrizacaoTributos({
	idempresa,
	busca,
	page = 1,
	limit = 10,
}: ListarParametrizacaoTributosParametros) {
	const where = [eq(parametrizacaotributos.idempresa, idempresa)];

	if (busca) {
		where.push(
			or(
				ilike(parametrizacaotributos.codigocfopentrada, `%${busca}%`),
				ilike(parametrizacaotributos.ncm, `%${busca}%`),
				ilike(parametrizacaotributos.cstentrada, `%${busca}%`),
			) ?? sql`true`,
		);
	}

	const filtro = and(...where);
	const offset = (page - 1) * limit;

	const [totalCount, registros] = await Promise.all([
		db.select({ value: count() }).from(parametrizacaotributos).where(filtro),
		db
			.select()
			.from(parametrizacaotributos)
			.where(filtro)
			.orderBy(desc(parametrizacaotributos.codigocfopentrada))
			.limit(limit)
			.offset(offset),
	]);

	return {
		registros,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function buscarParametrizacaoTributosPorId(id: string) {
	const [registro] = await db
		.select()
		.from(parametrizacaotributos)
		.where(eq(parametrizacaotributos.id, id));

	return registro;
}

export async function criarParametrizacaoTributos(dados: NovaParametrizacaoTributos) {
	const [registro] = await db
		.insert(parametrizacaotributos)
		.values(dados)
		.returning();

	return registro;
}

export async function atualizarParametrizacaoTributos(
	id: string,
	dados: Partial<NovaParametrizacaoTributos>,
) {
	const [registro] = await db
		.update(parametrizacaotributos)
		.set(dados)
		.where(eq(parametrizacaotributos.id, id))
		.returning();

	return registro;
}

export async function excluirParametrizacaoTributos(id: string) {
	const [registro] = await db
		.delete(parametrizacaotributos)
		.where(eq(parametrizacaotributos.id, id))
		.returning();

	return registro;
}

export async function buscarParametrizacaoTributosDuplicada(
	idempresa: string,
	codigocfopentrada: string,
	cstentrada?: string | null,
	csosnentrada?: string | null,
	ncm?: string | null,
	uf?: string | null,
	excluirId?: string | undefined,
) {
	const where = [
		eq(parametrizacaotributos.idempresa, idempresa),
		eq(parametrizacaotributos.codigocfopentrada, codigocfopentrada),
		cstentrada
			? eq(parametrizacaotributos.cstentrada, cstentrada)
			: or(
					isNull(parametrizacaotributos.cstentrada),
					eq(parametrizacaotributos.cstentrada, ""),
				),
		csosnentrada
			? eq(parametrizacaotributos.csosnentrada, csosnentrada)
			: or(
					isNull(parametrizacaotributos.csosnentrada),
					eq(parametrizacaotributos.csosnentrada, ""),
				),
		ncm
			? eq(parametrizacaotributos.ncm, ncm)
			: or(isNull(parametrizacaotributos.ncm), eq(parametrizacaotributos.ncm, "")),
		uf
			? eq(parametrizacaotributos.uf, uf)
			: or(isNull(parametrizacaotributos.uf), eq(parametrizacaotributos.uf, "")),
	];

	if (excluirId) {
		where.push(ne(parametrizacaotributos.id, excluirId));
	}

	const [registro] = await db
		.select()
		.from(parametrizacaotributos)
		.where(and(...where))
		.limit(1);

	return registro;
}
