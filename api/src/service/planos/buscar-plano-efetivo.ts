import {
	FEATURES_POR_PLANO,
	type TipoPlanoCodigo,
} from "@/constants/saas-catalog.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import {
	buscarPlanoSaasPorCodigo,
	listarCodigosFeaturesDoPlano,
	listarModulosAtivosDoUsuario,
} from "@/repositories/saas-catalog-repositories.js";
import { buscarPlanoUsuario } from "@/repositories/usuarios-repositories.js";

export type EntitlementResultado = {
	idusuario: string;
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

async function resolverIdProprietario(params: {
	idusuario: string;
	idempresa?: string;
}): Promise<string> {
	if (params.idempresa) {
		const empresa = await buscarEmpresaPorId(params.idempresa);
		if (empresa?.idproprietario) {
			return empresa.idproprietario;
		}
	}
	return params.idusuario;
}

export async function buscarEntitlementService(params: {
	idusuario: string;
	idempresa?: string;
}): Promise<EntitlementResultado> {
	const idProprietario = await resolverIdProprietario(params);
	const planoUsuario = await buscarPlanoUsuario(idProprietario);
	const codigoPlano = planoUsuario?.plano?.toUpperCase() ?? null;

	if (!codigoPlano) {
		return {
			idusuario: idProprietario,
			plano: null,
			planoAgendado: planoUsuario?.plano_proximo ?? null,
			inicioCiclo: planoUsuario?.plano_inicio_ciclo ?? null,
			fimCiclo: planoUsuario?.plano_fim_ciclo ?? null,
			status: "SEM_PLANO",
			limites: { maxempresas: 0, maxusuarios: 0 },
			features: [],
			modulos: [],
			valor: 0,
			nomePlano: null,
		};
	}

	const planoCatalogo = await buscarPlanoSaasPorCodigo(codigoPlano);
	let features: string[] = [];
	if (planoCatalogo) {
		features = await listarCodigosFeaturesDoPlano(planoCatalogo.id);
	} else {
		const fallback = FEATURES_POR_PLANO[codigoPlano as TipoPlanoCodigo] ?? [];
		features = [...fallback];
	}

	const modulosRows = await listarModulosAtivosDoUsuario(idProprietario);
	const modulos = modulosRows.map((m: { codigo: string }) => m.codigo);

	return {
		idusuario: idProprietario,
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
	};
}

export async function usuarioTemFeature(params: {
	idusuario: string;
	idempresa?: string;
	feature: string;
}): Promise<boolean> {
	const entitlement = await buscarEntitlementService(params);
	return entitlement.features.includes(params.feature);
}

export async function usuarioTemModulo(params: {
	idusuario: string;
	idempresa?: string;
	modulo: string;
}): Promise<boolean> {
	const entitlement = await buscarEntitlementService(params);
	return entitlement.modulos.includes(params.modulo);
}
