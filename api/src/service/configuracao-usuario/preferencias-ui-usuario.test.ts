import { beforeEach, describe, expect, it, vi } from "vitest";
import * as configuracaoUsuarioRepository from "@/repositories/configuracao-usuario-repositories.js";
import { atualizarPreferenciasUiUsuarioService } from "./atualizar-preferencias-ui-usuario.js";
import { buscarPreferenciasUiUsuarioService } from "./buscar-preferencias-ui-usuario.js";

vi.mock("@/repositories/configuracao-usuario-repositories");

describe("preferencias UI do usuário", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("buscarPreferenciasUiUsuarioService", () => {
		it("deve retornar preferências vazias quando não há configuração", async () => {
			vi.mocked(
				configuracaoUsuarioRepository.buscarConfiguracaoUsuario,
			).mockResolvedValue(undefined);

			const resultado = await buscarPreferenciasUiUsuarioService({
				idusuario: "usuario-1",
			});

			expect(resultado.success).toBe(true);
			if (resultado.success) {
				expect(resultado.body).toEqual({ colunasTabelas: {} });
			}
		});

		it("deve retornar preferenciasui existentes do usuário logado", async () => {
			vi.mocked(
				configuracaoUsuarioRepository.buscarConfiguracaoUsuario,
			).mockResolvedValue({
				id: "cfg-1",
				idusuario: "usuario-1",
				integracoes: {},
				preferenciasui: {
					colunasTabelas: {
						"ordens-servico": { placa: true, codigo: true },
					},
				},
				criadoem: "2026-01-01",
				atualizadoem: "2026-01-01",
			});

			const resultado = await buscarPreferenciasUiUsuarioService({
				idusuario: "usuario-1",
			});

			expect(resultado.success).toBe(true);
			if (resultado.success) {
				expect(resultado.body).toEqual({
					colunasTabelas: {
						"ordens-servico": { placa: true, codigo: true },
					},
				});
			}
			expect(
				configuracaoUsuarioRepository.buscarConfiguracaoUsuario,
			).toHaveBeenCalledWith("usuario-1");
		});
	});

	describe("atualizarPreferenciasUiUsuarioService", () => {
		it("deve atualizar e retornar preferências mescladas", async () => {
			vi.mocked(
				configuracaoUsuarioRepository.criarOuAtualizarPreferenciasUiUsuario,
			).mockResolvedValue({
				id: "cfg-1",
				idusuario: "usuario-1",
				integracoes: {},
				preferenciasui: {
					colunasTabelas: {
						"ordens-servico": { placa: true, marca: false },
					},
				},
				criadoem: "2026-01-01",
				atualizadoem: "2026-01-02",
			});

			const resultado = await atualizarPreferenciasUiUsuarioService({
				idusuario: "usuario-1",
				dados: {
					colunasTabelas: {
						"ordens-servico": { placa: true, marca: false },
					},
				},
			});

			expect(resultado.success).toBe(true);
			if (resultado.success) {
				expect(resultado.body).toEqual({
					colunasTabelas: {
						"ordens-servico": { placa: true, marca: false },
					},
				});
			}
			expect(
				configuracaoUsuarioRepository.criarOuAtualizarPreferenciasUiUsuario,
			).toHaveBeenCalledWith("usuario-1", {
				colunasTabelas: {
					"ordens-servico": { placa: true, marca: false },
				},
			});
		});

		it("deve atualizar layoutMenu preservando colunas existentes", async () => {
			vi.mocked(
				configuracaoUsuarioRepository.criarOuAtualizarPreferenciasUiUsuario,
			).mockResolvedValue({
				id: "cfg-1",
				idusuario: "usuario-1",
				integracoes: {},
				preferenciasui: {
					colunasTabelas: {
						"ordens-servico": { placa: true },
					},
					layoutMenu: "topbar",
				},
				criadoem: "2026-01-01",
				atualizadoem: "2026-01-02",
			});

			const resultado = await atualizarPreferenciasUiUsuarioService({
				idusuario: "usuario-1",
				dados: { layoutMenu: "topbar" },
			});

			expect(resultado.success).toBe(true);
			if (resultado.success) {
				expect(resultado.body.layoutMenu).toBe("topbar");
				expect(resultado.body.colunasTabelas).toEqual({
					"ordens-servico": { placa: true },
				});
			}
			expect(
				configuracaoUsuarioRepository.criarOuAtualizarPreferenciasUiUsuario,
			).toHaveBeenCalledWith("usuario-1", { layoutMenu: "topbar" });
		});

		it("deve retornar 404 quando a persistência falhar", async () => {
			vi.mocked(
				configuracaoUsuarioRepository.criarOuAtualizarPreferenciasUiUsuario,
			).mockResolvedValue(undefined);

			const resultado = await atualizarPreferenciasUiUsuarioService({
				idusuario: "usuario-1",
				dados: { colunasTabelas: {} },
			});

			expect(resultado.success).toBe(false);
			if (!resultado.success) {
				expect(resultado.status).toBe(404);
			}
		});
	});
});
