import { and, count, desc, eq, ilike } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type Empresa = typeof schema.empresa.$inferSelect;
export type NovaEmpresa = typeof schema.empresa.$inferInsert;

export async function criarEmpresa(dadosEmpresa: NovaEmpresa) {
	const empresa = await db
		.insert(schema.empresa)
		.values(dadosEmpresa)
		.returning();

	return empresa;
}

export async function buscarEmpresaPorId(id: string) {
	const [empresa] = await db
		.select()
		.from(schema.empresa)
		.where(eq(schema.empresa.id, id));

	return empresa;
}

export async function atualizarEmpresa(
	id: string,
	dados: {
		nome?: string | undefined;
		cnpj?: string | undefined;
		telefone?: string | undefined;
		atualizadoEm?: string | undefined;
	},
) {
	const [empresa] = await db
		.update(schema.empresa)
		.set(dados)
		.where(eq(schema.empresa.id, id))
		.returning();

	return empresa;
}

export async function excluirEmpresa(id: string) {
	const [empresa] = await db
		.delete(schema.empresa)
		.where(eq(schema.empresa.id, id))
		.returning();

	return empresa;
}

export async function verificarDadosAssociados(empresaId: string) {
	const [
		resultadoUsuarios,
		resultadoClientes,
		resultadoContasCorrentes,
		resultadoFinanceiro,
		resultadoPlanoContas,
	] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.usuarioEmpresa)
			.where(eq(schema.usuarioEmpresa.empresaId, empresaId)),
		db
			.select({ value: count() })
			.from(schema.cliente)
			.where(eq(schema.cliente.empresaId, empresaId)),
		db
			.select({ value: count() })
			.from(schema.contacorrente)
			.where(eq(schema.contacorrente.empresaId, empresaId)),
		db
			.select({ value: count() })
			.from(schema.financeiro)
			.where(eq(schema.financeiro.empresaId, empresaId)),
		db
			.select({ value: count() })
			.from(schema.planocontas)
			.where(eq(schema.planocontas.empresaId, empresaId)),
	]);

	const usuarios = resultadoUsuarios[0];
	const clientes = resultadoClientes[0];
	const contasCorrentes = resultadoContasCorrentes[0];
	const financeiro = resultadoFinanceiro[0];
	const planoContas = resultadoPlanoContas[0];

	return (
		(usuarios?.value ?? 0) > 0 ||
		(clientes?.value ?? 0) > 0 ||
		(contasCorrentes?.value ?? 0) > 0 ||
		(financeiro?.value ?? 0) > 0 ||
		(planoContas?.value ?? 0) > 0
	);
}

export type ListarEmpresasParametros = {
	proprietarioId?: string | undefined;
	nome?: string | undefined;
	cnpj?: string | undefined;
	telefone?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarEmpresas({
	proprietarioId,
	nome,
	cnpj,
	telefone,
	page = 1,
	limit = 10,
}: ListarEmpresasParametros) {
	const where = [];
	if (proprietarioId) {
		where.push(eq(schema.empresa.proprietarioId, proprietarioId));
	}
	if (nome) {
		where.push(ilike(schema.empresa.nome, `%${nome}%`));
	}
	if (cnpj) {
		where.push(eq(schema.empresa.cnpj, cnpj));
	}
	if (telefone) {
		where.push(ilike(schema.empresa.telefone, `%${telefone}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, empresas] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.empresa)
			.where(and(...where)),
		db
			.select()
			.from(schema.empresa)
			.where(and(...where))
			.orderBy(desc(schema.empresa.criadoEm))
			.limit(limit)
			.offset(offset),
	]);

	return {
		empresas,
		total: totalCount[0]?.value ?? 0,
	};
}
