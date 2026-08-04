import { randomUUID } from "node:crypto";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarModuloSaas,
	atualizarPlanoSaas,
	buscarModuloSaasPorCodigo,
	buscarModuloSaasPorId,
	buscarPlanoSaasPorCodigo,
	buscarPlanoSaasPorId,
	criarModuloSaas,
	criarPlanoSaas,
	listarFeaturesSaas,
	listarModulosSaas,
	listarPlanosComFeatures,
	substituirFeaturesDoPlano,
	upsertUsuarioModulo,
} from "@/repositories/saas-catalog-repositories.js";
import {
	atualizarPlanoUsuario,
	buscarUsuarioPorId,
} from "@/repositories/usuarios-repositories.js";
import { buscarEntitlementService } from "@/service/planos/buscar-plano-efetivo.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpOk,
	httpRecursoExistente,
} from "@/util/http-util.js";
import { normalizarPerfilArray } from "@/util/usuario-perfil.js";

function normalizarCodigo(codigo: string) {
	return codigo
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9_]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

export async function listarCatalogoAdminService() {
	const [planos, features, modulos] = await Promise.all([
		listarPlanosComFeatures(),
		listarFeaturesSaas(false),
		listarModulosSaas(false),
	]);
	return httpOk({ planos, features, modulos });
}

export async function criarPlanoAdminService(params: {
	codigo: string;
	nome: string;
	descricao?: string | null;
	valormensal: string;
	maxempresas: number;
	maxusuarios: number;
	ordem: number;
	ativo?: boolean;
	idfeatures?: string[];
}) {
	const codigo = normalizarCodigo(params.codigo);
	if (!codigo) {
		return httpBadRequest("Código do plano inválido");
	}

	const existente = await buscarPlanoSaasPorCodigo(codigo);
	if (existente) {
		return httpRecursoExistente("Já existe um plano com este código");
	}

	const criado = await criarPlanoSaas({
		id: randomUUID(),
		codigo,
		nome: params.nome,
		descricao: params.descricao ?? null,
		valormensal: params.valormensal,
		maxempresas: params.maxempresas,
		maxusuarios: params.maxusuarios,
		ordem: params.ordem,
		ativo: params.ativo ?? true,
	});
	if (!criado) {
		return httpBadRequest("Não foi possível criar o plano");
	}

	if (params.idfeatures?.length) {
		await substituirFeaturesDoPlano(criado.id, params.idfeatures);
	}

	const features = await listarPlanosComFeatures().then(
		(ps) => ps.find((p) => p.id === criado.id)?.features ?? [],
	);
	return httpCriacao({ ...criado, features });
}

export async function atualizarPlanoAdminService(params: {
	id: string;
	dados: {
		nome?: string;
		descricao?: string | null;
		valormensal?: string;
		maxempresas?: number;
		maxusuarios?: number;
		ordem?: number;
		ativo?: boolean;
		idfeatures?: string[];
	};
}) {
	const plano = await buscarPlanoSaasPorId(params.id);
	if (!plano) return httpNaoEncontrado();

	const { idfeatures, ...resto } = params.dados;
	const atualizado = await atualizarPlanoSaas(params.id, resto);
	if (idfeatures) {
		await substituirFeaturesDoPlano(params.id, idfeatures);
	}
	const features = idfeatures
		? await listarPlanosComFeatures().then(
				(ps) => ps.find((p) => p.id === params.id)?.features ?? [],
			)
		: undefined;
	return httpOk({ ...atualizado, ...(features && { features }) });
}

export async function criarModuloAdminService(params: {
	codigo: string;
	nome: string;
	descricao?: string | null;
	valormensal: string;
	ativo?: boolean;
}) {
	const codigo = normalizarCodigo(params.codigo).toLowerCase();
	if (!codigo) {
		return httpBadRequest("Código do módulo inválido");
	}

	const existente = await buscarModuloSaasPorCodigo(codigo);
	if (existente) {
		return httpRecursoExistente("Já existe um módulo com este código");
	}

	const criado = await criarModuloSaas({
		id: randomUUID(),
		codigo,
		nome: params.nome,
		descricao: params.descricao ?? null,
		valormensal: params.valormensal,
		ativo: params.ativo ?? true,
	});
	if (!criado) {
		return httpBadRequest("Não foi possível criar o módulo");
	}
	return httpCriacao(criado);
}

export async function atualizarModuloAdminService(params: {
	id: string;
	dados: {
		nome?: string;
		descricao?: string | null;
		valormensal?: string;
		ativo?: boolean;
	};
}) {
	const modulo = await buscarModuloSaasPorId(params.id);
	if (!modulo) return httpNaoEncontrado();
	const atualizado = await atualizarModuloSaas(params.id, params.dados);
	return httpOk(atualizado);
}

function usuarioEhProprietario(perfil: unknown) {
	return normalizarPerfilArray(perfil).includes("proprietario");
}

export async function atribuirEntitlementAdminService(params: {
	idusuario: string;
	plano?: string | null;
	modulos?: Array<{ codigo: string; ativo: boolean }>;
}): Promise<HttpResponse<unknown>> {
	const usuario = await buscarUsuarioPorId(params.idusuario);
	if (!usuario) return httpNaoEncontrado();

	if (!usuarioEhProprietario(usuario.perfil)) {
		return httpBadRequest(
			"Planos e módulos só podem ser atribuídos a usuários proprietários",
		);
	}

	if (params.plano !== undefined) {
		if (params.plano === null) {
			await atualizarPlanoUsuario(params.idusuario, {
				plano: null,
				plano_proximo: null,
			});
		} else {
			const planoCat = await buscarPlanoSaasPorCodigo(params.plano);
			if (!planoCat) {
				return httpBadRequest("Plano inválido");
			}
			const hoje = new Date();
			const fim = new Date(hoje);
			fim.setMonth(fim.getMonth() + 1);
			await atualizarPlanoUsuario(params.idusuario, {
				plano: planoCat.codigo,
				plano_inicio_ciclo: hoje,
				plano_fim_ciclo: fim,
				plano_proximo: null,
			});
		}
	}

	if (params.modulos) {
		const todosModulos = await listarModulosSaas(false);
		for (const item of params.modulos) {
			const modulo = todosModulos.find(
				(m: { codigo: string }) => m.codigo === item.codigo,
			);
			if (!modulo) continue;
			await upsertUsuarioModulo({
				id: randomUUID(),
				idusuario: params.idusuario,
				idmodulo: modulo.id,
				status: item.ativo ? "ACTIVE" : "CANCELED",
				origem: "MANUAL",
				valor: modulo.valormensal,
			});
		}
	}

	const entitlement = await buscarEntitlementService({
		idusuario: params.idusuario,
		modo: "direto",
	});
	return httpOk(entitlement);
}

export async function buscarEntitlementUsuarioAdminService(idusuario: string) {
	const usuario = await buscarUsuarioPorId(idusuario);
	if (!usuario) return httpNaoEncontrado();
	if (!usuarioEhProprietario(usuario.perfil)) {
		return httpBadRequest(
			"Planos e módulos só se aplicam a usuários proprietários",
		);
	}
	const entitlement = await buscarEntitlementService({
		idusuario,
		modo: "direto",
	});
	return httpOk(entitlement);
}
