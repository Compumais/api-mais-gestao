import { describe, expect, it, vi } from "vitest";
import {
	formatarErroConexaoGateway,
	verificarSaudeNfeGateway,
} from "./nfe-gateway-client.js";

describe("formatarErroConexaoGateway", () => {
	it("deve traduzir fetch failed em mensagem de gateway indisponível", () => {
		const mensagem = formatarErroConexaoGateway(
			"http://127.0.0.1:8088",
			new TypeError("fetch failed", { cause: new Error("ECONNREFUSED") }),
		);

		expect(mensagem).toBe(
			"Não foi possível conectar ao gateway NF-e em http://127.0.0.1:8088. Verifique se o nfe-gateway está em execução.",
		);
	});

	it("deve traduzir timeout/abort", () => {
		const mensagem = formatarErroConexaoGateway(
			"http://127.0.0.1:8088",
			new Error("This operation was aborted"),
		);

		expect(mensagem).toBe("Tempo esgotado ao aguardar resposta do gateway NF-e.");
	});

	it("deve preservar mensagens de erro do gateway", () => {
		const mensagem = formatarErroConexaoGateway(
			"http://127.0.0.1:8088",
			new Error("Certificado inválido"),
		);

		expect(mensagem).toBe("Certificado inválido");
	});
});

describe("chamarNfeGateway", () => {
	it("deve retornar erro amigável quando fetch falha", async () => {
		const fetchOriginal = globalThis.fetch;
		globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

		const { consultarDistribuicaoDfeGateway } = await import("./nfe-gateway-client.js");
		const resposta = await consultarDistribuicaoDfeGateway({
			configJson: {},
			pfxBase64: "abc",
			senha: "123",
			ultNSU: "000000000000000",
		});

		expect(resposta.sucesso).toBe(false);
		expect(resposta.erro).toContain("Não foi possível conectar ao gateway NF-e");
		expect(resposta.erro).toContain("127.0.0.1:8088");

		globalThis.fetch = fetchOriginal;
	});
});

describe("verificarSaudeNfeGateway", () => {
	it("deve retornar false quando gateway não responde", async () => {
		const fetchOriginal = globalThis.fetch;
		globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

		await expect(verificarSaudeNfeGateway()).resolves.toBe(false);

		globalThis.fetch = fetchOriginal;
	});
});
