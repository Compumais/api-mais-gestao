import { describe, expect, it } from "vitest";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { statusParaFiltroRelatorio } from "./relatorio-notas-fiscais-repositories.js";

describe("statusParaFiltroRelatorio", () => {
	it("agrupa pendentes, rejeitadas e denegadas sem incluir terminais", () => {
		expect(statusParaFiltroRelatorio("pendente")).toEqual([
			NFE_STATUS.PENDENTE,
			NFE_STATUS.REJEITADA,
			NFE_STATUS.DENEGADA,
		]);
	});

	it("agrupa os dois estados canônicos de cancelamento", () => {
		expect(statusParaFiltroRelatorio("cancelada")).toEqual([
			NFE_STATUS.CANCELADA,
			NFE_STATUS.CANCELADA_FORA_PRAZO,
		]);
	});

	it("mantém inutilização isolada de notas autorizadas", () => {
		expect(statusParaFiltroRelatorio("inutilizada")).toEqual([
			NFE_STATUS.INUTILIZADA,
		]);
		expect(statusParaFiltroRelatorio("autorizada")).toEqual([
			NFE_STATUS.AUTORIZADA,
		]);
	});
});
