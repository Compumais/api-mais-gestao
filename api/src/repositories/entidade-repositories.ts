import { and, count, desc, eq, ilike, ne, or } from "drizzle-orm";
import type { NovaEntidade } from "@/model/entidade-model.js";
import {
	empresa as schemaEmpresa,
	entidade as schemaEntidade,
	usuarioEmpresa as schemaUsuarioEmpresa,
} from "../../drizzle/schema.js";
import { db } from "./connection.js";

export async function criarEntidade(dadosEntidade: NovaEntidade) {
	const [entidade] = await db
		.insert(schemaEntidade)
		.values(dadosEntidade)
		.returning();

	return entidade;
}

export async function buscarEntidadePorId(id: string) {
	const [entidade] = await db
		.select()
		.from(schemaEntidade)
		.where(eq(schemaEntidade.id, id));

	return entidade;
}

export async function buscarEntidadePorCnpj(idempresa: string, cnpj: string) {
	const cnpjNormalizado = cnpj.replace(/\D/g, "");

	const [entidade] = await db
		.select()
		.from(schemaEntidade)
		.where(
			and(
				eq(schemaEntidade.idempresa, idempresa),
				or(
					eq(schemaEntidade.cnpjcpf, cnpjNormalizado),
					eq(schemaEntidade.cnpjcpf, cnpj),
				),
			),
		)
		.limit(1);

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
		cliente?: number | undefined;
		fornecedor?: number | undefined;
		transportador?: number | undefined;
		representante?: number | undefined;
	},
) {
	const [entidade] = await db
		.update(schemaEntidade)
		.set(dados)
		.where(eq(schemaEntidade.id, id))
		.returning();

	return entidade;
}

export async function excluirEntidade(id: string) {
	const [entidade] = await db
		.delete(schemaEntidade)
		.where(eq(schemaEntidade.id, id))
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
		conditions.push(eq(schemaEntidade.email, email));
	}

	if (telefone) {
		conditions.push(eq(schemaEntidade.telefone, telefone));
	}

	if (conditions.length === 0) {
		return false;
	}

	const whereConditions = [
		eq(schemaEntidade.idempresa, idempresa),
		or(...conditions),
	];

	if (excluirEntidadeId) {
		whereConditions.push(ne(schemaEntidade.id, excluirEntidadeId));
	}

	const [resultado] = await db
		.select({ value: count() })
		.from(schemaEntidade)
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
		.from(schemaUsuarioEmpresa)
		.where(
			and(
				eq(schemaUsuarioEmpresa.idusuario, idusuario),
				eq(schemaUsuarioEmpresa.idempresa, idempresa),
			),
		);

	if ((resultadoUsuarioEmpresa?.value ?? 0) > 0) {
		return true;
	}

	// Verifica se o usuário é o proprietário da empresa
	const [empresa] = await db
		.select({ idproprietario: schemaEmpresa.idproprietario })
		.from(schemaEmpresa)
		.where(eq(schemaEmpresa.id, idempresa));

	return empresa?.idproprietario === idusuario;
}

export async function buscarEmpresasDoUsuario(
	idusuario: string,
): Promise<string[]> {
	// Busca empresas onde o usuário está na tabela usuarioEmpresa
	const empresasUsuarioEmpresa = await db
		.select({ idempresa: schemaUsuarioEmpresa.idempresa })
		.from(schemaUsuarioEmpresa)
		.where(eq(schemaUsuarioEmpresa.idusuario, idusuario));

	// Busca empresas onde o usuário é proprietário
	const empresasProprietario = await db
		.select({ id: schemaEmpresa.id })
		.from(schemaEmpresa)
		.where(eq(schemaEmpresa.idproprietario, idusuario));

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
	q?: string | undefined;
	email?: string | undefined;
	telefone?: string | undefined;
	fornecedor?: number | undefined;
	cliente?: number | undefined;
	transportador?: number | undefined;
	representante?: number | undefined;
	page?: number;
	limit?: number;
};

export async function listarEntidades({
	idempresa,
	nome,
	q,
	email,
	telefone,
	fornecedor,
	cliente,
	transportador,
	representante,
	page = 1,
	limit = 10,
}: ListarEntidadesParametros) {
	const where = [];

	where.push(eq(schemaEntidade.idempresa, idempresa));

	if (fornecedor) {
		where.push(eq(schemaEntidade.fornecedor, fornecedor));
	}

	if (cliente) {
		where.push(eq(schemaEntidade.cliente, cliente));
	}

	if (transportador) {
		where.push(eq(schemaEntidade.transportador, transportador));
	}

	if (representante) {
		where.push(eq(schemaEntidade.representante, representante));
	}

	if (nome) {
		where.push(ilike(schemaEntidade.nome, `%${nome}%`));
	}

	if (q) {
		const termo = `%${q}%`;
		where.push(
			or(
				ilike(schemaEntidade.nome, termo),
				ilike(schemaEntidade.razaosocial, termo),
				ilike(schemaEntidade.cnpjcpf, termo),
			),
		);
	}

	if (email) {
		where.push(ilike(schemaEntidade.email, `%${email}%`));
	}

	if (telefone) {
		where.push(ilike(schemaEntidade.telefone, `%${telefone}%`));
	}

	const offset = (page - 1) * limit;

	const [totalCount, entidades] = await Promise.all([
		db
			.select({ value: count() })
			.from(schemaEntidade)
			.where(and(...where)),
		db
			.select()
			.from(schemaEntidade)
			.where(and(...where))
			.orderBy(desc(schemaEntidade.criadoem))
			.limit(limit)
			.offset(offset),
	]);

	return {
		entidades,
		total: totalCount[0]?.value ?? 0,
	};
}
