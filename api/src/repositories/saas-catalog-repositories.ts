import { and, asc, eq, inArray } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "./connection.js";

export async function listarPlanosSaas(apenasAtivos = true) {
	const where = apenasAtivos ? eq(schema.planosSaas.ativo, true) : undefined;
	return db
		.select()
		.from(schema.planosSaas)
		.where(where)
		.orderBy(asc(schema.planosSaas.ordem));
}

export async function buscarPlanoSaasPorCodigo(codigo: string) {
	const [plano] = await db
		.select()
		.from(schema.planosSaas)
		.where(eq(schema.planosSaas.codigo, codigo))
		.limit(1);
	return plano ?? null;
}

export async function buscarPlanoSaasPorId(id: string) {
	const [plano] = await db
		.select()
		.from(schema.planosSaas)
		.where(eq(schema.planosSaas.id, id))
		.limit(1);
	return plano ?? null;
}

export async function criarPlanoSaas(dados: {
	id: string;
	codigo: string;
	nome: string;
	descricao?: string | null;
	valormensal: string;
	maxempresas: number;
	maxusuarios: number;
	ordem: number;
	ativo?: boolean;
}) {
	const agora = new Date().toISOString();
	const [criado] = await db
		.insert(schema.planosSaas)
		.values({
			id: dados.id,
			codigo: dados.codigo,
			nome: dados.nome,
			descricao: dados.descricao ?? null,
			valormensal: dados.valormensal,
			maxempresas: dados.maxempresas,
			maxusuarios: dados.maxusuarios,
			ordem: dados.ordem,
			ativo: dados.ativo ?? true,
			criadoem: agora,
			atualizadoem: agora,
		})
		.returning();
	return criado ?? null;
}

export async function atualizarPlanoSaas(
	id: string,
	dados: Partial<{
		nome: string;
		descricao: string | null;
		valormensal: string;
		maxempresas: number;
		maxusuarios: number;
		ordem: number;
		ativo: boolean;
	}>,
) {
	const [atualizado] = await db
		.update(schema.planosSaas)
		.set({
			...dados,
			atualizadoem: new Date().toISOString(),
		})
		.where(eq(schema.planosSaas.id, id))
		.returning();
	return atualizado ?? null;
}

export async function listarFeaturesDoPlano(idplano: string) {
	return db
		.select({
			id: schema.featuresSaas.id,
			codigo: schema.featuresSaas.codigo,
			nome: schema.featuresSaas.nome,
			descricao: schema.featuresSaas.descricao,
			ativo: schema.featuresSaas.ativo,
		})
		.from(schema.planoSaasFeatures)
		.innerJoin(
			schema.featuresSaas,
			eq(schema.planoSaasFeatures.idfeature, schema.featuresSaas.id),
		)
		.where(eq(schema.planoSaasFeatures.idplano, idplano));
}

export async function listarCodigosFeaturesDoPlano(idplano: string) {
	const rows = await listarFeaturesDoPlano(idplano);
	return rows
		.filter((f: { ativo: boolean }) => f.ativo)
		.map((f: { codigo: string }) => f.codigo);
}

export async function listarFeaturesSaas(apenasAtivos = true) {
	const where = apenasAtivos ? eq(schema.featuresSaas.ativo, true) : undefined;
	return db.select().from(schema.featuresSaas).where(where);
}

export async function substituirFeaturesDoPlano(
	idplano: string,
	idfeatures: string[],
) {
	await db
		.delete(schema.planoSaasFeatures)
		.where(eq(schema.planoSaasFeatures.idplano, idplano));
	if (idfeatures.length === 0) return;
	await db.insert(schema.planoSaasFeatures).values(
		idfeatures.map((idfeature) => ({
			idplano,
			idfeature,
			criadoem: new Date().toISOString(),
		})),
	);
}

export async function listarModulosSaas(apenasAtivos = true) {
	const where = apenasAtivos ? eq(schema.modulosSaas.ativo, true) : undefined;
	return db.select().from(schema.modulosSaas).where(where);
}

export async function buscarModuloSaasPorCodigo(codigo: string) {
	const [modulo] = await db
		.select()
		.from(schema.modulosSaas)
		.where(eq(schema.modulosSaas.codigo, codigo))
		.limit(1);
	return modulo ?? null;
}

export async function buscarModuloSaasPorId(id: string) {
	const [modulo] = await db
		.select()
		.from(schema.modulosSaas)
		.where(eq(schema.modulosSaas.id, id))
		.limit(1);
	return modulo ?? null;
}

