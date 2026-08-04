import {
	FEATURES_POR_PLANO,
	type TipoPlanoCodigo,
} from "@/constants/saas-catalog.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarPlanoSaasPorCodigo,
	listarCodigosFeaturesDoPlano,
	listarModulosAtivosDoUsuario,
} from "@/repositories/saas-catalog-repositories.js";
import { buscarPlanoUsuario } from "@/repositories/usuarios-repositories.js";

export type EntitlementResultado = {
	idusuario: string;
	idempresa: string | null;
	idproprietario: string;
	plano: string | null;
	planoAgendado: string | null;
	inicioCiclo: Date | null;
	fimCiclo: Date | null;
	status: "ACTIVE" | "SEM_PLANO" | "OVERDUE";
	limites: {
		maxempresas: number;
		maxusuarios: number;
	};
	features: string[];
	modulos: string[];
	valor: number;
	nomePlano: string | null;
};

export class EntitlementAcessoNegadoError extends Error {
	readonly code = "EMPRESA_ACESSO_NEGADO";

	constructor(message = "Usuário não pertence à empresa informada") {
		super(message);
		this.name = "EntitlementAcessoNegadoError";
	}
}

function resultadoSemPlano(params: {
	idusuario: string;
	idproprietario: string;
	idempresa: string | null;
	planoAgendado?: string | null;
	inicioCiclo?: Date | null;
	fimCiclo?: Date | null;
}): EntitlementResultado {
	return {
		idusuario: params.idusuario,
		idempresa: params.idempresa,
		idproprietario: params.idproprietario,
		plano: null,
		planoAgendado: params.planoAgendado ?? null,
		inicioCiclo: params.inicioCiclo ?? null,
		fimCiclo: params.fimCiclo ?? null,
		status: "SEM_PLANO",
		limites: { maxempresas: 0, maxusuarios: 0 },
		features: [],
		modulos: [],
		valor: 0,
		nomePlano: null,
	};
}

/**
 * Resolve o proprietário cujo plano/módulos serão herdados.
 * - modo "operacional" (com idempresa): valida vínculo e usa o proprietário da empresa
 * - modo "direto" (sem idempresa): usa o próprio usuário (admin/cobrança/proprietário)
 */
async function resolverProprietarioEntitlement(params: {
	idusuario: string;
	idempresa?: string;
	modo?: "operacional" | "direto";
}): Promise<{ idproprietario: string; idempresa: string | null }> {
	const modo = params.modo ?? (params.idempresa ? "operacional" : "direto");

	if (modo === "direto") {
		return {
			idproprietario: params.idusuario,
			idempresa: params.idempresa ?? null,
		};
	}

	if (!params.idempresa) {
		return {
			idproprietario: params.idusuario,
			idempresa: null,
		};
	}

	const pertence = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!pertence) {
		throw new EntitlementAcessoNegadoError();
	}

	const empresa = await buscarEmpresaPorId(params.idempresa);
	if (!empresa?.idproprietario) {
		throw new EntitlementAcessoNegadoError("Empresa não encontrada");
	}

	return {
		idproprietario: empresa.idproprietario,
		idempresa: params.idempresa,
	};
}

export async function buscarEntitlementService(params: {
	idusuario: string;
	idempresa?: string;
	/** "direto" ignora herança e lê o plano do próprio usuário (admin/cobrança) */
	modo?: "operacional" | "direto";
}): Promise<EntitlementResultado> {
	const { idproprietario, idempresa } =
		await resolverProprietarioEntitlement(params);

	const planoUsuario = await buscarPlanoUsuario(idproprietario);
	const codigoPlano = planoUsuario?.plano?.toUpperCase() ?? null;

	if (!codigoPlano) {
		return resultadoSemPlano({
			idusuario: params.idusuario,
			idproprietario,
			idempresa,
			planoAgendado: planoUsuario?.plano_proximo ?? null,
			inicioCiclo: planoUsuario?.plano_inicio_ciclo ?? null,
			fimCiclo: planoUsuario?.plano_fim_ciclo ?? null,
		});
	}

	const planoCatalogo = await buscarPlanoSaasPorCodigo(codigoPlano);
	let features: string[] = [];
	if (planoCatalogo) {
		features = await listarCodigosFeaturesDoPlano(planoCatalogo.id);
	} else {
		const fallback = FEATURES_POR_PLANO[codigoPlano as TipoPlanoCodigo] ?? [];
		features = [...fallback];
	}

	const modulosRows = await listarModulosAtivosDoUsuario(idproprietario);
	const modulos = modulosRows.map((m: { codigo: string }) => m.codigo);

	return {
		idusuario: params.idusuario,
		idempresa,
		idproprietario,
		plano: codigoPlano,
		planoAgendado: planoUsuario?.plano_proximo ?? null,
		inicioCiclo: planoUsuario?.plano_inicio_ciclo ?? null,
		fimCiclo: planoUsuario?.plano_fim_ciclo ?? null,
		status: "ACTIVE",
		limites: {
			maxempresas: planoCatalogo?.maxempresas ?? 1,
			maxusuarios: planoCatalogo?.maxusuarios ?? 3,
		},
		features,
		modulos,
		valor: Number(planoCatalogo?.valormensal ?? 0),
		nomePlano: planoCatalogo?.nome ?? codigoPlano,
	};
}

/** @deprecated Use buscarEntitlementService */
export async function buscarPlanoEfetivoService(params: {
	idusuario: string;
	idempresa?: string;
	modo?: "operacional" | "direto";
}) {
	const entitlement = await buscarEntitlementService(params);
	return {
		plano: entitlement.plano,
		planoAgendado: entitlement.planoAgendado,
		inicioCiclo: entitlement.inicioCiclo,
		fimCiclo: entitlement.fimCiclo,
		status: entitlement.status,
		limites: entitlement.limites,
		features: entitlement.features,
		modulos: entitlement.modulos,
		valor: entitlement.valor,
		nomePlano: entitlement.nomePlano,
		idempresa: entitlement.idempresa,
		idproprietario: entitlement.idproprietario,
	};
}

export async function usuarioTemFeature(params: {
	idusuario: string;
	idempresa?: string;
	feature: string;
	modo?: "operacional" | "direto";
}): Promise<boolean> {
	const entitlement = await buscarEntitlementService(params);
	return entitlement.features.includes(params.feature);
}

export async function usuarioTemModulo(params: {
	idusuario: string;
	idempresa?: string;
	modulo: string;
	modo?: "operacional" | "direto";
}): Promise<boolean> {
	const entitlement = await buscarEntitlementService(params);
	return entitlement.modulos.includes(params.modulo);
}
