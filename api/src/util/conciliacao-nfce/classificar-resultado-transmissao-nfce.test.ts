import { describe, expect, it } from "vitest";
import { classificarConsultaChaveNfce } from "./classificar-resultado-transmissao-nfce.js";

describe("classificarConsultaChaveNfce", () => {
	it("trata cStat 151 como cancelamento", () => {
		expect(classificarConsultaChaveNfce("151")).toBe("cancelada");
		expect(classificarConsultaChaveNfce("101")).toBe("cancelada");
		expect(classificarConsultaChaveNfce("155")).toBe("cancelada");
	});
});
