import type { TipoDocumentoFinanceiro } from "@/model/tipo-documento-financeiro-model.js";
import { resolverDestinoFinanceiroFormaPagamento } from "@/util/resolver-financeiro-emissao-nfe.js";

export const TPAG_DINHEIRO = "01";
export const TPAG_CHEQUE = "02";
export const TPAG_CARTAO_CREDITO = "03";
export const TPAG_CARTAO_DEBITO = "04";
export const TPAG_BOLETO = "15";
export const TPAG_PIX = "17";

function normalizarTexto(valor: string | null | undefined): string {
	return (valor ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase();
}

export function tipoDocumentoGeraContasReceber(
	tipo: Pick<TipoDocumentoFinanceiro, "aprazo" | "integracaixabanco">,
): boolean {
	return resolverDestinoFinanceiroFormaPagamento(tipo) !== "caixa_imediato";
}

export function resolverTipoDocumentoPorFormaNfe(
	tipos: TipoDocumentoFinanceiro[],
	formapagamentonfe: string,
	bandeira?: string | null,
): TipoDocumentoFinanceiro | undefined {
	const candidatos = tipos.filter(
		(tipo) => tipo.formapagamentonfe === formapagamentonfe,
	);

	if (candidatos.length === 0) {
		return undefined;
	}

	const bandeiraNorm = normalizarTexto(bandeira);
	if (bandeiraNorm) {
		const porBandeira = candidatos.find((tipo) => {
			const descricao = normalizarTexto(tipo.descricao);
			return (
				descricao.includes(bandeiraNorm) || bandeiraNorm.includes(descricao)
			);
		});
		if (porBandeira) {
			return porBandeira;
		}
	}

	const queGeraReceber = candidatos.find((tipo) =>
		tipoDocumentoGeraContasReceber(tipo),
	);
	return queGeraReceber ?? candidatos[0];
}
