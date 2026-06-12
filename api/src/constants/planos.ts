export type TipoPlano = "BASIC" | "PREMIUM" | "ENTERPRISE";

export const VALORES_PLANOS: Record<TipoPlano, number> = {
	BASIC: 99.0,
	PREMIUM: 199.0,
	ENTERPRISE: 399.0,
};

export const HIERARQUIA_PLANOS: TipoPlano[] = [
	"BASIC",
	"PREMIUM",
	"ENTERPRISE",
];

export function obterValorPlano(plano: TipoPlano): number {
	return VALORES_PLANOS[plano];
}

export function obterIndicePlano(plano: TipoPlano): number {
	return HIERARQUIA_PLANOS.indexOf(plano);
}

export function isPlanoSuperior(
	planoAtual: TipoPlano,
	planoNovo: TipoPlano,
): boolean {
	return obterIndicePlano(planoNovo) > obterIndicePlano(planoAtual);
}

export function isPlanoInferior(
	planoAtual: TipoPlano,
	planoNovo: TipoPlano,
): boolean {
	return obterIndicePlano(planoNovo) < obterIndicePlano(planoAtual);
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
