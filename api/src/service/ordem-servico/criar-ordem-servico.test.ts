import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entidadeRepositories from "@/repositories/entidade-repositories.js";
import * as eventoRepositories from "@/repositories/ordem-servico-evento-repositories.js";
import * as osRepositories from "@/repositories/ordem-servico-repositories.js";
import * as proximoCodigoRepositories from "@/repositories/proximo-codigo-repositories.js";
import * as auditoria from "@/service/auditoria/criar-auditoria.js";
import { criarOrdemServicoService } from "@/service/ordem-servico/criar-ordem-servico.js";
import * as helpers from "@/service/ordem-servico/ordem-servico-helpers.js";
import * as validarUsuario from "@/util/validar-usuario-empresa.js";

vi.mock("@/repositories/entidade-repositories.js");
vi.mock("@/repositories/ordem-servico-evento-repositories.js");
vi.mock("@/repositories/ordem-servico-repositories.js");
vi.mock("@/repositories/proximo-codigo-repositories.js");
vi.mock("@/service/auditoria/criar-auditoria.js");
vi.mock("@/service/ordem-servico/ordem-servico-helpers.js");
vi.mock("@/util/validar-usuario-empresa.js");

const IDEMPRESA = "69830980-9f0c-4c44-ba99-9001fcff1df2";
const IDCLIENTE = "f494a1f5-8299-5d70-b867-ca34aaae6312";

describe("criarOrdemServicoService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(
			entidadeRepositories.verificarUsuarioPertenceEmpresa,
		).mockResolvedValue(true);
		vi.mocked(helpers.garantirCatalogoTiposOrdemServico).mockResolvedValue(
			[] as never,
		);
		vi.mocked(helpers.garantirConfiguracaoOrdemServico).mockResolvedValue({
			camposextras: [],
			usaarea: 1,
			usaobjeto: 1,
			usatipoproblema: 1,
			usadadosveiculo: 1,
		} as never);
		vi.mocked(helpers.validarExtrasNaOrdemServico).mockReturnValue({
			valido: true,
			normalizados: [],
		});
		vi.mocked(validarUsuario.validarUsuariosDaEmpresa).mockResolvedValue(null);
		vi.mocked(entidadeRepositories.buscarEntidadePorId).mockResolvedValue({
			id: IDCLIENTE,
			idempresa: IDEMPRESA,
		} as never);
		vi.mocked(helpers.buscarTipoEventoPadrao).mockResolvedValue({
			id: "tipo-aberta",
			codigo: "ABERTA",
			status: 0,
			descricao: "Aberta",
		} as never);
		vi.mocked(
			proximoCodigoRepositories.buscarProximoCodigoOrdemServico,
		).mockResolvedValue(1);
		vi.mocked(osRepositories.criarOrdemServico).mockResolvedValue({
			id: "os-1",
			idempresa: IDEMPRESA,
			codigo: 1,
		} as never);
		vi.mocked(eventoRepositories.criarOrdemServicoEvento).mockResolvedValue({
			id: "evt-1",
		} as never);
		vi.mocked(auditoria.criarAuditoriaService).mockResolvedValue({
			success: true,
			status: 201,
		} as never);
	});

	it("retorna 400 quando atendente é inexistente", async () => {
		vi.mocked(validarUsuario.validarUsuariosDaEmpresa).mockResolvedValue(
			"Atendente inválido ou inexistente",
		);

		const resultado = await criarOrdemServicoService({
			idusuario: "user-logado",
			dadosOrdemServico: {
				idempresa: IDEMPRESA,
				idcliente: IDCLIENTE,
				idatendente: "4VZFeBIZJ3v696vu1yqMwBp36PbRgpYU",
				idultimotecnico: "4VZFeBIZJ3v696vu1yqMwBp36PbRgpYU",
			},
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
		expect(resultado).toMatchObject({
			error: "Atendente inválido ou inexistente",
		});
		expect(osRepositories.criarOrdemServico).not.toHaveBeenCalled();
	});

	it("retorna 400 quando cliente não pertence à empresa", async () => {
		vi.mocked(entidadeRepositories.buscarEntidadePorId).mockResolvedValue({
			id: IDCLIENTE,
			idempresa: "outra-empresa",
		} as never);

		const resultado = await criarOrdemServicoService({
			idusuario: "user-logado",
			dadosOrdemServico: {
				idempresa: IDEMPRESA,
				idcliente: IDCLIENTE,
			},
		});

		expect(resultado.success).toBe(false);
		expect(resultado.status).toBe(400);
		expect(resultado).toMatchObject({
			error: "Cliente inválido ou não pertence à empresa",
		});
		expect(osRepositories.criarOrdemServico).not.toHaveBeenCalled();
	});

	it("cria ordem de serviço com sucesso", async () => {
		const resultado = await criarOrdemServicoService({
			idusuario: "user-logado",
			dadosOrdemServico: {
				idempresa: IDEMPRESA,
				idcliente: IDCLIENTE,
				idatendente: "user-atendente",
				problemadescrito: "Carro não liga",
			},
		});

		expect(resultado.success).toBe(true);
		expect(resultado.status).toBe(201);
		expect(osRepositories.criarOrdemServico).toHaveBeenCalled();
	});
});
