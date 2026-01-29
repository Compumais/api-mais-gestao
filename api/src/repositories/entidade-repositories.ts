import { and, count, desc, eq, ilike, inArray, ne, or } from "drizzle-orm";
import type { NovaEntidade } from "@/model/entidade-model";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export async function criarEntidade(dadosEntidade: NovaEntidade) {
	const [entidade] = await db
		.insert(schema.entidade)
		.values(dadosEntidade)
		.returning();

	return entidade;
}

export async function buscarEntidadePorId(id: string) {
	const [entidade] = await db
		.select()
		.from(schema.entidade)
		.where(eq(schema.entidade.id, id));

	return entidade;
}

export async function atualizarEntidade(
	id: string,
	dados: {
		nome?: string | undefined;
		cnpjcpf?: string | undefined;
		razaosocial?: string | null | undefined;
		tipopessoa?: number | null | undefined;
		inscricaoestadual?: string | null | undefined;
		rg?: string | null | undefined;
		email?: string | null | undefined;
		telefone?: string | null | undefined;
		endereco?: string | null | undefined;
		numeroendereco?: string | null | undefined;
		complemento?: string | null | undefined;
		bairro?: string | null | undefined;
		idcidade?: string | null | undefined;
		idestado?: string | null | undefined;
		cep?: string | null | undefined;
		fax?: string | null | undefined;
		nascimento?: string | null | undefined;
		idplanocontas?: string | null | undefined;
		pais?: string | null | undefined;
		atualizadoem?: string | undefined;
	},
) {
	const [entidade] = await db
		.update(schema.entidade)
		.set(dados)
		.where(eq(schema.entidade.id, id))
		.returning();

	return entidade;
}

export async function excluirEntidade(id: string) {
	const [entidade] = await db
		.delete(schema.entidade)
		.where(eq(schema.entidade.id, id))
		.returning();

	return entidade;
}

export async function verificarEmailTelefoneDuplicado(
	idempresa: string,
	email: string | null | undefined,
	telefone: string | null | undefined,
	excluirEntidadeId?: string,
) {
	const conditions = [];

	if (email) {
		conditions.push(eq(schema.entidade.email, email));
	}

	if (telefone) {
		conditions.push(eq(schema.entidade.telefone, telefone));
	}

	if (conditions.length === 0) {
		return false;
	}

	const whereConditions = [
		eq(schema.entidade.idempresa, idempresa),
		or(...conditions),
	];

	if (excluirEntidadeId) {
		whereConditions.push(ne(schema.entidade.id, excluirEntidadeId));
	}

	const [resultado] = await db
		.select({ value: count() })
		.from(schema.entidade)
		.where(and(...whereConditions));

	return (resultado?.value ?? 0) > 0;
}

export async function verificarUsuarioPertenceEmpresa(
	idusuario: string,
	idempresa: string,
): Promise<boolean> {
	// Verifica se o usuário está na tabela usuarioEmpresa
	const [resultadoUsuarioEmpresa] = await db
		.select({ value: count() })
		.from(schema.usuarioEmpresa)
		.where(
			and(
				eq(schema.usuarioEmpresa.idusuario, idusuario),
				eq(schema.usuarioEmpresa.idempresa, idempresa),
			),
		);

	if ((resultadoUsuarioEmpresa?.value ?? 0) > 0) {
		return true;
	}

	// Verifica se o usuário é o proprietário da empresa
	const [empresa] = await db
		.select({ idproprietario: schema.empresa.idproprietario })
		.from(schema.empresa)
		.where(eq(schema.empresa.id, idempresa));

	return empresa?.idproprietario === idusuario;
}

export async function buscarEmpresasDoUsuario(
	idusuario: string,
): Promise<string[]> {
	// Busca empresas onde o usuário está na tabela usuarioEmpresa
	const empresasUsuarioEmpresa = await db
		.select({ idempresa: schema.usuarioEmpresa.idempresa })
		.from(schema.usuarioEmpresa)
		.where(eq(schema.usuarioEmpresa.idusuario, idusuario));

	// Busca empresas onde o usuário é proprietário
	const empresasProprietario = await db
		.select({ id: schema.empresa.id })
		.from(schema.empresa)
		.where(eq(schema.empresa.idproprietario, idusuario));

	// Combina os IDs únicos de ambas as fontes
	const idsUsuarioEmpresa = empresasUsuarioEmpresa.map((e) => e.idempresa);
	const idsProprietario = empresasProprietario.map((e) => e.id);

	// Remove duplicatas usando Set
	const todosIds = [...new Set([...idsUsuarioEmpresa, ...idsProprietario])];

	return todosIds;
}

export type ListarEntidadesParametros = {
	idempresa: string;
	nome?: string | undefined;
	email?: string | undefined;
	telefone?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarEntidades({
	idempresa,
	nome,
	email,
	telefone,
	page = 1,
	limit = 10,
}: ListarEntidadesParametros) {
	const where = [];

	where.push(eq(schema.entidade.idempresa, idempresa));

	if (nome) {
		where.push(ilike(schema.entidade.nome, `%${nome}%`));
	}

	if (email) {
		where.push(ilike(schema.entidade.email, `%${email}%`));
	}

	if (telefone) {
		where.push(ilike(schema.entidade.telefone, `%${telefone}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, entidades] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.entidade)
			.where(and(...where)),
		db
			.select()
			.from(schema.entidade)
			.where(and(...where))
			.orderBy(desc(schema.entidade.criadoem))
			.limit(limit)
			.offset(offset),
	]);

	return {
		entidades,
		total: totalCount[0]?.value ?? 0,
	};
}
