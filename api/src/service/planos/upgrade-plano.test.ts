import { beforeEach, describe, expect, it, vi } from "vitest";
import { upgradePlanoService } from "./upgrade-plano.js";

vi.mock("@/repositories/usuarios-repositories.js", () => ({
	buscarUsuarioPorId: vi.fn(),
	atualizarPlanoUsuario: vi.fn(),
}));

vi.mock("@/repositories/empresa-repositories.js", () => ({
	buscarEmpresaCobrancaDoProprietario: vi.fn(),
}));

vi.mock("@/repositories/assinatura-repositories.js", () => ({
	buscarClienteAsaas: vi.fn(),
	criarClienteAsaas: vi.fn(),
	buscarAssinaturaPorEmpresa: vi.fn(),
	criarAssinatura: vi.fn(),
	atualizarAssinatura: vi.fn(),
}));

vi.mock("@/service/asaas/asaas.service.js", () => ({
	getCustomerByEmail: vi.fn(),
	createCustomer: vi.fn(),
	createSubscription: vi.fn(),
	createPayment: vi.fn(),
}));

describe("upgradePlanoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deve cobrar diferença (payment) e atualizar plano do usuário", async () => {
		const usuariosRepo = await import("@/repositories/usuarios-repositories.js");
		const empresaRepo = await import("@/repositories/empresa-repositories.js");
		const assinaturaRepo = await import("@/repositories/assinatura-repositories.js");
		const asaas = await import("@/service/asaas/asaas.service.js");

		vi.mocked(usuariosRepo.buscarUsuarioPorId).mockResolvedValue({
			id: "usuario-1",
			plano: "BASIC",
			plano_inicio_ciclo: "2026-03-01",
			plano_fim_ciclo: "2026-03-31",
		} as any);

		vi.mocked(empresaRepo.buscarEmpresaCobrancaDoProprietario).mockResolvedValue({
			id: "empresa-1",
		} as any);

		vi.mocked(assinaturaRepo.buscarClienteAsaas).mockResolvedValue({
			id: "cli-1",
			idempresa: "empresa-1",
			idclienteasaas: "cust-1",
			criadoem: new Date(),
		} as any);

		vi.mocked(assinaturaRepo.buscarAssinaturaPorEmpresa).mockResolvedValue({
			id: "ass-1",
			idempresa: "empresa-1",
			idassinaturaasaas: "sub-1",
			status: "ACTIVE",
			plano: "BASIC",
			valor: "99.00",
			ciclo: "MONTHLY",
			proximovencimento: "2026-03-31",
			urlpagamento: null,
			criadoem: new Date(),
			atualizadoem: new Date(),
		} as any);

		vi.mocked(asaas.createPayment).mockResolvedValue({
			id: "pay-1",
			customer: "cust-1",
			billingType: "CREDIT_CARD",
			value: 10,
			dueDate: "2026-03-11",
			status: "CONFIRMED",
			invoiceUrl: "https://example.com/invoice",
		} as any);

		vi.mocked(assinaturaRepo.atualizarAssinatura).mockResolvedValue({} as any);
		vi.mocked(usuariosRepo.atualizarPlanoUsuario).mockResolvedValue({} as any);

		const resultado = await upgradePlanoService({
			idusuario: "usuario-1",
			planoNovo: "PREMIUM" as any,
			creditCard: {
				holderName: "Teste",
				number: "4111111111111111",
				expiryMonth: "12",
				expiryYear: "2030",
				ccv: "123",
			},
			creditCardHolderInfo: {
				name: "Teste",
				email: "teste@example.com",
				cpfCnpj: "12345678900",
				phone: "11999999999",
			},
			remoteIp: "127.0.0.1",
		});

		expect(asaas.createPayment).toHaveBeenCalledTimes(1);
		expect(usuariosRepo.atualizarPlanoUsuario).toHaveBeenCalledTimes(1);
		expect(resultado.planoNovo).toBe("PREMIUM");
	});

	it("não deve atualizar plano se pagamento falhar", async () => {
		const usuariosRepo = await import("@/repositories/usuarios-repositories.js");
		const empresaRepo = await import("@/repositories/empresa-repositories.js");
		const assinaturaRepo = await import("@/repositories/assinatura-repositories.js");
		const asaas = await import("@/service/asaas/asaas.service.js");

		vi.mocked(usuariosRepo.buscarUsuarioPorId).mockResolvedValue({
			id: "usuario-1",
			plano: "BASIC",
			plano_inicio_ciclo: "2026-03-01",
			plano_fim_ciclo: "2026-03-31",
		} as any);
		vi.mocked(empresaRepo.buscarEmpresaCobrancaDoProprietario).mockResolvedValue({
			id: "empresa-1",
		} as any);
		vi.mocked(assinaturaRepo.buscarClienteAsaas).mockResolvedValue({
			id: "cli-1",
			idempresa: "empresa-1",
			idclienteasaas: "cust-1",
			criadoem: new Date(),
		} as any);
		vi.mocked(assinaturaRepo.buscarAssinaturaPorEmpresa).mockResolvedValue({
			id: "ass-1",
			idempresa: "empresa-1",
			idassinaturaasaas: "sub-1",
			status: "ACTIVE",
			plano: "BASIC",
			valor: "99.00",
			ciclo: "MONTHLY",
			proximovencimento: "2026-03-31",
			urlpagamento: null,
			criadoem: new Date(),
			atualizadoem: new Date(),
		} as any);
		vi.mocked(asaas.createPayment).mockRejectedValue(new Error("fail"));

		await expect(
			upgradePlanoService({
				idusuario: "usuario-1",
				planoNovo: "PREMIUM" as any,
				creditCard: {
					holderName: "Teste",
					number: "4111111111111111",
					expiryMonth: "12",
					expiryYear: "2030",
					ccv: "123",
				},
				creditCardHolderInfo: {
					name: "Teste",
					email: "teste@example.com",
					cpfCnpj: "12345678900",
					phone: "11999999999",
				},
				remoteIp: "127.0.0.1",
			}),
		).rejects.toBeInstanceOf(Error);

		expect(usuariosRepo.atualizarPlanoUsuario).not.toHaveBeenCalled();
	});
});
