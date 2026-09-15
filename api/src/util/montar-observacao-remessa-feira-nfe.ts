import type { LocalEntregaPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";

export const SECAO_REMESSA_FEIRA_NFE = "--- Remessa para feira ---";

function formatarData(data: string): string {
	const [ano, mes, dia] = data.split("-");
	return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
}

export function montarObservacaoRemessaFeiraNfe(
	localEntrega?: LocalEntregaPayloadNfe,
): string | undefined {
	if (!localEntrega) return undefined;

	const periodo =
		localEntrega.dataInicioEvento === localEntrega.dataFimEvento
			? `em ${formatarData(localEntrega.dataInicioEvento)}`
			: `no período de ${formatarData(localEntrega.dataInicioEvento)} a ${formatarData(localEntrega.dataFimEvento)}`;
	const complemento = localEntrega.complemento?.trim()
		? `, ${localEntrega.complemento.trim()}`
		: "";

	return [
		SECAO_REMESSA_FEIRA_NFE,
		`REMESSA DE MERCADORIA PARA EXPOSIÇÃO OU FEIRA. Evento: ${localEntrega.nomeEvento.trim()}, ${periodo}.`,
		`Local: ${localEntrega.logradouro.trim()}, ${localEntrega.numero.trim()}${complemento} - ${localEntrega.bairro.trim()} - ${localEntrega.municipio.trim()}/${localEntrega.uf.trim().toUpperCase()} - CEP: ${localEntrega.cep.replace(/\D/g, "")}.`,
		`Fundamento legal informado pelo emitente: ${localEntrega.fundamentoLegal.trim()}.`,
	].join(" ");
}
