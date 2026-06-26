type MontarIdentificacaoFinanceiroPdvParametros = {
	numeropdv: number;
	parcela: number;
	totalParcelas: number;
	nomeCliente?: string | null | undefined;
};

function truncarTexto(texto: string, maximo: number): string {
	if (texto.length <= maximo) return texto;
	return texto.substring(0, maximo);
}

export function montarIdentificacaoFinanceiroPdv({
	numeropdv,
	parcela,
	totalParcelas,
	nomeCliente,
}: MontarIdentificacaoFinanceiroPdvParametros): {
	documento: string;
	emitente: string;
	historico: string;
} {
	const parcelaTexto =
		totalParcelas > 1 ? ` Parc. ${parcela}/${totalParcelas}` : "";
	const entidadeTexto = nomeCliente?.trim();

	const documento = truncarTexto(
		`PDV ${numeropdv}${parcelaTexto}`.trim(),
		60,
	);

	const emitente = truncarTexto(
		entidadeTexto
			? `PDV ${numeropdv} - ${entidadeTexto}`
			: `PDV ${numeropdv}`,
		60,
	);

	const partesHistorico = [
		`Venda PDV #${numeropdv}`,
		entidadeTexto ? `Cliente: ${entidadeTexto}` : null,
		totalParcelas > 1 ? `Parcela ${parcela} de ${totalParcelas}` : null,
	];

	return {
		documento,
		emitente,
		historico: partesHistorico.filter(Boolean).join(" - "),
	};
}
