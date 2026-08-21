import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import {
	csosnExigeCreditoSn,
	resolverCreditoIcmsSnItem,
} from "@/util/resolver-credito-icms-sn-item.js";

export async function aplicarCreditoIcmsSnItensEmissao(
	itens: ItemPayloadNfe[],
): Promise<{ itens: ItemPayloadNfe[]; pendencias: string[] }> {
	const pendencias: string[] = [];
	const itensResultado: ItemPayloadNfe[] = [];

	for (const item of itens) {
		if (!csosnExigeCreditoSn(item.csosn)) {
			itensResultado.push(item);
			continue;
		}

		// Não usar aliquotaIcms / aliquotaIcmsProprioSt: esses campos alimentam
		// a dedução do ICMS ST, não o crédito SN (pCredSN).
		let aliquotaCreditoSn: string | number | null | undefined = item.pCredSN;

		if (
			(aliquotaCreditoSn == null || Number(aliquotaCreditoSn) <= 0) &&
			item.idproduto
		) {
			const produto = await buscarProdutoPorId(item.idproduto);
			aliquotaCreditoSn = produto?.aliquotaicmsinterna;
		}

		const valorProduto = item.quantidade * item.valorUnitario;
		const credito = resolverCreditoIcmsSnItem({
			csosn: item.csosn,
			valorProduto,
			pCredSN: item.pCredSN,
			vCredICMSSN: item.vCredICMSSN,
			aliquotaIcmsInterna: aliquotaCreditoSn,
		});

		if (credito.pendencia) {
			pendencias.push(`${item.descricao}: ${credito.pendencia}`);
		}

		itensResultado.push({
			...item,
			...(credito.pCredSN != null ? { pCredSN: credito.pCredSN } : {}),
			...(credito.vCredICMSSN != null
				? { vCredICMSSN: credito.vCredICMSSN }
				: {}),
		});
	}

	return { itens: itensResultado, pendencias };
}
