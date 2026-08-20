import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import type { ValidacaoFiscalItem } from "@/model/regra-fiscal-model.js";
import { ID_DEST_NFE } from "@/constants/ind-pres-nfe.js";
import { empresaUsaCsosn } from "@/util/normalizar-tributacao-item-emissao-nfe.js";
import {
	calcularIcmsStItemEmissao,
	itemExigeCalculoSt,
} from "@/util/calcular-icms-st-item-emissao-nfe.js";
import {
	cfopIndicaSt,
	normalizarCfop,
} from "@/service/fiscal/indicadores-st-nfe.js";
import { itemEmissaoRequerCest } from "@/util/validar-cest-item-emissao-nfe.js";

function ncmValido(ncm?: string | null): boolean {
	return /^\d{8}$/.test(ncm?.replace(/\D/g, "") ?? "");
}

function primeiroDigitoCfopEsperado(idDest: number): string {
	if (idDest === ID_DEST_NFE.INTERESTADUAL) return "6";
	if (idDest === ID_DEST_NFE.EXTERIOR) return "7";
	return "5";
}

export function validarCoerenciaFiscalNfe(params: {
	crt: number;
	idDest: number;
	itens: ItemPayloadNfe[];
}): ValidacaoFiscalItem[] {
	const validacoes: ValidacaoFiscalItem[] = [];
	const usaCsosn = empresaUsaCsosn(params.crt);
	const digitoEsperado = primeiroDigitoCfopEsperado(params.idDest);

	for (const [indice, item] of params.itens.entries()) {
		const posicao = indice + 1;
		const cfop = normalizarCfop(item.cfop);
		const ncm = item.ncm?.replace(/\D/g, "") ?? "";
		const cst = item.cst?.replace(/\D/g, "") ?? "";
		const csosn = item.csosn?.replace(/\D/g, "") ?? "";

		if (!cfop || cfop.length < 4) {
			validacoes.push({
				status: "INCONSISTENCIA",
				code: "CFOP_AUSENTE",
				field: `itens[${indice}].cfop`,
				message: `Item ${posicao}: informe o CFOP`,
				tipoInconsistencia: "ERRO_DE_CADASTRO",
			});
		} else if (cfop[0] !== digitoEsperado) {
			validacoes.push({
				status: "INCONSISTENCIA",
				code: "CFOP_IDDEST",
				field: `itens[${indice}].cfop`,
				expected: `${digitoEsperado}xxx`,
				actual: cfop,
				message: `Item ${posicao}: CFOP ${cfop} incompatível com operação ${
					params.idDest === 2 ? "interestadual" : params.idDest === 3 ? "exterior" : "interna"
				}`,
				tipoInconsistencia: "ERRO_DE_PARAMETRIZACAO_FISCAL",
			});
		}

		if (!ncmValido(ncm)) {
			validacoes.push({
				status: "INCONSISTENCIA",
				code: "NCM_FORMATO",
				field: `itens[${indice}].ncm`,
				actual: item.ncm,
				message: `Item ${posicao}: NCM deve ter 8 dígitos`,
				tipoInconsistencia: "ERRO_DE_CADASTRO",
			});
		}

		if (usaCsosn) {
			if (!csosn) {
				validacoes.push({
					status: "INCONSISTENCIA",
					code: "CSOSN_AUSENTE",
					field: `itens[${indice}].csosn`,
					message: `Item ${posicao}: CRT ${params.crt} exige CSOSN`,
					tipoInconsistencia: "ERRO_DE_CADASTRO",
				});
			} else if (cst && cst.length <= 2) {
				validacoes.push({
					status: "INCONSISTENCIA",
					code: "CRT_CST_CSOSN",
					field: `itens[${indice}].cst`,
					message: `Item ${posicao}: CRT do Simples não deve usar CST ${cst}`,
					tipoInconsistencia: "ERRO_DE_PARAMETRIZACAO_FISCAL",
				});
			}
		} else if (!cst) {
			validacoes.push({
				status: "INCONSISTENCIA",
				code: "CST_AUSENTE",
				field: `itens[${indice}].cst`,
				message: `Item ${posicao}: regime normal exige CST`,
				tipoInconsistencia: "ERRO_DE_CADASTRO",
			});
		} else if (csosn) {
			validacoes.push({
				status: "INCONSISTENCIA",
				code: "CRT_CST_CSOSN",
				field: `itens[${indice}].csosn`,
				message: `Item ${posicao}: CRT 3 não deve usar CSOSN ${csosn}`,
				tipoInconsistencia: "ERRO_DE_PARAMETRIZACAO_FISCAL",
			});
		}

		if (itemEmissaoRequerCest(item) && !/^\d{7}$/.test(item.cest ?? "")) {
			validacoes.push({
				status: "INCONSISTENCIA",
				code: "CEST_OBRIGATORIO",
				field: `itens[${indice}].cest`,
				message: `Item ${posicao}: operação com ST exige CEST de 7 dígitos`,
				tipoInconsistencia: "ERRO_DE_CADASTRO",
			});
		}

		const valorSt = item.valorIcmsSt ?? 0;
		const baseSt = item.baseIcmsSt ?? 0;
		if (cfopIndicaSt(cfop) && valorSt === 0 && baseSt === 0) {
			validacoes.push({
				status: "ATENCAO",
				code: "CFOP_ST_SEM_VALOR",
				field: `itens[${indice}].valorIcmsSt`,
				message: `Item ${posicao}: CFOP ${cfop} indica ST, porém vBCST=0 e vST=0. Verificar CFOP, ST anterior, regime especial, isenção ou regra incompleta.`,
			});
		}

		if (csosn === "102" && (valorSt > 0 || baseSt > 0)) {
			validacoes.push({
				status: "INCONSISTENCIA",
				code: "ICMSSN102_COM_ST",
				field: `itens[${indice}].csosn`,
				message: `Item ${posicao}: CSOSN 102 não comporta vST no grupo ICMSSN102`,
				tipoInconsistencia: "ERRO_DE_PARAMETRIZACAO_FISCAL",
			});
		}

		if (
			itemExigeCalculoSt(item) &&
			item.percentualMvaSt != null &&
			item.aliquotaIcmsSt != null &&
			(item.aliquotaIcms == null || item.aliquotaIcms <= 0)
		) {
			validacoes.push({
				status: "ATENCAO",
				code: "ST_SEM_ALIQUOTA_INTERNA",
				field: `itens[${indice}].aliquotaIcms`,
				message: `Item ${posicao}: operação com ST sem alíquota interna (ICMS próprio). A dedução no cálculo de ST não será aplicada.`,
			});
		}

		const icmsStEsperado = calcularIcmsStItemEmissao(item);
		if (
			icmsStEsperado.valorIcmsSt != null &&
			valorSt > 0 &&
			Math.abs(valorSt - icmsStEsperado.valorIcmsSt) > 0.01
		) {
			validacoes.push({
				status: "ATENCAO",
				code: "ST_VALOR_DIVERGENTE",
				field: `itens[${indice}].valorIcmsSt`,
				expected: String(icmsStEsperado.valorIcmsSt),
				actual: String(valorSt),
				message: `Item ${posicao}: valor ICMS ST (${valorSt.toFixed(2)}) diverge do esperado (${icmsStEsperado.valorIcmsSt.toFixed(2)}) com dedução do ICMS próprio.`,
			});
		}
	}

	return validacoes;
}
