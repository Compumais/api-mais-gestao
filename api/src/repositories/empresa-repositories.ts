import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
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

/**
 * Verifica se um usuário é proprietário de alguma empresa
 */
export async function verificarUsuarioEhProprietario(
	idusuario: string,
): Promise<boolean> {
	const [resultado] = await db
		.select({ value: count() })
		.from(schema.empresa)
		.where(eq(schema.empresa.idproprietario, idusuario));

	return (resultado?.value ?? 0) > 0;
}

export async function atualizarEmpresa(
	id: string,
	dados: {
		nome?: string | undefined;
		cnpj?: string | undefined;
		telefone?: string | undefined;
		atualizadoem?: string | undefined;
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

export async function verificarDadosAssociados(idempresa: string) {
	const [
		resultadoUsuarios,
		resultadoEntidades,
		resultadoContasCorrentes,
		resultadoFinanceiro,
		resultadoPlanoContas,
	] = await Promise.all([
		db
			.select({ value: count() })
			.from(schema.usuarioEmpresa)
			.where(eq(schema.usuarioEmpresa.idempresa, idempresa)),
		db
			.select({ value: count() })
			.from(schema.entidade)
			.where(eq(schema.entidade.idempresa, idempresa)),
		db
			.select({ value: count() })
			.from(schema.contacorrente)
			.where(eq(schema.contacorrente.idempresa, idempresa)),
		db
			.select({ value: count() })
			.from(schema.financeiro)
			.where(eq(schema.financeiro.idempresa, idempresa)),
		db
			.select({ value: count() })
			.from(schema.planocontas)
			.where(eq(schema.planocontas.idempresa, idempresa)),
	]);

	const usuarios = resultadoUsuarios[0];
	const entidades = resultadoEntidades[0];
	const contasCorrentes = resultadoContasCorrentes[0];
	const financeiro = resultadoFinanceiro[0];
	const planoContas = resultadoPlanoContas[0];

	return (
		(usuarios?.value ?? 0) > 0 ||
		(entidades?.value ?? 0) > 0 ||
		(contasCorrentes?.value ?? 0) > 0 ||
		(financeiro?.value ?? 0) > 0 ||
		(planoContas?.value ?? 0) > 0
	);
}

export type ListarEmpresasParametros = {
	idusuario?: string | undefined;
	idproprietario?: string | undefined;
	nome?: string | undefined;
	cnpj?: string | undefined;
	telefone?: string | undefined;
	page?: number;
	limit?: number;
};

export async function listarEmpresas({
	idusuario,
	idproprietario,
	nome,
	cnpj,
	telefone,
	page = 1,
	limit = 10,
}: ListarEmpresasParametros) {
	const where = [];
	const orConditions = [];

	// Se idusuario for passado, buscar empresas da tabela usuario_empresa
	if (idusuario) {
		const empresasUsuarioEmpresa = await db
			.select({ idempresa: schema.usuarioEmpresa.idempresa })
			.from(schema.usuarioEmpresa)
			.where(eq(schema.usuarioEmpresa.idusuario, idusuario));

		const idsEmpresasUsuario = empresasUsuarioEmpresa.map((e) => e.idempresa);
		if (idsEmpresasUsuario.length > 0) {
			orConditions.push(inArray(schema.empresa.id, idsEmpresasUsuario));
		}
	}

	// Se idproprietario for passado, buscar empresas onde é proprietário
	if (idproprietario) {
		orConditions.push(eq(schema.empresa.idproprietario, idproprietario));
	}

	// Se houver condições OR (idusuario ou idproprietario), adicionar ao where
	if (orConditions.length === 1) {
		// Se houver apenas uma condição, adicionar diretamente (não precisa de OR)
		where.push(orConditions[0]);
	} else if (orConditions.length > 1) {
		// Se houver múltiplas condições, usar OR
		where.push(or(...orConditions));
	}

	// Filtros adicionais (nome, cnpj, telefone) são aplicados com AND
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
			.where(where.length > 0 ? and(...where) : undefined),
		db
			.select()
			.from(schema.empresa)
			.where(where.length > 0 ? and(...where) : undefined)
			.orderBy(desc(schema.empresa.criadoem))
			.limit(limit)
			.offset(offset),
	]);

	return {
		empresas,
		total: totalCount[0]?.value ?? 0,
	};
}
