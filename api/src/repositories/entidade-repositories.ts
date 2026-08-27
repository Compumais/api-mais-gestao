import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	ilike,
	lte,
	ne,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import type { NovaEntidade } from "@/model/entidade-model.js";
import {
	empresa as schemaEmpresa,
	entidade as schemaEntidade,
	usuarioEmpresa as schemaUsuarioEmpresa,
} from "../../drizzle/schema.js";
import { db } from "./connection.js";

export const ORDENAR_ENTIDADES_CAMPOS = [
	"nome",
	"razaosocial",
	"cnpjcpf",
	"endereco",
	"tipopessoa",
	"indiedest",
	"inscricaoestadual",
	"rg",
	"email",
	"telefone",
	"numeroendereco",
	"complemento",
	"bairro",
	"cep",
	"fax",
	"nascimento",
	"pais",
	"criadoem",
] as const;

export type OrdenarEntidadesCampo = (typeof ORDENAR_ENTIDADES_CAMPOS)[number];

const COLUNAS_ORDENACAO = {
	nome: schemaEntidade.nome,
	razaosocial: schemaEntidade.razaosocial,
	cnpjcpf: schemaEntidade.cnpjcpf,
	endereco: schemaEntidade.endereco,
	tipopessoa: schemaEntidade.tipopessoa,
	indiedest: schemaEntidade.indiedest,
	inscricaoestadual: schemaEntidade.inscricaoestadual,
	rg: schemaEntidade.rg,
	email: schemaEntidade.email,
	telefone: schemaEntidade.telefone,
	numeroendereco: schemaEntidade.numeroendereco,
	complemento: schemaEntidade.complemento,
	bairro: schemaEntidade.bairro,
	cep: schemaEntidade.cep,
	fax: schemaEntidade.fax,
	nascimento: schemaEntidade.nascimento,
	pais: schemaEntidade.pais,
	criadoem: schemaEntidade.criadoem,
} as const;

function adicionarFiltroTexto(
	where: SQL[],
	coluna: Parameters<typeof ilike>[0],
	valor: string | undefined,
) {
	if (valor?.trim()) {
		where.push(ilike(coluna, `%${valor.trim()}%`));
	}
}

function filtroDataDiaTimestamp(
	coluna: typeof schemaEntidade.criadoem,
	data: string,
) {
	return and(
		gte(coluna, `${data}T00:00:00.000`),
		lte(coluna, `${data}T23:59:59.999`),
	);
}

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
	if (!cnpjNormalizado) return undefined;

	const [entidade] = await db
		.select()
		.from(schemaEntidade)
		.where(
			and(
				eq(schemaEntidade.idempresa, idempresa),
				sql`regexp_replace(${schemaEntidade.cnpjcpf}, '[^0-9]', '', 'g') = ${cnpjNormalizado}`,
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
		indiedest?: number | null | undefined;
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
	razaosocial?: string | undefined;
	cnpjcpf?: string | undefined;
	endereco?: string | undefined;
	tipopessoa?: number | undefined;
	indiedest?: number | undefined;
	inscricaoestadual?: string | undefined;
	rg?: string | undefined;
	email?: string | undefined;
	telefone?: string | undefined;
	numeroendereco?: string | undefined;
	complemento?: string | undefined;
	bairro?: string | undefined;
	cep?: string | undefined;
	fax?: string | undefined;
	nascimento?: string | undefined;
	pais?: string | undefined;
	criadoem?: string | undefined;
	fornecedor?: number | undefined;
	cliente?: number | undefined;
	transportador?: number | undefined;
	representante?: number | undefined;
	ordenarPor?: OrdenarEntidadesCampo | undefined;
	ordem?: "asc" | "desc" | undefined;
	page?: number;
	limit?: number;
};

export async function listarEntidades({
	idempresa,
	nome,
	q,
	razaosocial,
	cnpjcpf,
	endereco,
	tipopessoa,
	indiedest,
	inscricaoestadual,
	rg,
	email,
	telefone,
	numeroendereco,
	complemento,
	bairro,
	cep,
	fax,
	nascimento,
	pais,
	criadoem,
	fornecedor,
	cliente,
	transportador,
	representante,
	ordenarPor,
	ordem = "asc",
	page = 1,
	limit = 10,
}: ListarEntidadesParametros) {
	const where: SQL[] = [];

	where.push(eq(schemaEntidade.idempresa, idempresa));

	if (fornecedor !== undefined) {
		where.push(eq(schemaEntidade.fornecedor, fornecedor));
	}

	if (cliente !== undefined) {
		where.push(eq(schemaEntidade.cliente, cliente));
	}

	if (transportador !== undefined) {
		where.push(eq(schemaEntidade.transportador, transportador));
	}

	if (representante !== undefined) {
		where.push(eq(schemaEntidade.representante, representante));
	}

	if (q) {
		const termo = `%${q}%`;
		const buscaOr = or(
			ilike(schemaEntidade.nome, termo),
			ilike(schemaEntidade.razaosocial, termo),
			ilike(schemaEntidade.cnpjcpf, termo),
		);
		if (buscaOr) where.push(buscaOr);
	}

	adicionarFiltroTexto(where, schemaEntidade.nome, nome);
	adicionarFiltroTexto(where, schemaEntidade.razaosocial, razaosocial);
	adicionarFiltroTexto(where, schemaEntidade.cnpjcpf, cnpjcpf);
	adicionarFiltroTexto(where, schemaEntidade.endereco, endereco);
	adicionarFiltroTexto(
		where,
		schemaEntidade.inscricaoestadual,
		inscricaoestadual,
	);
	adicionarFiltroTexto(where, schemaEntidade.rg, rg);
	adicionarFiltroTexto(where, schemaEntidade.email, email);
	adicionarFiltroTexto(where, schemaEntidade.telefone, telefone);
	adicionarFiltroTexto(where, schemaEntidade.numeroendereco, numeroendereco);
	adicionarFiltroTexto(where, schemaEntidade.complemento, complemento);
	adicionarFiltroTexto(where, schemaEntidade.bairro, bairro);
	adicionarFiltroTexto(where, schemaEntidade.cep, cep);
	adicionarFiltroTexto(where, schemaEntidade.fax, fax);
	adicionarFiltroTexto(where, schemaEntidade.pais, pais);

	if (tipopessoa !== undefined) {
		where.push(eq(schemaEntidade.tipopessoa, tipopessoa));
	}

	if (indiedest !== undefined) {
		where.push(eq(schemaEntidade.indiedest, indiedest));
	}

	if (nascimento?.trim()) {
		where.push(eq(schemaEntidade.nascimento, nascimento.trim()));
	}

	if (criadoem?.trim()) {
		const condicao = filtroDataDiaTimestamp(
			schemaEntidade.criadoem,
			criadoem.trim(),
		);
		if (condicao) where.push(condicao);
	}

	const offset = (page - 1) * limit;

	const ordenacao =
		ordenarPor && COLUNAS_ORDENACAO[ordenarPor]
			? ordem === "desc"
				? desc(COLUNAS_ORDENACAO[ordenarPor])
				: asc(COLUNAS_ORDENACAO[ordenarPor])
			: desc(schemaEntidade.criadoem);

	const [totalCount, entidades] = await Promise.all([
		db
			.select({ value: count() })
			.from(schemaEntidade)
			.where(and(...where)),
		db
			.select()
			.from(schemaEntidade)
			.where(and(...where))
			.orderBy(ordenacao)
			.limit(limit)
			.offset(offset),
	]);

	return {
		entidades,
		total: totalCount[0]?.value ?? 0,
	};
}
