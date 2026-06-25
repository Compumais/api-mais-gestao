import { v4 as uuidv4 } from "uuid";
import type { NovoTipoDocumentoFinanceiro } from "@/model/tipo-documento-financeiro-model.js";

export type TipoDocumentoFinanceiroPadrao = {
	descricao: string;
	formapagamentonfe: string;
	integracaixabanco: number;
	aprazo: number;
	prazodias?: number;
};

export const TIPOS_DOCUMENTO_FINANCEIRO_PADRAO: TipoDocumentoFinanceiroPadrao[] =
	[
		{
			descricao: "Dinheiro",
			formapagamentonfe: "01",
			integracaixabanco: 1,
			aprazo: 0,
		},
		{
			descricao: "PIX",
			formapagamentonfe: "17",
			integracaixabanco: 1,
			aprazo: 0,
		},
		{
			descricao: "Cartão de crédito",
			formapagamentonfe: "03",
			integracaixabanco: 0,
			aprazo: 0,
		},
		{
			descricao: "Cartão de débito",
			formapagamentonfe: "04",
			integracaixabanco: 1,
			aprazo: 0,
		},
		{
			descricao: "Boleto bancário",
			formapagamentonfe: "15",
			integracaixabanco: 0,
			aprazo: 1,
			prazodias: 30,
		},
	];

export function montarTiposDocumentoFinanceiroPadrao(
	idempresa: string,
): NovoTipoDocumentoFinanceiro[] {
	const agora = Date.now();

	return TIPOS_DOCUMENTO_FINANCEIRO_PADRAO.map((tipo) => ({
		id: uuidv4(),
		idempresa,
		descricao: tipo.descricao,
		acao: 1,
		inativo: 0,
		integracaixabanco: tipo.integracaixabanco,
		formapagamentonfe: tipo.formapagamentonfe,
		aprazo: tipo.aprazo,
		prazodias: tipo.prazodias ?? null,
		currenttimemillis: agora,
	}));
}
