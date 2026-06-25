import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";

function sanitizarGtin(valor?: string | number | null): string | undefined {
	if (valor == null) return undefined;
	const digitos = String(valor).replace(/\D/g, "").trim();
	return digitos || undefined;
}

function montarGtin(
	ean?: string | number | null,
	eanTributavel?: string | number | null,
): Pick<ItemPayloadNfe, "ean" | "eanTributavel"> {
	const eanLimpo = sanitizarGtin(ean);
	if (!eanLimpo) {
		return { ean: undefined, eanTributavel: undefined };
	}

	const eanTributavelLimpo = sanitizarGtin(eanTributavel) ?? eanLimpo;

	return {
		ean: eanLimpo,
		eanTributavel: eanTributavelLimpo,
	};
}

function aplicarGtinNoItem(
	item: ItemPayloadNfe,
	ean?: string | number | null,
	eanTributavel?: string | number | null,
): ItemPayloadNfe {
	const gtin = montarGtin(ean, eanTributavel);
	if (!gtin.ean) {
		return {
			...item,
			ean: undefined,
			eanTributavel: undefined,
		};
	}

	return {
		...item,
		...gtin,
	};
}

export async function enriquecerItensEmissaoComProduto(
	itens: ItemPayloadNfe[],
): Promise<ItemPayloadNfe[]> {
	return Promise.all(
		itens.map(async (item) => {
			let resultado: ItemPayloadNfe = { ...item };

			if (resultado.ean) {
				resultado = aplicarGtinNoItem(
					resultado,
					resultado.ean,
					resultado.eanTributavel ?? resultado.ean,
				);
			}

			if (!item.idproduto) {
				return resultado;
			}

			const produto = await buscarProdutoPorId(item.idproduto);
			if (!produto) {
				return resultado;
			}

			if (produto.codigo != null && !resultado.codigoProduto) {
				resultado.codigoProduto = String(produto.codigo);
			}

			const eanProduto = sanitizarGtin(produto.ean);
			const eanTributavelProduto =
				sanitizarGtin(produto.eantributavel) ?? eanProduto;

			if (!eanProduto && !resultado.ean) {
				return {
					...resultado,
					ean: undefined,
					eanTributavel: undefined,
				};
			}

			if (!eanProduto) {
				return aplicarGtinNoItem(
					resultado,
					resultado.ean,
					resultado.eanTributavel ?? resultado.ean,
				);
			}

			return aplicarGtinNoItem(
				resultado,
				resultado.ean ?? eanProduto,
				resultado.eanTributavel ?? eanTributavelProduto,
			);
		}),
	);
}
