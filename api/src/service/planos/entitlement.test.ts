import { beforeEach, describe, expect, it, vi } from "vitest";
import * as empresaRepositories from "@/repositories/empresa-repositories.js";
import * as saasRepositories from "@/repositories/saas-catalog-repositories.js";
import * as usuariosRepositories from "@/repositories/usuarios-repositories.js";
import {
	atribuirEntitlementAdminService,
	criarModuloAdminService,
	criarPlanoAdminService,
} from "@/service/admin/gerenciar-planos-saas.js";
import {
	buscarEntitlementService,
	usuarioTemFeature,
	usuarioTemModulo,
} from "@/service/planos/buscar-plano-efetivo.js";
import { downgradePlanoService } from "@/service/planos/downgrade-plano.js";
import { upgradePlanoService } from "@/service/planos/upgrade-plano.js";

vi.mock("@/repositories/empresa-repositories.js");
vi.mock("@/repositories/saas-catalog-repositories.js");
vi.mock("@/repositories/usuarios-repositories.js");
vi.mock("@/service/asaas/asaas.service.js");
vi.mock("@/repositories/assinatura-repositories.js");

describe("entitlement SaaS", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("retorna SEM_PLANO quando usuário não tem plano", async () => {
		vi.mocked(usuariosRepositories.buscarPlanoUsuario).mockResolvedValue({
			plano: null,
			plano_inicio_ciclo: null,
			plano_fim_ciclo: null,
			plano_proximo: null,
		});

		const resultado = await buscarEntitlementService({ idusuario: "u1" });
		expect(resultado.status).toBe("SEM_PLANO");
		expect(resultado.features).toEqual([]);
		expect(resultado.limites.maxempresas).toBe(0);
	});

	it("resolve features e módulos do proprietário da empresa", async () => {
		vi.mocked(empresaRepositories.buscarEmpresaPorId).mockResolvedValue({
			id: "e1",
			idproprietario: "prop-1",
		} as never);
		vi.mocked(usuariosRepositories.buscarPlanoUsuario).mockResolvedValue({
			plano: "BASIC",
			plano_inicio_ciclo: new Date(),
			plano_fim_ciclo: new Date(),
			plano_proximo: null,
		});
		vi.mocked(saasRepositories.buscarPlanoSaasPorCodigo).mockResolvedValue({
			id: "plano-basic",
			codigo: "BASIC",
			nome: "Básico",
			valormensal: "99.00",
			maxempresas: 1,
			maxusuarios: 3,
			ativo: true,
		} as never);
		vi.mocked(saasRepositories.listarCodigosFeaturesDoPlano).mockResolvedValue([
			"ordem_servico",
			"contas_pagar_receber",
		]);
		vi.mocked(saasRepositories.listarModulosAtivosDoUsuario).mockResolvedValue([
			{ codigo: "gourmet" },
		] as never);

		const resultado = await buscarEntitlementService({
			idusuario: "operador",
			idempresa: "e1",
		});

		expect(resultado.idusuario).toBe("prop-1");
		expect(resultado.plano).toBe("BASIC");
		expect(resultado.features).toContain("ordem_servico");
		expect(resultado.modulos).toContain("gourmet");
		expect(resultado.limites.maxempresas).toBe(1);
	});

	it("aceita códigos dinâmicos de plano no entitlement", async () => {
		vi.mocked(usuariosRepositories.buscarPlanoUsuario).mockResolvedValue({
			plano: "STARTER_PLUS",
			plano_inicio_ciclo: new Date(),
			plano_fim_ciclo: new Date(),
			plano_proximo: null,
		});
		vi.mocked(saasRepositories.buscarPlanoSaasPorCodigo).mockResolvedValue({
			id: "plano-starter",
			codigo: "STARTER_PLUS",
			nome: "Starter Plus",
			valormensal: "49.00",
			maxempresas: 1,
			maxusuarios: 2,
			ordem: 5,
			ativo: true,
		} as never);
		vi.mocked(saasRepositories.listarCodigosFeaturesDoPlano).mockResolvedValue([
			"ordem_servico",
		]);
		vi.mocked(saasRepositories.listarModulosAtivosDoUsuario).mockResolvedValue(
			[] as never,
		);

		const resultado = await buscarEntitlementService({ idusuario: "u1" });
		expect(resultado.plano).toBe("STARTER_PLUS");
		expect(resultado.nomePlano).toBe("Starter Plus");
		expect(resultado.features).toContain("ordem_servico");
	});

	it("usuarioTemFeature e usuarioTemModulo respeitam entitlement", async () => {
		vi.mocked(usuariosRepositories.buscarPlanoUsuario).mockResolvedValue({
			plano: "PREMIUM",
			plano_inicio_ciclo: new Date(),
			plano_fim_ciclo: new Date(),
			plano_proximo: null,
		});
		vi.mocked(saasRepositories.buscarPlanoSaasPorCodigo).mockResolvedValue({
			id: "plano-premium",
			codigo: "PREMIUM",
			nome: "Premium",
			valormensal: "199.00",
			maxempresas: 2,
			maxusuarios: 6,
			ativo: true,
		} as never);
		vi.mocked(saasRepositories.listarCodigosFeaturesDoPlano).mockResolvedValue([
			"notas_fiscais",
		]);
		vi.mocked(saasRepositories.listarModulosAtivosDoUsuario).mockResolvedValue([
			{ codigo: "nfse" },
		] as never);

		await expect(
			usuarioTemFeature({ idusuario: "u1", feature: "notas_fiscais" }),
		).resolves.toBe(true);
		await expect(
			usuarioTemFeature({ idusuario: "u1", feature: "ordem_servico" }),
		).resolves.toBe(false);
		await expect(
			usuarioTemModulo({ idusuario: "u1", modulo: "nfse" }),
		).resolves.toBe(true);
		await expect(
			usuarioTemModulo({ idusuario: "u1", modulo: "gourmet" }),
		).resolves.toBe(false);
	});
});

