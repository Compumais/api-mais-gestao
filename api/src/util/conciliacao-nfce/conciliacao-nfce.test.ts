import { describe, expect, it } from "vitest";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { classificarResultadoTransmissaoNfce } from "./classificar-resultado-transmissao-nfce.js";
import { compararDocumentoNfce } from "./comparar-documento-nfce.js";
import { extrairChaveDuplicidadeNfce } from "./extrair-chave-duplicidade-nfce.js";
import { extrairResumoXmlNfce } from "./extrair-resumo-xml-nfce.js";
import { montarChaveAcessoNfce } from "./identidade-emissao-nfce.js";
import { mensagemNfceConcorrencia } from "./mensagens-conciliacao-nfce.js";
import {
	decidirProximaAcaoEmissaoNfce,
	deveReservarNovaNumeracao,
	resolverAcaoConciliacaoNfce,
} from "./regras-conciliacao-nfce.js";
import type { ResumoDocumentoNfce } from "./tipos-conciliacao-nfce.js";

const CHAVE_LOCAL = montarChaveAcessoNfce({
	cUF: 31,
	anoMes: "2609",
	cnpj: "12345678000195",
	serie: 1,
	numero: 1500,
	tpEmis: 1,
	cNF: "12345678",
});

const CHAVE_SEFAZ = montarChaveAcessoNfce({
	cUF: 31,
	anoMes: "2609",
	cnpj: "12345678000195",
	serie: 1,
	numero: 1500,
	tpEmis: 1,
	cNF: "87654321",
});

function resumo(parcial: Partial<ResumoDocumentoNfce>): ResumoDocumentoNfce {
	return {
		cnpjEmitente: "12345678000195",
		modelo: "65",
		serie: "1",
		numero: "1500",
		tpEmis: "1",
		chave: CHAVE_LOCAL,
		documentoDestinatario: "12345678901",
		valorTotal: 10,
		quantidadeItens: 1,
		quantidadeTotal: 1,
		desconto: 0,
		acrescimo: 0,
		pagamentos: [{ tPag: "01", vPag: 10 }],
		...parcial,
	};
}

function xmlNfce(params: {
	chave: string;
	valor: string;
	tpEmis?: string;
	numero?: string;
	cpf?: string;
}): string {
	return `<?xml version="1.0"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe${params.chave}">
      <ide><mod>65</mod><serie>1</serie><nNF>${params.numero ?? "1500"}</nNF><tpEmis>${params.tpEmis ?? "1"}</tpEmis></ide>
      <emit><CNPJ>12345678000195</CNPJ></emit>
      <dest><CPF>${params.cpf ?? "12345678901"}</CPF></dest>
      <det><prod><qCom>1.0000</qCom></prod></det>
      <total><ICMSTot><vNF>${params.valor}</vNF><vDesc>0.00</vDesc><vOutro>0.00</vOutro></ICMSTot></total>
      <pag><detPag><tPag>01</tPag><vPag>${params.valor}</vPag></detPag></pag>
    </infNFe>
  </NFe>
</nfeProc>`;
}

