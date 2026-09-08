import type { LocalEntregaPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";

function normalizarUf(uf?: string | null): string {
	return uf?.trim().toUpperCase() ?? "";
}

export function validarLocalEntregaCfopInterestadual(params: {
	ufEmitente?: string | null;
	ufDestinatario?: string | null;
	localEntrega?: LocalEntregaPayloadNfe;
	possuiCfopInterestadual: boolean;
	possuiCfopInterestadualDestinatarioMesmaUf: boolean;
}): string | null {
	const ufEmitente = normalizarUf(params.ufEmitente);
	const ufDestinatario = normalizarUf(params.ufDestinatario);
	const destinatarioMesmaUf =
		ufEmitente.length === 2 &&
		ufDestinatario.length === 2 &&
		ufEmitente === ufDestinatario;

	if (!destinatarioMesmaUf || !params.possuiCfopInterestadual) {
		return null;
	}

	if (!params.possuiCfopInterestadualDestinatarioMesmaUf) {
		return "A natureza da operação não está habilitada para CFOP interestadual com destinatário na mesma UF.";
	}

	if (!params.localEntrega) {
		return "Informe o local de entrega da feira para a remessa interestadual com destinatário na mesma UF.";
	}

	if (normalizarUf(params.localEntrega.uf) === ufEmitente) {
		return "A UF do local de entrega deve ser diferente da UF do emitente para usar CFOP interestadual.";
	}

	return null;
}
