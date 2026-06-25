export function obterCodigoRejeicaoNota(nota: {
	codigostatusprotocolonfe?: number | null;
	codigostatustransmissaonfe?: number | null;
}): string | null {
	if (nota.codigostatusprotocolonfe != null) {
		return String(nota.codigostatusprotocolonfe);
	}

	if (nota.codigostatustransmissaonfe != null) {
		return String(nota.codigostatustransmissaonfe);
	}

	return null;
}

export function obterMotivoRejeicaoNota(nota: {
	mensagemtransmissaonfe?: string | null;
	observacao?: string | null;
}): string | null {
	const motivo = nota.mensagemtransmissaonfe?.trim();
	if (motivo) return motivo;

	const observacao = nota.observacao?.trim();
	return observacao || null;
}
