import { and, count, desc, eq, ilike, inArray, ne, or } from "drizzle-orm";
import type { NovoCliente } from "@/model/cliente-model";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export type Cliente = typeof schema.cliente.$inferSelect;

export async function criarCliente(dadosCliente: NovoCliente) {
	const [cliente] = await db
		.insert(schema.cliente)
		.values(dadosCliente)
		.returning();

	return cliente;
}

export async function buscarClientePorId(id: string) {
	const [cliente] = await db
		.select()
		.from(schema.cliente)
		.where(eq(schema.cliente.id, id));

	return cliente;
}

export async function atualizarCliente(
	id: string,
	dados: {
		nome?: string | undefined;
		email?: string | null | undefined;
		telefone?: string | null | undefined;
		endereco?: string | null | undefined;
		cidade?: string | null | undefined;
		estado?: string | null | undefined;
		cep?: string | null | undefined;
		pais?: string | null | undefined;
		atualizadoEm?: string | undefined;
	},
) {
	const [cliente] = await db
		.update(schema.cliente)
		.set(dados)
		.where(eq(schema.cliente.id, id))
		.returning();

	return cliente;
}

export async function excluirCliente(id: string) {
	const [cliente] = await db
		.delete(schema.cliente)
		.where(eq(schema.cliente.id, id))
		.returning();

	return cliente;
}

export async function verificarEmailTelefoneDuplicado(
	empresaId: string,
	email: string | null | undefined,
	telefone: string | null | undefined,
	excluirClienteId?: string,
) {
	const conditions = [];

	if (email) {
		conditions.push(eq(schema.cliente.email, email));
	}

	if (telefone) {
		conditions.push(eq(schema.cliente.telefone, telefone));
	}

	if (conditions.length === 0) {
		return false;
	}

	const whereConditions = [
		eq(schema.cliente.empresaId, empresaId),
		or(...conditions),
	];

	if (excluirClienteId) {
		whereConditions.push(ne(schema.cliente.id, excluirClienteId));
	}

	const [resultado] = await db
		.select({ value: count() })
		.from(schema.cliente)
		.where(and(...whereConditions));

	return (resultado?.value ?? 0) > 0;
}

export async function verificarUsuarioPertenceEmpresa(
	userId: string,
	empresaId: string,
): Promise<boolean> {
	// Verifica se o usuário está na tabela usuarioEmpresa
	const [resultadoUsuarioEmpresa] = await db
		.select({ value: count() })
		.from(schema.usuarioEmpresa)
		.where(
			and(
				eq(schema.usuarioEmpresa.userId, userId),
				eq(schema.usuarioEmpresa.empresaId, empresaId),
			),
		);

	if ((resultadoUsuarioEmpresa?.value ?? 0) > 0) {
		return true;
	}

	// Verifica se o usuário é o proprietário da empresa
	const [empresa] = await db
		.select({ proprietarioId: schema.empresa.proprietarioId })
		.from(schema.empresa)
		.where(eq(schema.empresa.id, empresaId));

	return empresa?.proprietarioId === userId;
}

export async function buscarEmpresasDoUsuario(
	userId: string,
): Promise<string[]> {
	// Busca empresas onde o usuário está na tabela usuarioEmpresa
	const empresasUsuarioEmpresa = await db
		.select({ empresaId: schema.usuarioEmpresa.empresaId })
		.from(schema.usuarioEmpresa)
		.where(eq(schema.usuarioEmpresa.userId, userId));

	// Busca empresas onde o usuário é proprietário
	const empresasProprietario = await db
		.select({ id: schema.empresa.id })
		.from(schema.empresa)
		.where(eq(schema.empresa.proprietarioId, userId));

	// Combina os IDs únicos de ambas as fontes
	const idsUsuarioEmpresa = empresasUsuarioEmpresa.map((e) => e.empresaId);
	const idsProprietario = empresasProprietario.map((e) => e.id);

	// Remove duplicatas usando Set
	const todosIds = [...new Set([...idsUsuarioEmpresa, ...idsProprietario])];

	return todosIds;
}

export type ListarClientesParametros = {
	empresaIds: string[];
	nome?: string | undefined;
	email?: string | undefined;
	telefone?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarClientes({
	empresaIds,
	nome,
	email,
	telefone,
	page = 1,
	limit = 10,
}: ListarClientesParametros) {
	const where = [];

	if (empresaIds.length === 0) {
		return {
			clientes: [],
			total: 0,
		};
	}

	where.push(inArray(schema.cliente.empresaId, empresaIds));

	if (nome) {
		where.push(ilike(schema.cliente.nome, `%${nome}%`));
	}

	if (email) {
		where.push(ilike(schema.cliente.email, `%${email}%`));
	}

	if (telefone) {
		where.push(ilike(schema.cliente.telefone, `%${telefone}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, clientes] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.cliente)
			.where(and(...where)),
		db
			.select()
			.from(schema.cliente)
			.where(and(...where))
			.orderBy(desc(schema.cliente.criadoEm))
			.limit(limit)
			.offset(offset),
	]);

	return {
		clientes,
		total: totalCount[0]?.value ?? 0,
	};
}
