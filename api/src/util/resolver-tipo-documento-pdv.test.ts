import { describe, expect, it } from "vitest";
import {
	resolverTipoDocumentoPorFormaNfe,
	tipoDocumentoExigeClientePdv,
	tipoDocumentoGeraContasReceber,
} from "@/util/resolver-tipo-documento-pdv.js";

const creditoCaixa = {
	id: "cred-caixa",
	descricao: "Cartão de crédito",
	formapagamentonfe: "03",
	aprazo: 0,
	integracaixabanco: 1,
} as never;

const creditoReceber = {
	id: "cred-receber",
	descricao: "Cartão de crédito",
	formapagamentonfe: "03",
	aprazo: 0,
	integracaixabanco: 0,
} as never;

const visa = {
	id: "visa",
	descricao: "Visa crédito",
	formapagamentonfe: "03",
	aprazo: 0,
	integracaixabanco: 0,
} as never;

describe("resolver-tipo-documento-pdv", () => {
	it("não gera contas a receber quando a forma integra caixa", () => {
		expect(tipoDocumentoGeraContasReceber(creditoCaixa)).toBe(false);
		expect(tipoDocumentoGeraContasReceber(creditoReceber)).toBe(true);
	});

	it("escolhe a forma da bandeira quando houver mais de um cartão", () => {
		const tipo = resolverTipoDocumentoPorFormaNfe(
			[creditoReceber, visa],
			"03",
			"VISA",
		);
		expect(tipo?.id).toBe("visa");
	});

	it("prefere a forma que gera contas a receber", () => {
		const tipo = resolverTipoDocumentoPorFormaNfe(
			[creditoCaixa, creditoReceber],
			"03",
		);
		expect(tipo?.id).toBe("cred-receber");
	});

	it("não exige cliente em dinheiro, PIX ou cartão", () => {
		expect(
			tipoDocumentoExigeClientePdv({
				aprazo: 1,
				formapagamentonfe: "17",
			}),
		).toBe(false);
		expect(
			tipoDocumentoExigeClientePdv({
				aprazo: 1,
				formapagamentonfe: "01",
			}),
		).toBe(false);
		expect(
			tipoDocumentoExigeClientePdv({
				aprazo: 1,
				formapagamentonfe: "15",
			}),
		).toBe(true);
	});
});
