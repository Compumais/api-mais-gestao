import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { interpretarRejeicaoNfceService } from "./interpretar-rejeicao-nfce.js";

vi.mock("@/service/nfce-emissao/buscar-detalhes-nfce.js");
vi.mock("@/service/configuracao-usuario/buscar-configuracao-usuario.js");
vi.mock("@/service/ia/completar-texto.js");

const PARAMS = {
	idusuario: "usuario-1",
	idempresa: "empresa-1",
	idnotafiscal: "nota-1",
};

async function mocks() {
	const detalhes = await import(
		"@/service/nfce-emissao/buscar-detalhes-nfce.js"
	);
	const config = await import(
		"@/service/configuracao-usuario/buscar-configuracao-usuario.js"
	);
	const ia = await import("@/service/ia/completar-texto.js");
	return { detalhes, config, ia };
}

function detalhesComRejeicao() {
	return {
		success: true as const,
		status: 200,
		body: {
			nota: {
				idnotafiscal: "nota-1",
				idvenda: "venda-1",
				numeronotafiscal: "101",
				serie: "1",
				chavenfe: null,
				protocolonfe: null,
				status: 110,
				tipoambientenfe: 2,
				valortotalnota: "18.00",
				emissao: null,
				datahoraemissao: null,
			},
			itens: [
				{
					nome: "Refrigerante",
					codigo: 10,
					quantidade: "1",
					precounitario: "18.00",
					valortotal: "18.00",
					unidade: "UN",
					ncm: "00000000",
					cfop: "5102",
					cst: null,
					csosn: "102",
				},
			],
			pagamentos: [{ meio: "dinheiro", label: "Dinheiro", valor: 18 }],
			troco: 0,
			rejeicao: {
				cStat: "778",
				xMotivo: "Rejeicao 778: Informado NCM inexistente",
			},
			contextoFiscal: { crt: 1, uf: "MG" },
			iaDisponivel: true,
		},
	};
}

function limparEnvOllama() {
	delete process.env.OLLAMA_BASE_URL;
	delete process.env.OLLAMA_MODEL;
}

