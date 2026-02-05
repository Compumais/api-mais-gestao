import { and, asc, count, eq, ilike } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { NovoBanco } from "@/model/banco-model.js";
import { BANCOS_PADRAO } from "@/util/bancos-padrao.js";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export async function criarBanco(dadosBanco: NovoBanco) {
	const [banco] = await db.insert(schema.banco).values(dadosBanco).returning();

	return banco;
}

export async function criarBancosPadrao(idempresa: string) {
	const currenttimemillis = Date.now();

	const bancosParaInserir = BANCOS_PADRAO.map((banco) => ({
		id: uuidv4(),
		idempresa,
		codigo: banco.codigo,
		nome: banco.nome,
		currenttimemillis,
	}));

	await db.insert(schema.banco).values(bancosParaInserir);

	return bancosParaInserir;
}

export async function buscarBancoPorId(id: string) {
	const [banco] = await db
		.select()
		.from(schema.banco)
		.where(eq(schema.banco.id, id));

	return banco;
}

interface ListarBancosParametros {
	idempresa?: string;
	nome?: string;
	codigo?: string;
	page?: number;
	limit?: number;
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
		where.push(eq(schema.banco.idempresa, idempresa));
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
			.orderBy(asc(schema.banco.codigo))
			.limit(limit)
			.offset(offset),
	]);

	return {
		bancos,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function atualizarBanco(id: string, dados: Partial<NovoBanco>) {
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
