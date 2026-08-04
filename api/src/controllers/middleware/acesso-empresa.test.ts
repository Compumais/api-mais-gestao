import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requirePerfil } from "./require-perfil.js";
import { resolveEmpresaContext } from "./resolve-empresa-context.js";
import { requireFeature, requireModulo } from "./verify-plano.js";

vi.mock("@/repositories/empresa-repositories.js", () => ({
	buscarEmpresaPorId: vi.fn(),
}));
vi.mock("@/repositories/entidade-repositories.js", () => ({
	verificarUsuarioPertenceEmpresa: vi.fn(),
}));
vi.mock("@/service/planos/buscar-plano-efetivo.js", () => ({
	EntitlementAcessoNegadoError: class EntitlementAcessoNegadoError extends Error {
		code = "EMPRESA_ACESSO_NEGADO";
	},
	usuarioTemFeature: vi.fn(),
	usuarioTemModulo: vi.fn(),
}));

import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	usuarioTemFeature,
	usuarioTemModulo,
} from "@/service/planos/buscar-plano-efetivo.js";

function criarReply() {
	const reply = {
		statusCode: 200,
		payload: null as unknown,
		status(code: number) {
			this.statusCode = code;
			return this;
		},
		send(payload: unknown) {
			this.payload = payload;
			return this;
		},
	};
	return reply as unknown as FastifyReply & {
		statusCode: number;
		payload: unknown;
	};
}

describe("resolveEmpresaContext", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("não faz nada sem usuário autenticado", async () => {
		const request = {
			headers: {},
			user: undefined,
		} as unknown as FastifyRequest;
		const reply = criarReply();

		await resolveEmpresaContext(request, reply);
		expect(reply.statusCode).toBe(200);
		expect(request.empresaContext).toBeUndefined();
	});

	it("bloqueia empresa sem vínculo", async () => {
		vi.mocked(verificarUsuarioPertenceEmpresa).mockResolvedValue(false);
		const request = {
			headers: { "x-empresa-id": "e1" },
			user: { id: "u1", name: "U", roles: ["usuario"] },
		} as unknown as FastifyRequest;
		const reply = criarReply();

		await resolveEmpresaContext(request, reply);
		expect(reply.statusCode).toBe(403);
		expect((reply.payload as { code: string }).code).toBe(
			"EMPRESA_ACESSO_NEGADO",
		);
	});

	it("popula empresaContext quando vínculo é válido", async () => {
		vi.mocked(verificarUsuarioPertenceEmpresa).mockResolvedValue(true);
		vi.mocked(buscarEmpresaPorId).mockResolvedValue({
			id: "e1",
			idproprietario: "prop-1",
		} as never);
		const request = {
			headers: { "x-empresa-id": "e1" },
			user: { id: "u1", name: "U", roles: ["usuario"] },
		} as unknown as FastifyRequest;
		const reply = criarReply();

		await resolveEmpresaContext(request, reply);
		expect(reply.statusCode).toBe(200);
		expect(request.empresaContext).toEqual({
			idempresa: "e1",
			idproprietario: "prop-1",
		});
	});
});

describe("requireFeature / requireModulo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("retorna 401 sem sessão", async () => {
		const reply = criarReply();
		await requireFeature("notas_fiscais")(
			{ headers: {} } as FastifyRequest,
			reply,
		);
		expect(reply.statusCode).toBe(401);
	});

	it("libera feature quando entitlement permite", async () => {
		vi.mocked(usuarioTemFeature).mockResolvedValue(true);
		const reply = criarReply();
		const request = {
			headers: {},
			user: { id: "u1", name: "U", roles: ["admin"] },
			empresaContext: { idempresa: "e1", idproprietario: "prop" },
		} as unknown as FastifyRequest;

		await requireFeature("notas_fiscais")(request, reply);
		expect(reply.statusCode).toBe(200);
		expect(usuarioTemFeature).toHaveBeenCalledWith(
			expect.objectContaining({
				idusuario: "u1",
				feature: "notas_fiscais",
				idempresa: "e1",
				modo: "operacional",
			}),
		);
	});

	it("bloqueia módulo ausente", async () => {
		vi.mocked(usuarioTemModulo).mockResolvedValue(false);
		const reply = criarReply();
		const request = {
			headers: {},
			user: { id: "u1", name: "U", roles: ["admin"] },
			empresaContext: { idempresa: "e1", idproprietario: "prop" },
		} as unknown as FastifyRequest;

		await requireModulo("nfse")(request, reply);
		expect(reply.statusCode).toBe(403);
		expect((reply.payload as { code: string }).code).toBe("MODULE_REQUIRED");
	});
});

describe("requirePerfil", () => {
	it("bloqueia perfil sem permissão", async () => {
		const reply = criarReply();
		await requirePerfil("proprietario", "admin")(
			{
				user: { id: "u1", name: "U", roles: ["usuario"] },
			} as FastifyRequest,
			reply,
		);
		expect(reply.statusCode).toBe(403);
		expect((reply.payload as { code: string }).code).toBe("PROFILE_REQUIRED");
	});

	it("libera perfil permitido", async () => {
		const reply = criarReply();
		await requirePerfil("proprietario", "financeiro")(
			{
				user: { id: "u1", name: "U", roles: ["financeiro"] },
			} as FastifyRequest,
			reply,
		);
		expect(reply.statusCode).toBe(200);
	});
});
