import type { NovoNotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import {
	montarCofinsItemNfe,
	montarPisItemNfe,
} from "@/util/montar-grupo-pis-cofins-item-nfe.js";

function paraStringOpcional(valor?: number | null): string | null {
	if (valor == null || !Number.isFinite(valor)) return null;
	return String(valor);
}

/** Campos fiscais de 1ª classe para C170 / EFD, derivados do payload de emissão. */
export function camposTributariosItemEmissao(
	item: ItemPayloadNfe,
): Pick<
	NovoNotaFiscalItem,
	| "basepis"
	| "basecofins"
	| "pis"
	| "cofins"
	| "baseicmsst"
	| "valoricmsst"
	| "aliquotaicmsst"
	| "valorfcpst"
	| "cest"
> {
	const valorProduto = item.quantidade * item.valorUnitario;
	const pis = montarPisItemNfe({
		cstPis: item.cstPis,
		aliquotaPis: item.aliquotaPis,
		valorProduto,
		quantidade: item.quantidade,
	});
	const cofins = montarCofinsItemNfe({
		cstCofins: item.cstCofins,
		aliquotaCofins: item.aliquotaCofins,
		valorProduto,
		quantidade: item.quantidade,
	});
	const cestDigitos = item.cest?.replace(/\D/g, "").slice(0, 7);

	return {
		basepis: String(pis.vBC),
		basecofins: String(cofins.vBC),
		pis: String(pis.vPIS),
		cofins: String(cofins.vCOFINS),
		baseicmsst: paraStringOpcional(item.baseIcmsSt),
		valoricmsst: paraStringOpcional(item.valorIcmsSt),
		aliquotaicmsst: paraStringOpcional(item.aliquotaIcmsSt),
		valorfcpst: paraStringOpcional(item.valorFcpSt),
		cest: cestDigitos || null,
	};
}
