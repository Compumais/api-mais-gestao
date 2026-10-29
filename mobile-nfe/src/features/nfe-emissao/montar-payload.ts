import {
	emissaoNfeFormSchema,
	montarPagamentoEmissaoNfe,
	type EmissaoNfeFormData,
} from "@mais-gestao/nfe-emissao-shared";
export function montarPayloadEmissao(
	dados: Partial<EmissaoNfeFormData>,
	totaisFiscais?: Record<string, number>,
	formaPagamento = "01",
): EmissaoNfeFormData {
	const totalNota = totaisFiscais?.totalNota ?? 0;
	const pagamento = montarPagamentoEmissaoNfe(formaPagamento, totalNota);

	const payload = {
		...dados,
		pagamento: dados.pagamento ?? pagamento,
		itens: dados.itens ?? [],
	} as EmissaoNfeFormData;

	const parsed = emissaoNfeFormSchema.safeParse(payload);
	if (parsed.success) {
		return parsed.data;
	}

	if (formaPagamento === "90") {
		return {
			...payload,
			pagamento: { formas: [{ tPag: "90", vPag: 0.01 }] },
		} as EmissaoNfeFormData;
	}

	throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
}