describe("criar plano/módulo admin", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("rejeita código de plano duplicado com 409", async () => {
		vi.mocked(saasRepositories.buscarPlanoSaasPorCodigo).mockResolvedValue({
			id: "existente",
			codigo: "BASIC",
		} as never);

		const resultado = await criarPlanoAdminService({
			codigo: "BASIC",
			nome: "Básico",
			valormensal: "99",
			maxempresas: 1,
			maxusuarios: 3,
			ordem: 1,
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(409);
		}
	});

	it("cria plano com código dinâmico", async () => {
		vi.mocked(saasRepositories.buscarPlanoSaasPorCodigo).mockResolvedValue(
			null,
		);
		vi.mocked(saasRepositories.criarPlanoSaas).mockResolvedValue({
			id: "novo",
			codigo: "GROWTH",
			nome: "Growth",
			valormensal: "149.00",
			maxempresas: 3,
			maxusuarios: 10,
			ordem: 15,
			ativo: true,
		} as never);
		vi.mocked(saasRepositories.substituirFeaturesDoPlano).mockResolvedValue();
		vi.mocked(saasRepositories.listarPlanosComFeatures).mockResolvedValue([
			{
				id: "novo",
				codigo: "GROWTH",
				features: [],
			},
		] as never);

		const resultado = await criarPlanoAdminService({
			codigo: "growth",
			nome: "Growth",
			valormensal: "149.00",
			maxempresas: 3,
			maxusuarios: 10,
			ordem: 15,
			idfeatures: [],
		});

		expect(resultado.success).toBe(true);
		if (resultado.success) {
			expect(resultado.status).toBe(201);
			expect((resultado.body as { codigo: string }).codigo).toBe("GROWTH");
		}
	});

	it("rejeita código de módulo duplicado com 409", async () => {
		vi.mocked(saasRepositories.buscarModuloSaasPorCodigo).mockResolvedValue({
			id: "m1",
			codigo: "gourmet",
		} as never);

		const resultado = await criarModuloAdminService({
			codigo: "gourmet",
			nome: "Gourmet",
			valormensal: "49",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(409);
		}
	});
});

describe("entitlement somente proprietário", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("bloqueia atribuição para usuário não proprietário", async () => {
		vi.mocked(usuariosRepositories.buscarUsuarioPorId).mockResolvedValue({
			id: "u1",
			perfil: ["usuario"],
		} as never);

		const resultado = await atribuirEntitlementAdminService({
			idusuario: "u1",
			plano: "BASIC",
		});

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(400);
			expect(resultado.error).toMatch(/proprietários/i);
		}
	});
});

