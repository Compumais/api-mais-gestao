import { campoPagamentoVazio } from "@/util/lancamento-pagamento-pdv.js";

export type DocumentoVendaPdv = "fiscal" | "gerencial";

const ROTULOS_MEIO: Record<string, string> = {
	DINHEIRO: "Dinheiro",
	PIX: "PIX",
	CARTAO: "Cartão",
	CARTAO_CREDITO: "Cartão crédito",
	CARTAOCREDITO: "Cartão crédito",
	CARTAO_DEBITO: "Cartão débito",
	CARTAODEBITO: "Cartão débito",
	PREPAGO: "Pré-pago",
};

export function rotuloMeioPagamentoPdv(meio: string): string {
	const chave = meio.trim().toUpperCase().replace(/\s+/g, "_");
	return ROTULOS_MEIO[chave] ?? meio.trim();
}

export function meiosPagamentoHistoricoVendaPdv(params: {
	pagamentos: Array<{
		meio: string;
		valor?: string | number | null;
		status?: string | null;
	}>;
	valordinheiro?: string | null;
	valorpix?: string | null;
	valorcartaocredito?: string | null;
	valorcartaodebito?: string | null;
	valorcartao?: string | null;
	valorprepago?: string | null;
}): string[] {
	const lancamentos = params.pagamentos.filter((item) => {
		if ((item.status ?? "ok") !== "ok") {
			return false;
		}
		if (item.valor == null || item.valor === "") {
			return true;
		}
		return !campoPagamentoVazio(item.valor);
	});

	if (lancamentos.length > 0) {
		return [
			...new Set(lancamentos.map((item) => rotuloMeioPagamentoPdv(item.meio))),
		];
	}

	const meios: string[] = [];
	if (!campoPagamentoVazio(params.valordinheiro)) {
		meios.push("Dinheiro");
	}
	if (!campoPagamentoVazio(params.valorpix)) {
		meios.push("PIX");
	}
	if (!campoPagamentoVazio(params.valorcartaocredito)) {
		meios.push("Cartão crédito");
	}
	if (!campoPagamentoVazio(params.valorcartaodebito)) {
		meios.push("Cartão débito");
	}
	if (!campoPagamentoVazio(params.valorcartao)) {
		meios.push("Cartão");
	}
	if (!campoPagamentoVazio(params.valorprepago)) {
		meios.push("Pré-pago");
	}
	return meios;
}

export function documentoHistoricoVendaPdv(params: {
	idnotafiscalnfce?: string | null;
	deveemitirnfce?: boolean | null;
}): DocumentoVendaPdv {
	if (params.idnotafiscalnfce || params.deveemitirnfce) {
		return "fiscal";
	}
	return "gerencial";
}
