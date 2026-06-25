import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import type { CamposImpostosProduto } from "@/util/campos-impostos-produto.js";

type CfopRegistro = NonNullable<Awaited<ReturnType<typeof buscarCfopPorId>>>;

export function codigoCfopParaInteiro(codigo?: string | null): number | null {
	if (!codigo) return null;
	const digitos = codigo.replace(/\D/g, "");
	if (!digitos) return null;
	const valor = parseInt(digitos, 10);
	return Number.isNaN(valor) ? null : valor;
}

export function obterTributacaoPadraoCfopSaida(
	cfop: CfopRegistro,
): Partial<CamposImpostosProduto> {
	const codigoEcf = codigoCfopParaInteiro(cfop.codigo);

	return {
		idcfopsaida: cfop.id,
		idcfopsaidanfce: cfop.id,
		situacaotributaria: cfop.situacaotributaria?.trim() || null,
		situacaotributariasn: cfop.situacaotributariasn?.trim() || null,
		tributacaoespecial: cfop.situacaotributaria?.trim() || null,
		tributacaosn: cfop.situacaotributariasn?.trim() || null,
		cfopvendaecf: codigoEcf,
	};
}
