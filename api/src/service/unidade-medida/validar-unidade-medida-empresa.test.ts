import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UnidadeMedida } from "@/model/unidade-medida-model.js";
import * as unidadeMedidaRepository from "@/repositories/unidade-medida-repositories.js";
import {
	isUnidadeMedidaGlobal,
	unidadeMedidaPertenceEmpresa,
	validarUnidadeMedidaParaEmpresa,
} from "./validar-unidade-medida-empresa.js";

vi.mock("@/repositories/unidade-medida-repositories");

describe("validarUnidadeMedidaEmpresa", () => {
	const unidadeGlobalMock: UnidadeMedida = {
		id: "global-1",
		idempresa: null,
		codigo: "UN",
		nome: "Unidade",
		casasdecimais: 0,
		tipovalor: 0,
		currenttimemillis: 0,
	};

	const unidadeEmpresaMock: UnidadeMedida = {
		id: "empresa-1",
		idempresa: "empresa-123",
		codigo: "CX2",
		nome: "Caixa Especial",
		casasdecimais: 0,
		tipovalor: 0,
		currenttimemillis: 0,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve identificar unidade global", () => {
		expect(isUnidadeMedidaGlobal(unidadeGlobalMock)).toBe(true);
		expect(isUnidadeMedidaGlobal(unidadeEmpresaMock)).toBe(false);
	});

	it("deve permitir unidade global para qualquer empresa", () => {
		expect(unidadeMedidaPertenceEmpresa(unidadeGlobalMock, "empresa-123")).toBe(
			true,
		);
	});

	it("deve permitir unidade da mesma empresa", () => {
		expect(
			unidadeMedidaPertenceEmpresa(unidadeEmpresaMock, "empresa-123"),
		).toBe(true);
	});

	it("deve rejeitar unidade de outra empresa", () => {
		expect(
			unidadeMedidaPertenceEmpresa(unidadeEmpresaMock, "empresa-999"),
		).toBe(false);
	});

	it("deve validar unidade inexistente como inválida", async () => {
		vi.mocked(
			unidadeMedidaRepository.buscarUnidadeMedidaPorId,
		).mockResolvedValue(undefined);

		const resultado = await validarUnidadeMedidaParaEmpresa(
			"inexistente",
			"empresa-123",
		);

		expect(resultado).toBe(false);
	});
});