export async function criarModuloSaas(dados: {
	id: string;
	codigo: string;
	nome: string;
	descricao?: string | null;
	valormensal: string;
	ativo?: boolean;
}) {
	const agora = new Date().toISOString();
	const [criado] = await db
		.insert(schema.modulosSaas)
		.values({
			id: dados.id,
			codigo: dados.codigo,
			nome: dados.nome,
			descricao: dados.descricao ?? null,
			valormensal: dados.valormensal,
			ativo: dados.ativo ?? true,
			criadoem: agora,
			atualizadoem: agora,
		})
		.returning();
	return criado ?? null;
}

export async function atualizarModuloSaas(
	id: string,
	dados: Partial<{
		nome: string;
		descricao: string | null;
		valormensal: string;
		ativo: boolean;
	}>,
) {
	const [atualizado] = await db
		.update(schema.modulosSaas)
		.set({
			...dados,
			atualizadoem: new Date().toISOString(),
		})
		.where(eq(schema.modulosSaas.id, id))
		.returning();
	return atualizado ?? null;
}

export async function listarModulosAtivosDoUsuario(idusuario: string) {
	return db
		.select({
			id: schema.usuarioModulos.id,
			idmodulo: schema.usuarioModulos.idmodulo,
			status: schema.usuarioModulos.status,
			origem: schema.usuarioModulos.origem,
			codigo: schema.modulosSaas.codigo,
			nome: schema.modulosSaas.nome,
			valormensal: schema.modulosSaas.valormensal,
			idassinaturaasaas: schema.usuarioModulos.idassinaturaasaas,
			proximovencimento: schema.usuarioModulos.proximovencimento,
		})
		.from(schema.usuarioModulos)
		.innerJoin(
			schema.modulosSaas,
			eq(schema.usuarioModulos.idmodulo, schema.modulosSaas.id),
		)
		.where(
			and(
				eq(schema.usuarioModulos.idusuario, idusuario),
				eq(schema.usuarioModulos.status, "ACTIVE"),
			),
		);
}

export async function buscarUsuarioModulo(idusuario: string, idmodulo: string) {
	const [row] = await db
		.select()
		.from(schema.usuarioModulos)
		.where(
			and(
				eq(schema.usuarioModulos.idusuario, idusuario),
				eq(schema.usuarioModulos.idmodulo, idmodulo),
			),
		)
		.limit(1);
	return row ?? null;
}

export async function upsertUsuarioModulo(dados: {
	id: string;
	idusuario: string;
	idmodulo: string;
	status: string;
	origem: string;
	idassinaturaasaas?: string | null;
	valor?: string | null;
	proximovencimento?: string | null;
}) {
	const existente = await buscarUsuarioModulo(dados.idusuario, dados.idmodulo);
	if (existente) {
		const [atualizado] = await db
			.update(schema.usuarioModulos)
			.set({
				status: dados.status,
				origem: dados.origem,
				idassinaturaasaas:
					dados.idassinaturaasaas ?? existente.idassinaturaasaas,
				valor: dados.valor ?? existente.valor,
				proximovencimento:
					dados.proximovencimento ?? existente.proximovencimento,
				atualizadoem: new Date().toISOString(),
			})
			.where(eq(schema.usuarioModulos.id, existente.id))
			.returning();
		return atualizado;
	}
	const [criado] = await db
		.insert(schema.usuarioModulos)
		.values({
			id: dados.id,
			idusuario: dados.idusuario,
			idmodulo: dados.idmodulo,
			status: dados.status,
			origem: dados.origem,
			idassinaturaasaas: dados.idassinaturaasaas ?? null,
			valor: dados.valor ?? null,
			proximovencimento: dados.proximovencimento ?? null,
			criadoem: new Date().toISOString(),
			atualizadoem: new Date().toISOString(),
		})
		.returning();
	return criado;
}

export async function buscarUsuarioModuloPorAssinaturaAsaas(
	idassinaturaasaas: string,
) {
	const [row] = await db
		.select()
		.from(schema.usuarioModulos)
		.where(eq(schema.usuarioModulos.idassinaturaasaas, idassinaturaasaas))
		.limit(1);
	return row ?? null;
}

export async function listarPlanosComFeatures() {
	const planos = await listarPlanosSaas(false);
	const resultado = [];
	for (const plano of planos) {
		const features = await listarFeaturesDoPlano(plano.id);
		resultado.push({ ...plano, features });
	}
	return resultado;
}

export async function buscarFeaturesPorCodigos(codigos: string[]) {
	if (codigos.length === 0) return [];
	return db
		.select()
		.from(schema.featuresSaas)
		.where(inArray(schema.featuresSaas.codigo, codigos));
}
