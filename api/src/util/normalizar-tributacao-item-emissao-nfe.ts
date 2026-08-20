import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { aplicarPisCofinsItemEmissao } from "@/util/montar-grupo-pis-cofins-item-nfe.js";

export function empresaUsaCsosn(crt: number | null | undefined): boolean {
	return crt === 1 || crt === 2 || crt === 4;
}

function ehCsosn(codigo: string): boolean {
	return (
		codigo.length === 3 &&
		(codigo.startsWith("1") ||
			codigo.startsWith("2") ||
			codigo.startsWith("5") ||
			codigo.startsWith("9"))
	);
}

function normalizarCodigoIcms(valor?: string | null): string {
	return valor?.replace(/\D/g, "").trim() ?? "";
}

export function normalizarTributacaoIcmsItem(
	crt: number | null | undefined,
	item: Pick<ItemPayloadNfe, "cst" | "csosn">,
): Pick<ItemPayloadNfe, "cst" | "csosn"> {
	const usaCsosn = empresaUsaCsosn(crt);
	const cstInformado = normalizarCodigoIcms(item.cst);
	const csosnInformado = normalizarCodigoIcms(item.csosn);

	if (usaCsosn) {
		const csosn =
			(csosnInformado && ehCsosn(csosnInformado) ? csosnInformado : null) ||
			(cstInformado && ehCsosn(cstInformado) ? cstInformado : null) ||
			undefined;

		return { csosn, cst: undefined };
	}

	const cst =
		(cstInformado && !ehCsosn(cstInformado)
			? cstInformado.padStart(2, "0").slice(-2)
			: null) ||
		(csosnInformado && !ehCsosn(csosnInformado)
			? csosnInformado.padStart(2, "0").slice(-2)
			: null) ||
		undefined;

	return { cst, csosn: undefined };
}

export function normalizarItensEmissaoNfe(
	crt: number | null | undefined,
	itens: ItemPayloadNfe[],
): ItemPayloadNfe[] {
	return itens.map((item) =>
		aplicarPisCofinsItemEmissao({
			...item,
			...normalizarTributacaoIcmsItem(crt, item),
		}),
	);
}
