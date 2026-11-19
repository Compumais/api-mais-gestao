import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	type SQL,
} from "drizzle-orm";
import type { NovoEquipamento } from "@/model/equipamento-model.js";
import { equipamento } from "@/repositories/schema.js";
import { db } from "./connection.js";

export async function criarEquipamento(dados: NovoEquipamento) {
	const [registro] = await db.insert(equipamento).values(dados).returning();
	return registro;
}

export async function buscarEquipamentoPorId(id: string) {
	const [registro] = await db
		.select()
		.from(equipamento)
		.where(eq(equipamento.id, id));
	return registro;
}

export async function buscarEquipamentoPorIdEempresa(
	id: string,
	idempresa: string,
) {
	const [registro] = await db
		.select()
		.from(equipamento)
		.where(and(eq(equipamento.id, id), eq(equipamento.idempresa, idempresa)));
	return registro;
}

export async function buscarEquipamentosPorIds(
	idempresa: string,
	ids: string[],
) {
	if (ids.length === 0) return [];
	return db
		.select()
		.from(equipamento)
		.where(
			and(eq(equipamento.idempresa, idempresa), inArray(equipamento.id, ids)),
		);
}

export async function buscarEquipamentoPorCodigo(
	idempresa: string,
	codigo: string,
) {
	const [registro] = await db
		.select()
		.from(equipamento)
		.where(
			and(eq(equipamento.idempresa, idempresa), eq(equipamento.codigo, codigo)),
		);
	return registro;
}

export async function atualizarEquipamento(
	id: string,
	dados: Partial<NovoEquipamento>,
) {
	const [registro] = await db
		.update(equipamento)
		.set({
			...dados,
			atualizadoem: new Date().toISOString(),
		})
		.where(eq(equipamento.id, id))
		.returning();
	return registro;
}

export async function excluirEquipamento(id: string) {
	const [registro] = await db
		.delete(equipamento)
		.where(eq(equipamento.id, id))
		.returning();
	return registro;
}

export type ListarEquipamentosParametros = {
	idempresa: string;
	descricao?: string;
	codigo?: string;
	situacao?: string;
	page?: number;
	limit?: number;
};

export async function listarEquipamentos({
	idempresa,
	descricao,
	codigo,
	situacao,
	page = 1,
	limit = 20,
}: ListarEquipamentosParametros) {
	const where: SQL[] = [eq(equipamento.idempresa, idempresa)];
	if (descricao?.trim()) {
		where.push(ilike(equipamento.descricao, `%${descricao.trim()}%`));
	}
	if (codigo?.trim()) {
		where.push(ilike(equipamento.codigo, `%${codigo.trim()}%`));
	}
	if (situacao?.trim()) {
		where.push(eq(equipamento.situacao, situacao.trim()));
	}

	const offset = (page - 1) * limit;
	const filtro = and(...where);
	const [totalCount, registros] = await Promise.all([
		db.select({ value: count() }).from(equipamento).where(filtro),
		db
			.select()
			.from(equipamento)
			.where(filtro)
			.orderBy(asc(equipamento.codigo), desc(equipamento.criadoem))
			.limit(limit)
			.offset(offset),
	]);

	return {
		equipamentos: registros,
		total: totalCount[0]?.value ?? 0,
	};
}
