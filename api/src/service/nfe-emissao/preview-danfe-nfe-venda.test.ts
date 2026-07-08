import { beforeEach, describe, expect, it, vi } from "vitest";
import * as gateway from "@/lib/nfe-gateway-client.js";
import * as preparar from "@/service/nfe-emissao/preparar-payload-emissao-nfe-venda.js";
import { previewDanfeNfeVendaService } from "./preview-danfe-nfe-venda.js";

vi.mock("@/lib/nfe-gateway-client.js");
vi.mock("@/service/nfe-emissao/preparar-payload-emissao-nfe-venda.js", async () => {
	const atual = await vi.importActual<
		typeof import("@/service/nfe-emissao/preparar-payload-emissao-nfe-venda.js")
	>("@/service/nfe-emissao/preparar-payload-emissao-nfe-venda.js");
	return {
		...atual,
		prepararPayloadEmissaoNfeVenda: vi.fn(),
	};
});

const paramsBase = {
	idusuario: "user-1",
	idempresa: "11111111-1111-1111-1111-111111111111",
	itens: [
		{
			descricao: "Produto teste",
			ncm: "61091000",
			cfop: "5102",
			unidade: "UN",
			quantidade: 1,
			valorUnitario: 10,
			orig: 0,
		},
	],
};

describe("previewDanfeNfeVendaService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("gera PDF via gateway em modo preview sem chamar emissão", async () => {
		vi.mocked(preparar.prepararPayloadEmissaoNfeVenda).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				numeracao: {
					numeroNf: 42,
					serie: "1",
					idserie: "serie-1",
					idnotafiscal: "00000000-0000-0000-0000-000000000000",
					reemissao: false,
				},
				payloadGateway: {
					configJson: { cnpj: "10579611000190" },
					pfxBase64: "pfx",
					senha: "senha",
					payloadNfe: {
						informacoesAdicionais: preparar.AVISO_PREVIEW_DANFE,
					},
				},
			} as never,
		});

		vi.mocked(gateway.previewDanfeNfeGateway).mockResolvedValue({
			sucesso: true,
			pdfBase64: Buffer.from("%PDF-1.4 preview").toString("base64"),
			modelo: 55,
		});

		const resultado = await previewDanfeNfeVendaService(paramsBase);

		expect(preparar.prepararPayloadEmissaoNfeVenda).toHaveBeenCalledWith(
			paramsBase,
			{ modo: "preview" },
		);
		expect(gateway.previewDanfeNfeGateway).toHaveBeenCalledTimes(1);
		expect(resultado.success).toBe(true);
		expect(resultado.body?.filename).toBe("preview-danfe-serie1-n42.pdf");
		expect(resultado.body?.pdf.toString("utf8")).toContain("%PDF");
	});

	it("retorna erro amigável quando o gateway falha", async () => {
		vi.mocked(preparar.prepararPayloadEmissaoNfeVenda).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				numeracao: {
					numeroNf: 1,
					serie: "1",
					idserie: "serie-1",
					idnotafiscal: "00000000-0000-0000-0000-000000000000",
					reemissao: false,
				},
				payloadGateway: {
					configJson: {},
					pfxBase64: "pfx",
					senha: "senha",
					payloadNfe: {},
				},
			} as never,
		});

		vi.mocked(gateway.previewDanfeNfeGateway).mockResolvedValue({
			sucesso: false,
			erro: "Certificado inválido",
		});

		const resultado = await previewDanfeNfeVendaService(paramsBase);

		expect(resultado.success).toBe(false);
		expect(resultado.error).toContain("Certificado inválido");
	});

	it("não chama o gateway quando há pendências de pré-requisito", async () => {
		vi.mocked(preparar.prepararPayloadEmissaoNfeVenda).mockResolvedValue({
			success: true,
			status: 200,
			body: {
				idnotafiscal: "",
				pendencias: [
					{ codigo: "CERTIFICADO", mensagem: "Certificado digital ausente" },
				],
			},
		});

		const resultado = await previewDanfeNfeVendaService(paramsBase);

		expect(resultado.success).toBe(false);
		expect(resultado.error).toContain("Certificado digital ausente");
		expect(gateway.previewDanfeNfeGateway).not.toHaveBeenCalled();
	});
});
