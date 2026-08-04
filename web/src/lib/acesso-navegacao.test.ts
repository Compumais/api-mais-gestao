import { describe, expect, it } from "vitest";
import {
	isPerfilMenuRestrito,
	podeAcessarPorPolitica,
} from "./acesso-navegacao";
import { isRouteAllowedForSuper } from "./perfis";
import { podeAcessarRota } from "./regras-acesso-rotas";

const ctxBase = {
	perfil: ["proprietario"] as string[],
	hasFeature: (codigo: string) => codigo === "notas_fiscais",
	hasModulo: (codigo: string) => codigo === "gourmet",
};

describe("podeAcessarPorPolitica", () => {
	it("libera item sem restrição", () => {
		expect(podeAcessarPorPolitica(undefined, ctxBase)).toBe(true);
	});

	it("exige feature e perfil", () => {
		expect(
			podeAcessarPorPolitica(
				{
					feature: "notas_fiscais",
					perfis: ["proprietario", "admin"],
				},
				ctxBase,
			),
		).toBe(true);

		expect(
			podeAcessarPorPolitica(
				{ feature: "ordem_servico", perfis: ["proprietario"] },
				ctxBase,
			),
		).toBe(false);

		expect(
			podeAcessarPorPolitica(
				{ feature: "notas_fiscais", perfis: ["admin"] },
				{ ...ctxBase, perfil: ["usuario"] },
			),
		).toBe(false);
	});

	it("exige módulo", () => {
		expect(podeAcessarPorPolitica({ modulo: "gourmet" }, ctxBase)).toBe(true);
		expect(podeAcessarPorPolitica({ modulo: "nfse" }, ctxBase)).toBe(false);
	});
});

describe("podeAcessarRota", () => {
	it("bloqueia NFS-e sem módulo", () => {
		expect(podeAcessarRota("/nota-fiscal-servico", ctxBase)).toBe(false);
	});

	it("libera NFS-e com módulo e perfil adequado", () => {
		expect(
			podeAcessarRota("/nota-fiscal-servico", {
				...ctxBase,
				hasModulo: (c) => c === "nfse",
			}),
		).toBe(true);
	});

	it("bloqueia gestão de usuários para perfil usuario", () => {
		expect(
			podeAcessarRota("/usuarios", {
				...ctxBase,
				perfil: ["usuario"],
			}),
		).toBe(false);
	});

	it("libera tipos de problema com feature ordem_servico", () => {
		expect(
			podeAcessarRota("/tipos-problema", {
				...ctxBase,
				hasFeature: (c) => c === "ordem_servico",
			}),
		).toBe(true);
	});

	it("bloqueia tipos de problema sem feature ordem_servico", () => {
		expect(podeAcessarRota("/tipos-problema", ctxBase)).toBe(false);
	});

	it("libera dashboard sem regra específica", () => {
		expect(podeAcessarRota("/dashboard", ctxBase)).toBe(true);
	});
});

describe("isPerfilMenuRestrito", () => {
	it("marca somente perfil usuario puro como restrito", () => {
		expect(isPerfilMenuRestrito(["usuario"])).toBe(true);
		expect(isPerfilMenuRestrito(["proprietario"])).toBe(false);
		expect(isPerfilMenuRestrito(["financeiro"])).toBe(false);
		expect(isPerfilMenuRestrito(["garcom"])).toBe(false);
	});
});

describe("rotas super", () => {
	it("permite /super/planos", () => {
		expect(isRouteAllowedForSuper("/super/planos")).toBe(true);
		expect(isRouteAllowedForSuper("/super/planos/editar")).toBe(true);
	});
});
