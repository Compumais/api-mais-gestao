import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema";
import { db } from "./connection";

type Usuario = typeof schema.usuarios.$inferSelect;

export async function buscarUsuarioPorId(id: string): Promise<Usuario | null> {
	const [usuario] = await db
		.select()
		.from(schema.usuarios)
		.where(eq(schema.usuarios.id, id));

	return usuario || null;
}

export type ListarUsuariosParametros = {
	idempresa: string;
	nome?: string;
	email?: string;
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
