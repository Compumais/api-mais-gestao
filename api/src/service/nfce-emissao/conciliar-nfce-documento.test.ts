import { beforeEach, describe, expect, it, vi } from "vitest";
import * as gateway from "@/lib/nfe-gateway-client.js";
import * as notaRepository from "@/repositories/nota-fiscal-repositories.js";
import * as auditoria from "@/service/auditoria/criar-auditoria.js";
import * as credenciaisNfce from "@/service/nfce-emissao/montar-credenciais-gateway-nfce.js";
import * as arquivarXml from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { montarChaveAcessoNfce } from "@/util/conciliacao-nfce/identidade-emissao-nfce.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { conciliarNfceDocumento } from "./conciliar-nfce-documento.js";

vi.mock("@/lib/nfe-gateway-client.js");
vi.mock("@/repositories/nota-fiscal-repositories.js");
vi.mock("@/service/nfce-emissao/montar-credenciais-gateway-nfce.js");
vi.mock("@/service/nota-fiscal/arquivar-xml-nota-fiscal.js");
vi.mock("@/service/auditoria/criar-auditoria.js");
vi.mock("@/service/dominio/enfileirar-envio-dominio.js", () => ({
	enfileirarEnvioDominioSilencioso: vi.fn(),
}));

function chaveTeste(cNF: string): string {
	const chave = montarChaveAcessoNfce({
		cUF: 31,
		anoMes: "2609",
		cnpj: "12345678000195",
		serie: 1,
		numero: 1500,
		tpEmis: 1,
		cNF,
	});
	if (!chave) {
		throw new Error("chave de teste inválida");
	}
	return chave;
}

const CHAVE_LOCAL = chaveTeste("12345678");
const CHAVE_SEFAZ = chaveTeste("87654321");

function xml(valor: string, chave: string) {
	return `<nfeProc><NFe><infNFe Id="NFe${chave}"><ide><mod>65</mod><serie>1</serie><nNF>1500</nNF><tpEmis>1</tpEmis></ide><emit><CNPJ>12345678000195</CNPJ></emit><dest><CPF>12345678901</CPF></dest><det><prod><qCom>1</qCom></prod></det><total><ICMSTot><vNF>${valor}</vNF></ICMSTot></total><pag><detPag><tPag>01</tPag><vPag>${valor}</vPag></detPag></pag></infNFe></NFe><protNFe><infProt><nProt>135240000000001</nProt><cStat>100</cStat><chNFe>${chave}</chNFe></infProt></protNFe></nfeProc>`;
}

const notaBase = {
	id: "nfce-1",
	idempresa: "emp-1",
	modelo: "65",
	status: NFE_STATUS.REJEITADA,
	chavenfe: CHAVE_LOCAL,
	protocolonfe: null,
	serie: "1",
	numeronotafiscal: "1500",
	valortotalnota: "10.00",
	cnpjcpf: "12345678901",
	descontosubtotal: "0.00",
	outrasdespesas: "0.00",
	codigostatusprotocolonfe: 539,
	mensagemtransmissaonfe: `Rejeicao: Duplicidade de NF-e com diferenca na Chave de Acesso [chNFe:${CHAVE_SEFAZ}]`,
	arquivoxmlautorizada: null,
	arquivoxmlassinado: "<NFe/>",
	dadosimportacao: {
		origem: "pdv-gourmet",
		pagamento: { formas: [{ tPag: "01", vPag: 10 }] },
	},
};

describe("conciliarNfceDocumento", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(credenciaisNfce.montarCredenciaisGatewayNfce).mockResolvedValue({
			ok: true,
			configJson: { modelo: 65 },
			pfxBase64: "pfx",
			senha: "senha",
		});
		vi.mocked(notaRepository.atualizarNotaFiscal).mockResolvedValue(
			{} as never,
		);
		vi.mocked(notaRepository.listarItensPorNotaFiscal).mockResolvedValue([
			{ quantidade: "1" },
		] as never);
		vi.mocked(notaRepository.buscarNotaFiscalPorChaveNfe).mockResolvedValue(
			undefined as never,
		);
		vi.mocked(arquivarXml.arquivarXmlNotaFiscal).mockResolvedValue({} as never);
		vi.mocked(auditoria.criarAuditoriaService).mockResolvedValue({} as never);
	});

	it("recupera a NFC-e autorizada informada na rejeição 539", async () => {
		vi.mocked(gateway.consultarSituacaoChaveSefazGateway).mockResolvedValue({
			sucesso: true,
			cStat: "100",
			xMotivo: "Autorizado o uso da NF-e",
			xml: xml("10.00", CHAVE_SEFAZ),
			protNFe: { infProt: { nProt: "135240000000001", cStat: "100" } },
		});

		const resultado = await conciliarNfceDocumento({
			nota: notaBase as never,
			idusuario: "u1",
			motivoTentativa: "teste",
		});

		expect(resultado.prosseguirTransmissao).toBe(false);
		expect(resultado.resultado.emitida).toBe(true);
		expect(resultado.resultado.situacao).toBe("recuperada");
		expect(resultado.resultado.chave).toBe(CHAVE_SEFAZ);
		expect(notaRepository.atualizarNotaFiscal).toHaveBeenCalledWith(
			"nfce-1",
			expect.objectContaining({
				status: NFE_STATUS.AUTORIZADA,
				chavenfe: CHAVE_SEFAZ,
				protocolonfe: "135240000000001",
			}),
		);
	});

	it("não altera a nota quando o documento da SEFAZ é outro", async () => {
		vi.mocked(gateway.consultarSituacaoChaveSefazGateway).mockResolvedValue({
			sucesso: true,
			cStat: "100",
			xMotivo: "Autorizado o uso da NF-e",
			xml: xml("80.00", CHAVE_SEFAZ),
			protNFe: { infProt: { nProt: "135240000000009", cStat: "100" } },
		});

		const resultado = await conciliarNfceDocumento({
			nota: notaBase as never,
			idusuario: "u1",
			motivoTentativa: "teste",
		});

		expect(resultado.resultado.emitida).toBe(false);
		expect(resultado.resultado.situacao).toBe("conflito");
		expect(resultado.prosseguirTransmissao).toBe(false);
		const atualizacoes = vi.mocked(notaRepository.atualizarNotaFiscal).mock
			.calls;
		const conflito = atualizacoes.find(
			(chamada) =>
				(chamada[1] as { status?: number }).status === NFE_STATUS.CONFLITO,
		);
		expect(conflito?.[1]).not.toMatchObject({ chavenfe: CHAVE_SEFAZ });
	});

	it("não consulta de novo quando a NFC-e já está autorizada", async () => {
		const resultado = await conciliarNfceDocumento({
			nota: {
				...notaBase,
				status: NFE_STATUS.AUTORIZADA,
				chavenfe: CHAVE_SEFAZ,
				protocolonfe: "135240000000001",
				dadosimportacao: { conciliacao: { recuperada: true } },
			} as never,
			motivoTentativa: "repeticao",
		});

		expect(resultado.resultado.situacao).toBe("recuperada");
		expect(gateway.consultarSituacaoChaveSefazGateway).not.toHaveBeenCalled();
		expect(resultado.prosseguirTransmissao).toBe(false);
	});
});
