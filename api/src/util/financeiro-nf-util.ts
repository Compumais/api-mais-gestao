type MontarIdentificacaoFinanceiroNfParametros = {
	numero?: string | null | undefined;
	serie?: string | null | undefined;
	parcela: number;
	totalParcelas: number;
	nomeFornecedor?: string | null | undefined;
};

function truncarTexto(texto: string, maximo: number): string {
	if (texto.length <= maximo) return texto;
	return texto.substring(0, maximo);
}

export function montarIdentificacaoFinanceiroNf({
	numero,
	serie,
	parcela,
	totalParcelas,
	nomeFornecedor,
}: MontarIdentificacaoFinanceiroNfParametros): {
	documento: string;
	emitente: string;
	historico: string;
} {
	const numeroExibicao = numero?.trim() || "S/N";
	const serieTexto = serie?.trim();
	const serieParte = serieTexto ? `/${serieTexto}` : "";
	const parcelaTexto =
		totalParcelas > 1 ? ` Parc. ${parcela}/${totalParcelas}` : "";
	const fornecedorTexto = nomeFornecedor?.trim();

	const documento = truncarTexto(
		`NF ${numeroExibicao}${serieParte}${parcelaTexto}`.trim(),
		60,
	);

	const emitente = truncarTexto(
		fornecedorTexto
			? `NF ${numeroExibicao} - ${fornecedorTexto}`
			: `NF ${numeroExibicao}${serieParte}`,
		60,
	);

	const partesHistorico = [
		`NF Compra nº ${numeroExibicao}${serieParte}`,
		fornecedorTexto ? `Fornecedor: ${fornecedorTexto}` : null,
		totalParcelas > 1 ? `Parcela ${parcela} de ${totalParcelas}` : null,
	];

	return {
		documento,
		emitente,
		historico: partesHistorico.filter(Boolean).join(" - "),
	};
}
