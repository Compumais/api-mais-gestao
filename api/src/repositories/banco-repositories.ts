import { and, count, eq, ilike, isNull, or } from "drizzle-orm";
import type { NovoBanco } from "@/model/banco-model.js";
import * as schema from "../../drizzle/schema.js";
import { ordenacaoCodigoVarcharAsc } from "./ordenacao-codigo.js";
import { db } from "./connection.js";

export async function criarBanco(dadosBanco: NovoBanco) {
	const [banco] = await db.insert(schema.banco).values(dadosBanco).returning();

	return banco;
}

export async function buscarBancoPorId(id: string) {
	const [banco] = await db
		.select()
		.from(schema.banco)
		.where(eq(schema.banco.id, id));

	return banco;
}

interface ListarBancosParametros {
	idempresa?: string | undefined;
	nome?: string | undefined;
	codigo?: string | undefined;
	page?: number | undefined;
	limit?: number | undefined;
}

export async function listarBancos({
	idempresa,
	nome,
	codigo,
	page = 1,
	limit = 10,
}: ListarBancosParametros) {
	const where = [];

	if (idempresa) {
		where.push(
			or(eq(schema.banco.idempresa, idempresa), isNull(schema.banco.idempresa)),
		);
	}

	if (nome && nome.trim() !== "") {
		where.push(ilike(schema.banco.nome, `%${nome}%`));
	}

	if (codigo && codigo.trim() !== "") {
		where.push(ilike(schema.banco.codigo, `%${codigo}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, bancos] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.banco)
			.where(and(...where)),
		db
			.select()
			.from(schema.banco)
			.where(and(...where))
			.orderBy(...ordenacaoCodigoVarcharAsc(schema.banco.codigo))
			.limit(limit)
			.offset(offset),
	]);

	return {
		bancos,
		total: totalCount[0]?.value ?? 0,
	};
}

interface AtualizarBancoParametros {
	id: string;
	dados: {
		codigo?: string | undefined;
		nome?: string | undefined;
		currenttimemillis?: number | undefined;
	};
}

export async function atualizarBanco({ id, dados }: AtualizarBancoParametros) {
	const [banco] = await db
		.update(schema.banco)
		.set(dados)
		.where(eq(schema.banco.id, id))
		.returning();

	return banco;
}

export async function excluirBanco(id: string) {
	const [banco] = await db
		.delete(schema.banco)
		.where(eq(schema.banco.id, id))
		.returning();

	return banco;
}
