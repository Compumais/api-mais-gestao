export type TipoPlano = "BASIC" | "PREMIUM" | "ENTERPRISE";

export {
	HIERARQUIA_PLANOS,
	isPlanoInferior,
	isPlanoSuperior,
	obterIndicePlano,
} from "./saas-catalog.js";

/** @deprecated Use planos_saas.valormensal do banco */
export const VALORES_PLANOS: Record<TipoPlano, number> = {
	BASIC: 99.0,
	PREMIUM: 199.0,
	ENTERPRISE: 399.0,
};

export function obterValorPlano(plano: TipoPlano): number {
	return VALORES_PLANOS[plano];
}

export function calcularDiasRestantesNoCiclo(
	_inicioCiclo: Date,
	fimCiclo: Date,
	dataAtual: Date = new Date(),
): number {
	const diffMs = fimCiclo.getTime() - dataAtual.getTime();
	const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	return Math.max(0, diffDias);
}

export function calcularDiasTotaisDoCiclo(
	inicioCiclo: Date,
	fimCiclo: Date,
): number {
	const diffMs = fimCiclo.getTime() - inicioCiclo.getTime();
	const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	return Math.max(1, diffDias);
}

export function calcularValorProporcional(
	valorAtualMensal: number,
	valorNovoMensal: number,
	diasRestantes: number,
	diasTotais: number,
): number {
	const diferenca = valorNovoMensal - valorAtualMensal;
	const proporcao = diasRestantes / diasTotais;
	return diferenca * proporcao;
}
