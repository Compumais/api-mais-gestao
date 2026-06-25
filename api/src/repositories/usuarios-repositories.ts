import { and, desc, eq, ilike, inArray, isNotNull, lte, ne, sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

type Usuario = typeof schema.usuarios.$inferSelect;

export async function buscarUsuarioPorId(id: string): Promise<Usuario | null> {
	const [usuario] = await db
		.select()
		.from(schema.usuarios)
		.where(eq(schema.usuarios.id, id));

	return usuario || null;
}

export async function buscarUsuarioPorEmail(email: string): Promise<Usuario | null> {
	const [usuario] = await db
		.select()
		.from(schema.usuarios)
		.where(eq(schema.usuarios.email, email))
		.limit(1);

	return usuario || null;
}

export async function emailJaUtilizado(
	email: string,
	ignorarId?: string,
): Promise<boolean> {
	const conditions = [eq(schema.usuarios.email, email)];
	if (ignorarId) {
		conditions.push(ne(schema.usuarios.id, ignorarId));
	}

	const [row] = await db
		.select({ value: sql<number>`COUNT(*)::int` })
		.from(schema.usuarios)
		.where(and(...conditions));

	return (row?.value ?? 0) > 0;
}

export type ListarUsuariosGlobalParametros = {
	nome?: string;
	email?: string;
	ativo?: boolean;
	page?: number;
	limit?: number;
};

export async function listarUsuariosGlobal({
	nome,
	email,
	ativo,
	page = 1,
	limit = 20,
}: ListarUsuariosGlobalParametros) {
	const offset = (page - 1) * limit;
	const conditions = [];

	if (nome) {
		conditions.push(ilike(schema.usuarios.nome, `%${nome}%`));
	}
	if (email) {
		conditions.push(ilike(schema.usuarios.email, `%${email}%`));
	}
	if (ativo !== undefined) {
		conditions.push(eq(schema.usuarios.ativo, ativo));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [usuarios, totalRow] = await Promise.all([
		db
			.select()
			.from(schema.usuarios)
			.where(whereClause)
			.orderBy(desc(schema.usuarios.criadoem))
			.limit(limit)
			.offset(offset),
		db
			.select({ value: sql<number>`COUNT(*)::int` })
			.from(schema.usuarios)
			.where(whereClause),
	]);

	return {
		usuarios,
		total: totalRow[0]?.value ?? 0,
	};
}

export async function atualizarUsuarioAdmin(
	id: string,
	dados: Partial<{
		nome: string;
		email: string;
		perfil: string[];
		ativo: boolean;
		plano: string | null;
	}>,
): Promise<Usuario | null> {
	const updateData: Record<string, unknown> = {
		atualizadoem: new Date().toISOString(),
	};

	if (dados.nome !== undefined) updateData.nome = dados.nome;
	if (dados.email !== undefined) updateData.email = dados.email;
	if (dados.perfil !== undefined) updateData.perfil = dados.perfil;
	if (dados.ativo !== undefined) updateData.ativo = dados.ativo;
	if (dados.plano !== undefined) updateData.plano = dados.plano;

	const [usuario] = await db
		.update(schema.usuarios)
		.set(updateData)
		.where(eq(schema.usuarios.id, id))
		.returning();

	return usuario || null;
}

export async function atualizarSenhaContaUsuario(
	idusuario: string,
	senhaHash: string,
): Promise<void> {
	await db
		.update(schema.contas)
		.set({
			password: senhaHash,
			atualizadoem: new Date(),
		})
		.where(
			and(
				eq(schema.contas.idusuario, idusuario),
				eq(schema.contas.idprovedor, "credential"),
			),
		);
}

export async function inativarSessoesUsuario(idusuario: string): Promise<void> {
	await db
		.delete(schema.sessoes)
		.where(eq(schema.sessoes.idusuario, idusuario));
}

export type ListarUsuariosParametros = {
	idempresa: string;
	nome?: string | null | undefined;
	email?: string | null | undefined;
	page?: number;
	limit?: number;
};

export async function listarUsuariosPorEmpresa({
	idempresa,
	nome,
	email,
	page = 1,
	limit = 10,
}: ListarUsuariosParametros) {
	const offset = (page - 1) * limit;

	// Buscar usuários associados à empresa de duas formas:
	// 1. Usuários na tabela usuarioEmpresa com idempresa
	// 2. Proprietário da empresa (empresa.idproprietario)

	// Primeiro, buscar IDs de usuários da tabela usuarioEmpresa
	const usuariosEmpresa = await db
		.select({ idusuario: schema.usuarioEmpresa.idusuario })
		.from(schema.usuarioEmpresa)
		.where(eq(schema.usuarioEmpresa.idempresa, idempresa));

	// Buscar o proprietário da empresa
	const [empresaData] = await db
		.select({ idproprietario: schema.empresa.idproprietario })
		.from(schema.empresa)
		.where(eq(schema.empresa.id, idempresa));

	// Combinar todos os IDs de usuários (da tabela usuarioEmpresa + proprietário)
	const idsUsuarios = new Set<string>();
	for (const ue of usuariosEmpresa) {
		idsUsuarios.add(ue.idusuario);
	}
	if (empresaData?.idproprietario) {
		idsUsuarios.add(empresaData.idproprietario);
	}

	if (idsUsuarios.size === 0) {
		return {
			usuarios: [],
			total: 0,
		};
	}

	// Construir condições WHERE usando IN
	const idsArray = Array.from(idsUsuarios);
	const whereConditions = [inArray(schema.usuarios.id, idsArray)];

	if (nome) {
		whereConditions.push(ilike(schema.usuarios.nome, `%${nome}%`));
	}

	if (email) {
		whereConditions.push(ilike(schema.usuarios.email, `%${email}%`));
	}

	// Query para buscar usuários
	const usuariosQuery = db
		.select()
		.from(schema.usuarios)
		.where(and(...whereConditions))
		.orderBy(desc(schema.usuarios.criadoem))
		.limit(limit)
		.offset(offset);

	// Query para contar total
	const totalQuery = db
		.select({
			value: sql<number>`COUNT(*)::int`,
		})
		.from(schema.usuarios)
		.where(and(...whereConditions));

	const [usuarios, totalCount] = await Promise.all([usuariosQuery, totalQuery]);

	return {
		usuarios,
		total: totalCount[0]?.value ?? 0,
	};
}

export async function buscarEmpresasDoUsuario(
	idusuario: string,
): Promise<string[]> {
	// Buscar empresas onde o usuário está na tabela usuarioEmpresa
	const empresasUsuarioEmpresa = await db
		.select({ idempresa: schema.usuarioEmpresa.idempresa })
		.from(schema.usuarioEmpresa)
		.where(eq(schema.usuarioEmpresa.idusuario, idusuario));

	// Buscar empresas onde o usuário é proprietário
	const empresasProprietario = await db
		.select({ id: schema.empresa.id })
		.from(schema.empresa)
		.where(eq(schema.empresa.idproprietario, idusuario));

	// Combinar os IDs únicos de ambas as fontes
	const idsUsuarioEmpresa = empresasUsuarioEmpresa.map((e) => e.idempresa);
	const idsProprietario = empresasProprietario.map((e) => e.id);

	// Remove duplicatas usando Set
	const todosIds = [...new Set([...idsUsuarioEmpresa, ...idsProprietario])];

	return todosIds;
}

/**
 * Lista IDs de usuários com perfil "financeiro" vinculados à empresa (usuario_empresas).
 */
export async function listarIdsUsuariosFinanceirosPorEmpresa(
	idempresa: string,
): Promise<string[]> {
	const rows = await db
		.select({ idusuario: schema.usuarioEmpresa.idusuario })
		.from(schema.usuarioEmpresa)
		.innerJoin(
			schema.usuarios,
			eq(schema.usuarioEmpresa.idusuario, schema.usuarios.id),
		)
		.where(
			and(
				eq(schema.usuarioEmpresa.idempresa, idempresa),
				sql`${schema.usuarios.perfil}::jsonb @> '["financeiro"]'::jsonb`,
			),
		);

	return rows.map((r) => r.idusuario);
}

export async function listarUsuariosComPlanoProximoVencido(dataReferencia: Date) {
	const dataStr = dataReferencia.toISOString().slice(0, 10);

	return db
		.select({
			id: schema.usuarios.id,
			plano: schema.usuarios.plano,
			plano_proximo: schema.usuarios.plano_proximo,
			plano_fim_ciclo: schema.usuarios.plano_fim_ciclo,
		})
		.from(schema.usuarios)
		.where(
			and(
				isNotNull(schema.usuarios.plano_proximo),
				isNotNull(schema.usuarios.plano_fim_ciclo),
				lte(schema.usuarios.plano_fim_ciclo, dataStr),
			),
		);
}

export type UsuarioPlano = {
	plano: string | null;
	plano_inicio_ciclo: Date | null;
	plano_fim_ciclo: Date | null;
	plano_proximo: string | null;
};

export async function buscarPlanoUsuario(
	id: string,
): Promise<UsuarioPlano | null> {
	const [usuario] = await db
		.select({
			plano: schema.usuarios.plano,
			plano_inicio_ciclo: schema.usuarios.plano_inicio_ciclo,
			plano_fim_ciclo: schema.usuarios.plano_fim_ciclo,
			plano_proximo: schema.usuarios.plano_proximo,
		})
		.from(schema.usuarios)
		.where(eq(schema.usuarios.id, id))
		.limit(1);

	if (!usuario) {
		return null;
	}

	return {
		plano: usuario.plano,
		plano_inicio_ciclo: usuario.plano_inicio_ciclo
			? new Date(usuario.plano_inicio_ciclo)
			: null,
		plano_fim_ciclo: usuario.plano_fim_ciclo
			? new Date(usuario.plano_fim_ciclo)
			: null,
		plano_proximo: usuario.plano_proximo,
	};
}

export async function atualizarPlanoUsuario(
	id: string,
	dados: Partial<UsuarioPlano>,
): Promise<Usuario | null> {
	const updateData: Record<string, unknown> = {};

	if (dados.plano !== undefined) {
		updateData.plano = dados.plano;
	}
	if (dados.plano_inicio_ciclo !== undefined) {
		updateData.plano_inicio_ciclo = dados.plano_inicio_ciclo;
	}
	if (dados.plano_fim_ciclo !== undefined) {
		updateData.plano_fim_ciclo = dados.plano_fim_ciclo;
	}
	if (dados.plano_proximo !== undefined) {
		updateData.plano_proximo = dados.plano_proximo;
	}

	const [usuario] = await db
		.update(schema.usuarios)
		.set(updateData)
		.where(eq(schema.usuarios.id, id))
		.returning();

	return usuario || null;
}