describe("interpretarRejeicaoNfceService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		limparEnvOllama();
	});

	afterEach(() => {
		limparEnvOllama();
	});

	it("propaga erro do detalhe quando a nota não é encontrada", async () => {
		const { detalhes } = await mocks();
		vi.mocked(detalhes.buscarDetalhesNfceService).mockResolvedValue({
			success: false,
			status: 404,
			error: "NFC-e não encontrada",
			code: "NOT_FOUND_ERROR",
		});

		const resultado = await interpretarRejeicaoNfceService(PARAMS);

		expect(resultado.success).toBe(false);
		if (!resultado.success) {
			expect(resultado.status).toBe(404);
		}
	});

	it("não falha quando não há rejeição", async () => {
		const { detalhes } = await mocks();
		vi.mocked(detalhes.buscarDetalhesNfceService).mockResolvedValue({
			...detalhesComRejeicao(),
			body: {
				...detalhesComRejeicao().body,
				rejeicao: null,
			},
		});

		const resultado = await interpretarRejeicaoNfceService(PARAMS);

		expect(resultado.success).toBe(true);
		expect(resultado.body).toEqual(
			expect.objectContaining({
				interpretado: false,
				motivoNaoInterpretado: "sem_rejeicao",
			}),
		);
	});

	it("não falha quando não há chave de IA", async () => {
		const { detalhes, config } = await mocks();
		vi.mocked(detalhes.buscarDetalhesNfceService).mockResolvedValue(
			detalhesComRejeicao(),
		);
		vi.mocked(config.buscarConfiguracaoUsuarioService).mockResolvedValue({
			success: true,
			status: 200,
			body: null,
		});

		const resultado = await interpretarRejeicaoNfceService(PARAMS);

		expect(resultado.success).toBe(true);
		expect(resultado.body).toEqual(
			expect.objectContaining({
				interpretado: false,
				motivoNaoInterpretado: "sem_chave",
			}),
		);
	});

	it("interpreta a rejeição sem configuração do usuário quando o Ollama está no env", async () => {
		process.env.OLLAMA_BASE_URL = "http://ollama.interno:11434";
		process.env.OLLAMA_MODEL = "llama3.1";

		const { detalhes, config, ia } = await mocks();
		vi.mocked(detalhes.buscarDetalhesNfceService).mockResolvedValue(
			detalhesComRejeicao(),
		);
		vi.mocked(config.buscarConfiguracaoUsuarioService).mockResolvedValue({
			success: true,
			status: 200,
			body: null,
		});
		vi.mocked(ia.completarTextoIa).mockResolvedValue({
			ok: true,
			texto: JSON.stringify({
				classificacao: "PROVAVEL",
				explicacao: "A SEFAZ recusou o NCM informado no item.",
				comoCorrigir: "Corrija o NCM no cadastro do produto.",
			}),
			provedor: "ollama",
			modelo: "llama3.1",
		});

		const resultado = await interpretarRejeicaoNfceService(PARAMS);

		expect(ia.completarTextoIa).toHaveBeenCalledWith(
			expect.objectContaining({ integracoes: {} }),
		);
		expect(resultado.success).toBe(true);
		expect(resultado.body).toEqual(
			expect.objectContaining({
				interpretado: true,
				provedor: "ollama",
				classificacao: "PROVAVEL",
				comoCorrigir: "Corrija o NCM no cadastro do produto.",
			}),
		);
	});

	it("interpreta a rejeição com o JSON da IA", async () => {
		const { detalhes, config, ia } = await mocks();
		vi.mocked(detalhes.buscarDetalhesNfceService).mockResolvedValue(
			detalhesComRejeicao(),
		);
		vi.mocked(config.buscarConfiguracaoUsuarioService).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				id: "cfg-1",
				idusuario: "usuario-1",
				integracoes: { openaiApiKey: "sk-test" },
				criadoem: "",
				atualizadoem: "",
			},
		});
		vi.mocked(ia.completarTextoIa).mockResolvedValue({
			ok: true,
			texto: JSON.stringify({
				classificacao: "PROVAVEL",
				explicacao: "A SEFAZ recusou o NCM informado no item.",
				comoCorrigir:
					"Abra o cadastro do produto e informe um NCM válido de 8 dígitos.",
			}),
			provedor: "openai",
			modelo: "gpt-4o-mini",
		});

		const resultado = await interpretarRejeicaoNfceService(PARAMS);

		expect(resultado.success).toBe(true);
		expect(resultado.body).toEqual({
			interpretado: true,
			motivoNaoInterpretado: null,
			mensagem: null,
			provedor: "openai",
			classificacao: "PROVAVEL",
			explicacao: "A SEFAZ recusou o NCM informado no item.",
			comoCorrigir:
				"Abra o cadastro do produto e informe um NCM válido de 8 dígitos.",
		});
	});

	it("retorna 200 com erro_ia quando o provedor falha", async () => {
		const { detalhes, config, ia } = await mocks();
		vi.mocked(detalhes.buscarDetalhesNfceService).mockResolvedValue(
			detalhesComRejeicao(),
		);
		vi.mocked(config.buscarConfiguracaoUsuarioService).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				id: "cfg-1",
				idusuario: "usuario-1",
				integracoes: { openaiApiKey: "sk-test" },
				criadoem: "",
				atualizadoem: "",
			},
		});
		vi.mocked(ia.completarTextoIa).mockResolvedValue({
			ok: false,
			erro: "invalid api key",
		});

		const resultado = await interpretarRejeicaoNfceService(PARAMS);

		expect(resultado.success).toBe(true);
		expect(resultado.body).toEqual(
			expect.objectContaining({
				interpretado: false,
				motivoNaoInterpretado: "erro_ia",
				mensagem: "invalid api key",
			}),
		);
	});
});