describe("upgrade/downgrade por ordem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("upgrade aceita plano dinâmico com ordem superior", async () => {
		vi.mocked(usuariosRepositories.buscarUsuarioPorId).mockResolvedValue({
			id: "u1",
			plano: "BASIC",
			plano_inicio_ciclo: new Date(),
			plano_fim_ciclo: new Date(Date.now() + 15 * 86400000),
		} as never);
		vi.mocked(saasRepositories.buscarPlanoSaasPorCodigo).mockImplementation(
			async (codigo: string) => {
				if (codigo === "BASIC") {
					return {
						id: "p1",
						codigo: "BASIC",
						ordem: 10,
						valormensal: "99",
						ativo: true,
						nome: "Básico",
					} as never;
				}
				return {
					id: "p2",
					codigo: "GROWTH",
					ordem: 20,
					valormensal: "149",
					ativo: true,
					nome: "Growth",
				} as never;
			},
		);
		vi.mocked(
			empresaRepositories.buscarEmpresaCobrancaDoProprietario,
		).mockResolvedValue({ id: "e1" } as never);

		const asaas = await import("@/service/asaas/asaas.service.js");
		const assinatura = await import(
			"@/repositories/assinatura-repositories.js"
		);
		vi.mocked(assinatura.buscarClienteAsaas).mockResolvedValue({
			idclienteasaas: "cus_1",
		} as never);
		vi.mocked(asaas.createPayment).mockResolvedValue({
			id: "pay_1",
			invoiceUrl: "https://x",
		} as never);
		vi.mocked(asaas.createSubscription).mockResolvedValue({
			id: "sub_1",
			invoiceUrl: "https://x",
			status: "ACTIVE",
		} as never);
		vi.mocked(assinatura.buscarAssinaturaPorEmpresa).mockResolvedValue(
			null as never,
		);
		vi.mocked(assinatura.criarAssinatura).mockResolvedValue({} as never);
		vi.mocked(usuariosRepositories.atualizarPlanoUsuario).mockResolvedValue(
			{} as never,
		);

		const resultado = await upgradePlanoService({
			idusuario: "u1",
			planoNovo: "GROWTH",
			creditCard: {
				holderName: "Teste",
				number: "4111111111111111",
				expiryMonth: "12",
				expiryYear: "2030",
				ccv: "123",
			},
			creditCardHolderInfo: {
				name: "Teste",
				email: "t@t.com",
				cpfCnpj: "12345678901",
				phone: "11999999999",
			},
			remoteIp: "127.0.0.1",
		});

		expect(resultado.planoNovo).toBe("GROWTH");
	});

	it("downgrade rejeita plano com ordem maior ou igual", async () => {
		vi.mocked(usuariosRepositories.buscarUsuarioPorId).mockResolvedValue({
			id: "u1",
			plano: "PREMIUM",
			plano_fim_ciclo: new Date(),
		} as never);
		vi.mocked(saasRepositories.buscarPlanoSaasPorCodigo).mockImplementation(
			async (codigo: string) => {
				if (codigo === "PREMIUM") {
					return {
						codigo: "PREMIUM",
						ordem: 20,
						ativo: true,
					} as never;
				}
				return {
					codigo: "ENTERPRISE",
					ordem: 30,
					ativo: true,
				} as never;
			},
		);

		await expect(
			downgradePlanoService({ idusuario: "u1", planoNovo: "ENTERPRISE" }),
		).rejects.toThrow(/downgrade/i);
	});
});