describe("conciliação NFC-e", () => {
	it("cenário 1: autorização normal permanece autorizada", () => {
		expect(
			classificarResultadoTransmissaoNfce({ cStat: "100", sucesso: true }),
		).toBe("autorizada");
		expect(
			decidirProximaAcaoEmissaoNfce({ status: NFE_STATUS.AUTORIZADA }),
		).toBe("retornar_autorizada");
	});

	it("cenário 2: rejeição fiscal comum não gera outra numeração", () => {
		expect(
			classificarResultadoTransmissaoNfce({
				cStat: "591",
				xMotivo: "Informar a tributação do ICMS",
				sucesso: false,
			}),
		).toBe("rejeitada");
		const acao = decidirProximaAcaoEmissaoNfce({
			status: NFE_STATUS.REJEITADA,
			codigostatusprotocolonfe: 591,
		});
		expect(acao).toBe("transmitir_mesma_identidade");
		expect(deveReservarNovaNumeracao(acao)).toBe(false);
	});

	it("cenário 3: retorno perdido não é tratado como rejeição", () => {
		expect(
			classificarResultadoTransmissaoNfce({
				sucesso: false,
				erro: "Tempo esgotado ao aguardar resposta do gateway NF-e.",
			}),
		).toBe("desconhecida");
		expect(
			decidirProximaAcaoEmissaoNfce({ status: NFE_STATUS.PENDENTE_CONSULTA }),
		).toBe("conciliar");
	});

	it("cenário 4: 539 com documento equivalente recupera e não reenvia", () => {
		const motivo = `Rejeicao: Duplicidade de NF-e com diferenca na Chave de Acesso [chNFe:${CHAVE_SEFAZ}]`;
		expect(extrairChaveDuplicidadeNfce(motivo)).toBe(CHAVE_SEFAZ);
		const local = resumo({});
		const sefaz = extrairResumoXmlNfce(
			xmlNfce({ chave: CHAVE_SEFAZ ?? "", valor: "10.00" }),
		);
		if (!sefaz) {
			throw new Error("XML de teste inválido");
		}
		const comparacao = compararDocumentoNfce(local, {
			...sefaz,
			chave: CHAVE_SEFAZ,
		});
		const decisao = resolverAcaoConciliacaoNfce({
			classeConsulta: "autorizada",
			chaveConsultadaEhALocal: false,
			comparacao,
		});
		expect(decisao.acao).toBe("AUTO_RECUPERAR");
		expect(decisao.prosseguirTransmissao).toBe(false);
		expect(
			decidirProximaAcaoEmissaoNfce({
				status: NFE_STATUS.REJEITADA,
				codigostatusprotocolonfe: 539,
			}),
		).toBe("conciliar");
	});

	it("cenário 5: 539 com valor divergente bloqueia", () => {
		const sefaz = extrairResumoXmlNfce(
			xmlNfce({ chave: CHAVE_SEFAZ ?? "", valor: "80.00" }),
		);
		if (!sefaz) {
			throw new Error("XML de teste inválido");
		}
		const comparacao = compararDocumentoNfce(resumo({}), sefaz);
		const decisao = resolverAcaoConciliacaoNfce({
			classeConsulta: "autorizada",
			chaveConsultadaEhALocal: false,
			comparacao,
		});
		expect(comparacao.equivalente).toBe(false);
		expect(decisao.acao).toBe("EXIGIR_INTERVENCAO");
		expect(decisao.prosseguirTransmissao).toBe(false);
	});

	it("cenário 6: timeout seguido de autorização da própria chave recupera", () => {
		expect(
			classificarResultadoTransmissaoNfce({
				erro: "socket hang up",
				sucesso: false,
			}),
		).toBe("desconhecida");
		const decisao = resolverAcaoConciliacaoNfce({
			classeConsulta: "autorizada",
			chaveConsultadaEhALocal: true,
			comparacao: compararDocumentoNfce(resumo({}), resumo({})),
		});
		expect(decisao.acao).toBe("AUTO_RECUPERAR");
		expect(decisao.prosseguirTransmissao).toBe(false);
	});

	it("cenário 7: timeout e documento não encontrado reenvia a mesma chave", () => {
		const decisao = resolverAcaoConciliacaoNfce({
			classeConsulta: "nao_encontrada",
			chaveConsultadaEhALocal: true,
			comparacao: null,
		});
		expect(decisao.regra).toBe("consulta_217_reenviar_mesma_chave");
		expect(decisao.prosseguirTransmissao).toBe(true);
		expect(deveReservarNovaNumeracao("transmitir_mesma_identidade")).toBe(
			false,
		);
	});

	it("cenário 8: concorrência não descreve uma nova NFC-e", () => {
		const mensagem = mensagemNfceConcorrencia();
		expect(mensagem).toContain("em andamento");
		expect(mensagem).not.toMatch(/nova NFC-e/i);
	});

	it("cenário 9 e 11: autorização já existente não transmite de novo", () => {
		expect(
			decidirProximaAcaoEmissaoNfce({ status: NFE_STATUS.AUTORIZADA }),
		).toBe("retornar_autorizada");
		expect(
			decidirProximaAcaoEmissaoNfce({ status: NFE_STATUS.AUTORIZADA }),
		).toBe("retornar_autorizada");
	});

	it("cenário 10: a mesma decisão se repete sem novo envio", () => {
		const entrada = {
			classeConsulta: "autorizada" as const,
			chaveConsultadaEhALocal: false,
			comparacao: compararDocumentoNfce(
				resumo({}),
				resumo({ chave: CHAVE_SEFAZ }),
			),
		};
		const primeira = resolverAcaoConciliacaoNfce(entrada);
		const segunda = resolverAcaoConciliacaoNfce(entrada);
		const terceira = resolverAcaoConciliacaoNfce(entrada);
		expect(segunda).toEqual(primeira);
		expect(terceira.prosseguirTransmissao).toBe(false);
	});

	it("cenário 12: tpEmis diferente com o mesmo valor é a mesma operação", () => {
		const sefaz = extrairResumoXmlNfce(
			xmlNfce({ chave: CHAVE_SEFAZ ?? "", valor: "10.00", tpEmis: "9" }),
		);
		if (!sefaz) {
			throw new Error("XML de teste inválido");
		}
		const comparacao = compararDocumentoNfce(resumo({ tpEmis: "1" }), sefaz);
		expect(comparacao.equivalente).toBe(true);
		expect(comparacao.avisos.join(" ")).toMatch(/Tipo de emissão/);
		const divergente = compararDocumentoNfce(
			resumo({ tpEmis: "1", valorTotal: 10 }),
			{ ...sefaz, valorTotal: 50, tpEmis: "9" },
		);
		expect(divergente.equivalente).toBe(false);
	});

	it("cenário 13: número de outro documento é conflito", () => {
		const sefaz = extrairResumoXmlNfce(
			xmlNfce({ chave: CHAVE_SEFAZ ?? "", valor: "10.00", numero: "1501" }),
		);
		if (!sefaz) {
			throw new Error("XML de teste inválido");
		}
		const comparacao = compararDocumentoNfce(resumo({ numero: "1500" }), sefaz);
		expect(
			comparacao.divergencias.some((item) => item.campo === "número"),
		).toBe(true);
		expect(
			resolverAcaoConciliacaoNfce({
				classeConsulta: "autorizada",
				chaveConsultadaEhALocal: false,
				comparacao,
			}).acao,
		).toBe("EXIGIR_INTERVENCAO");
	});

	it("cenário 14: transmissão interrompida fica pendente de consulta", () => {
		expect(
			decidirProximaAcaoEmissaoNfce({ status: NFE_STATUS.TRANSMITINDO }),
		).toBe("conciliar");
		expect(deveReservarNovaNumeracao("conciliar")).toBe(false);
	});

	it("cenário 15: falha depois da autorização não libera novo número", () => {
		expect(
			decidirProximaAcaoEmissaoNfce({
				status: NFE_STATUS.TRANSMITINDO,
				codigostatusprotocolonfe: null,
			}),
		).toBe("conciliar");
		expect(
			resolverAcaoConciliacaoNfce({
				classeConsulta: "autorizada",
				chaveConsultadaEhALocal: true,
				comparacao: null,
			}),
		).toMatchObject({
			acao: "AUTO_RECUPERAR",
			prosseguirTransmissao: false,
		});
	});

	it("539 sem chave alternativa não reenvia", () => {
		expect(
			resolverAcaoConciliacaoNfce({
				classeConsulta: "nao_encontrada",
				chaveConsultadaEhALocal: false,
				comparacao: null,
			}).prosseguirTransmissao,
		).toBe(false);
	});
});
