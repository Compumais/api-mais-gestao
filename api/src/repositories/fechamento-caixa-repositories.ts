import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { NovoFechamentoCaixa } from "@/model/fechamento-caixa-model";
import { fechamentopdv } from "@/repositories/schema";
import { db } from "./connection";

export type AtualizarFechamentoCaixaDados = {
	codigo?: string | null | undefined;
	datahora?: string | null | undefined;
	datamodificacao?: Date | null | undefined;
	falta?: string | null | undefined;
	idoperacao?: number | null | undefined;
	idusuario?: string | null | undefined;
	idusuariofechamento?: string | null | undefined;
	idusuariosuprimento?: string | null | undefined;
	local?: number | null | undefined;
	novofechamento?: number | null | undefined;
	observacao?: string | null | undefined;
	pdv?: number | null | undefined;
	saldoapurado?: string | null | undefined;
	saldoconferido?: string | null | undefined;
	saldoinformado?: string | null | undefined;
	sobra?: string | null | undefined;
	status?: number | null | undefined;
	suprimentoinicial?: string | null | undefined;
};

export async function criarFechamentoCaixa(
	dadosFechamentoCaixa: NovoFechamentoCaixa,
) {
	const [registro] = await db
		.insert(fechamentopdv)
		.values(dadosFechamentoCaixa)
		.returning();

	return registro;
}

export async function buscarFechamentoCaixaPorId(id: number) {
	const [registro] = await db
		.select()
		.from(fechamentopdv)
		.where(eq(fechamentopdv.id, id));

	return registro;
}

export async function atualizarFechamentoCaixa(
	id: number,
	dados: AtualizarFechamentoCaixaDados,
) {
	const [registro] = await db
		.update(fechamentopdv)
		.set(dados)
		.where(eq(fechamentopdv.id, id))
		.returning();

	return registro;
}

export async function excluirFechamentoCaixa(id: number) {
	const [registro] = await db
		.delete(fechamentopdv)
		.where(eq(fechamentopdv.id, id))
		.returning();

	return registro;
}

export type ListarFechamentosCaixaParametros = {
	idempresa: string;
	codigo?: string | undefined;
	idusuario?: string | undefined;
	pdv?: number | undefined;
	status?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarFechamentosCaixa({
	idempresa,
	codigo,
	idusuario,
	pdv,
	status,
	page = 1,
	limit = 10,
}: ListarFechamentosCaixaParametros) {
	const where = [eq(fechamentopdv.idempresa, idempresa)];

	if (codigo) {
		where.push(ilike(fechamentopdv.codigo, `%${codigo}%`));
	}

	if (idusuario) {
		where.push(eq(fechamentopdv.idusuario, idusuario));
	}

	if (pdv !== undefined) {
		where.push(eq(fechamentopdv.pdv, pdv));
	}

	if (status !== undefined) {
		where.push(eq(fechamentopdv.status, status));
	}

	const offset = (page - 1) * limit;

	const [totalCount, fechamentosCaixa] = await Promise.all([
		db
			.select({ value: count() })
			.from(fechamentopdv)
			.where(and(...where)),
		db
			.select()
			.from(fechamentopdv)
			.where(and(...where))
			.orderBy(desc(fechamentopdv.id))
			.limit(limit)
			.offset(offset),
	]);

	return {
		fechamentosCaixa,
		total: totalCount[0]?.value ?? 0,
	};
}
