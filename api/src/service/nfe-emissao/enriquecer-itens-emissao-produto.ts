import { buscarCestPorId } from "@/repositories/cest-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import {
	cstPisCofinsAusenteOuInvalido,
	normalizarCstPisCofins,
} from "@/util/montar-grupo-pis-cofins-item-nfe.js";
import { normalizarCodigoCest } from "@/util/validar-cest-item-emissao-nfe.js";

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

async function resolverCestProduto(
	produto: NonNullable<Awaited<ReturnType<typeof buscarProdutoPorId>>>,
): Promise<string | undefined> {
	if (produto.idcest) {
		const cest = await buscarCestPorId(produto.idcest);
		const codigo = normalizarCodigoCest(cest?.codigo);
		if (codigo) return codigo;
	}

	return normalizarCodigoCest(produto.cest);
}

function paraNumeroOpcional(
	valor?: string | number | null,
): number | undefined {
	if (valor == null || valor === "") {
		return undefined;
	}
	if (typeof valor === "number") {
		return Number.isFinite(valor) ? valor : undefined;
	}

	const texto = String(valor).trim();
	if (!texto) {
		return undefined;
	}

	const normalizado = texto.includes(",")
		? texto.replace(/\./g, "").replace(",", ".")
		: texto;
	const numero = Number(normalizado);
	return Number.isFinite(numero) ? numero : undefined;
}

function aplicarPisCofinsDoProduto(
	item: ItemPayloadNfe,
	produto: NonNullable<Awaited<ReturnType<typeof buscarProdutoPorId>>>,
): ItemPayloadNfe {
	const resultado = { ...item };

	if (cstPisCofinsAusenteOuInvalido(resultado.cstPis)) {
		const cstProduto = normalizarCstPisCofins(produto.cstpis);
		if (cstProduto && !cstPisCofinsAusenteOuInvalido(cstProduto)) {
			resultado.cstPis = cstProduto;
		}
	}

	if (cstPisCofinsAusenteOuInvalido(resultado.cstCofins)) {
		const cstProduto = normalizarCstPisCofins(produto.cstcofins);
		if (cstProduto && !cstPisCofinsAusenteOuInvalido(cstProduto)) {
			resultado.cstCofins = cstProduto;
		}
	}

	if (resultado.aliquotaPis == null) {
		const aliquota = paraNumeroOpcional(produto.aliquotapis);
		if (aliquota != null) {
			resultado.aliquotaPis = aliquota;
		}
	}

	if (resultado.aliquotaCofins == null) {
		const aliquota = paraNumeroOpcional(produto.aliquotacofins);
		if (aliquota != null) {
			resultado.aliquotaCofins = aliquota;
		}
	}

	return resultado;
}

function codigoCsosnProduto(
	produto: NonNullable<Awaited<ReturnType<typeof buscarProdutoPorId>>>,
): string | undefined {
	for (const valor of [produto.situacaotributariasn, produto.tributacaosn]) {
		const codigo = String(valor ?? "").replace(/\D/g, "");
		if (
			codigo.length === 3 &&
			(codigo.startsWith("1") ||
				codigo.startsWith("2") ||
				codigo.startsWith("5") ||
				codigo.startsWith("9"))
		) {
			return codigo;
		}
	}
	return undefined;
}

function aplicarCsosnStDoProduto(
	item: ItemPayloadNfe,
	produto: NonNullable<Awaited<ReturnType<typeof buscarProdutoPorId>>>,
): ItemPayloadNfe {
	const resultado = { ...item };
	const csosnItem = resultado.csosn?.replace(/\D/g, "") ?? "";

	if (!csosnItem) {
		const csosnProduto = codigoCsosnProduto(produto);
		if (csosnProduto) {
			resultado.csosn = csosnProduto;
			resultado.cst = undefined;
		}
	}

	if (resultado.percentualMvaSt == null) {
		const mva = paraNumeroOpcional(produto.percentualmva);
		if (mva != null) {
			resultado.percentualMvaSt = mva;
		}
	}

	if (resultado.aliquotaIcmsSt == null) {
		const aliquota = paraNumeroOpcional(produto.ultimaaliquotaicmsst);
		if (aliquota != null) {
			resultado.aliquotaIcmsSt = aliquota;
		}
	}

	if (resultado.aliquotaFcpSt == null) {
		const aliquota = paraNumeroOpcional(produto.ultimaaliquotafcpst);
		if (aliquota != null) {
			resultado.aliquotaFcpSt = aliquota;
		}
	}

	return resultado;
}

export async function enriquecerItensEmissaoComProduto(
	itens: ItemPayloadNfe[],
): Promise<ItemPayloadNfe[]> {
	return Promise.all(
		itens.map(async (item) => {
			let resultado: ItemPayloadNfe = {
				...item,
				cest: normalizarCodigoCest(item.cest),
			};

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

			resultado = aplicarPisCofinsDoProduto(resultado, produto);
			resultado = aplicarCsosnStDoProduto(resultado, produto);

			if (!normalizarCodigoCest(resultado.cest)) {
				const cestProduto = await resolverCestProduto(produto);
				if (cestProduto) {
					resultado = { ...resultado, cest: cestProduto };
				}
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
