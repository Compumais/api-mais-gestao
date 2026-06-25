type MontarIdentificacaoFinanceiroNfParametros = {
	numero?: string | null | undefined;
	serie?: string | null | undefined;
	parcela: number;
	totalParcelas: number;
	nomeFornecedor?: string | null | undefined;
	nomeCliente?: string | null | undefined;
	tipo?: "compra" | "venda";
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
	nomeCliente,
	tipo = "compra",
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
	const entidadeTexto =
		tipo === "venda"
			? nomeCliente?.trim()
			: nomeFornecedor?.trim();
	const rotuloNf = tipo === "venda" ? "NF Venda" : "NF Compra";

	const documento = truncarTexto(
		`NF ${numeroExibicao}${serieParte}${parcelaTexto}`.trim(),
		60,
	);

	const emitente = truncarTexto(
		entidadeTexto
			? `NF ${numeroExibicao} - ${entidadeTexto}`
			: `NF ${numeroExibicao}${serieParte}`,
		60,
	);

	const partesHistorico = [
		`${rotuloNf} nº ${numeroExibicao}${serieParte}`,
		entidadeTexto
			? `${tipo === "venda" ? "Cliente" : "Fornecedor"}: ${entidadeTexto}`
			: null,
		totalParcelas > 1 ? `Parcela ${parcela} de ${totalParcelas}` : null,
	];

	return {
		documento,
		emitente,
		historico: partesHistorico.filter(Boolean).join(" - "),
	};
}
