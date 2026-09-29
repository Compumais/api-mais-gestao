import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./connection.js", () => ({
	db: {
		select: vi.fn(),
	},
}));

vi.mock("../../drizzle/schema.js", () => ({
	empresa: { id: "id", idproprietario: "idproprietario" },
	entidade: {},
	terminalpdv: { id: "id", idempresa: "idempresa" },
	usuarioEmpresa: {
		idusuario: "idusuario",
		idempresa: "idempresa",
	},
}));

import { db } from "./connection.js";
import {
	PDV_DEVICE_USER_PREFIX,
	verificarUsuarioPertenceEmpresa,
} from "./entidade-repositories.js";

function mockSelectChain(rows: unknown[]) {
	const where = vi.fn().mockResolvedValue(rows);
	const from = vi.fn().mockReturnValue({ where });
	vi.mocked(db.select).mockReturnValue({ from } as never);
	return { from, where };
}

describe("verificarUsuarioPertenceEmpresa — device PDV", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("aceita pdv-device quando o terminal pertence à empresa", async () => {
		mockSelectChain([{ idempresa: "emp-1" }]);
		const ok = await verificarUsuarioPertenceEmpresa(
			`${PDV_DEVICE_USER_PREFIX}term-1`,
			"emp-1",
		);
		expect(ok).toBe(true);
	});

	it("nega pdv-device de outra empresa", async () => {
		mockSelectChain([{ idempresa: "emp-outra" }]);
		const ok = await verificarUsuarioPertenceEmpresa(
			`${PDV_DEVICE_USER_PREFIX}term-1`,
			"emp-1",
		);
		expect(ok).toBe(false);
	});

	it("nega pdv-device com id vazio", async () => {
		const ok = await verificarUsuarioPertenceEmpresa(
			PDV_DEVICE_USER_PREFIX,
			"emp-1",
		);
		expect(ok).toBe(false);
		expect(db.select).not.toHaveBeenCalled();
	});
});
