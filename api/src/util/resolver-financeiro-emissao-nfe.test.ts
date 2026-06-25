import { describe, expect, it } from "vitest";
import {
	resolverDestinoFinanceiroFormaPagamento,
	resolverPrazoDiasTipoDocumento,
} from "@/util/resolver-financeiro-emissao-nfe.js";

describe("resolver-financeiro-emissao-nfe", () => {
	it("deve direcionar meio a prazo para contas a receber", () => {
		expect(
			resolverDestinoFinanceiroFormaPagamento({ aprazo: 1, integracaixabanco: 0 }),
		).toBe("contas_receber");
	});

	it("deve direcionar à vista com integração de caixa", () => {
		expect(
			resolverDestinoFinanceiroFormaPagamento({ aprazo: 0, integracaixabanco: 1 }),
		).toBe("caixa_imediato");
	});

	it("deve usar indPag=1 como a prazo", () => {
		expect(
			resolverDestinoFinanceiroFormaPagamento(
				{ aprazo: 0, integracaixabanco: 0 },
				1,
			),
		).toBe("contas_receber");
	});

	it("deve resolver prazo padrão do tipo documento", () => {
		expect(resolverPrazoDiasTipoDocumento({ aprazo: 1, prazodias: 15 })).toBe(15);
		expect(resolverPrazoDiasTipoDocumento({ aprazo: 0, prazodias: 15 })).toBe(0);
	});
});
