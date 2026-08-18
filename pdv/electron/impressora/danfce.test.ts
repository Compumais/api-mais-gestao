import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { montarHtmlDanfce } from "./danfce-html";
import {
	formatarChaveDanfce,
	formatarCnpjDanfce,
	formatarProtocoloDanfce,
	juntarDadosDanfce,
	MARCADOR_QR_DANFCE,
	montarTextoDanfce,
} from "./danfce-layout";
import { parseXmlDanfce, rotuloFormaPagamentoNfce } from "./danfce-xml";
import { svgQrCode } from "./qr-svg";

const XML_DANFCE = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe31260810579611000190650100000001021349497532" versao="4.00">
      <ide>
        <serie>10</serie>
        <nNF>102</nNF>
        <dhEmi>2026-08-18T14:18:54-03:00</dhEmi>
        <tpAmb>2</tpAmb>
        <tpEmis>1</tpEmis>
      </ide>
      <emit>
        <CNPJ>10579611000190</CNPJ>
        <xNome>COMPUMAIS</xNome>
        <IE>0011058410008</IE>
        <CRT>1</CRT>
        <enderEmit>
          <xLgr>AVENIDA CORONEL JOSE AFONSO DE ALMEIDA</xLgr>
          <nro>143</nro>
          <xBairro>CENTRO</xBairro>
          <xMun>SACRAMENTO</xMun>
          <UF>MG</UF>
          <fone>3433511861</fone>
        </enderEmit>
      </emit>
      <dest>
        <CNPJ>99999999000191</CNPJ>
        <xNome>NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</xNome>
        <enderDest>
          <xLgr>RUA TESTE</xLgr>
          <nro>100</nro>
          <xBairro>CENTRO</xBairro>
          <xMun>MUNICIPIO</xMun>
          <UF>MG</UF>
        </enderDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>000001</cProd>
          <xProd>NOTA FISCAL EMITIDA EM AMBIENTE DE HOM</xProd>
          <uCom>UN</uCom>
          <qCom>1.0000</qCom>
          <vUnCom>20.00</vUnCom>
          <vProd>20.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vProd>20.00</vProd>
          <vDesc>0.00</vDesc>
          <vFrete>0.00</vFrete>
          <vNF>20.00</vNF>
        </ICMSTot>
      </total>
      <pag>
        <detPag>
          <tPag>03</tPag>
          <vPag>20.00</vPag>
        </detPag>
        <vTroco>0.00</vTroco>
      </pag>
      <infAdic>
        <infCpl>DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE ICMS.</infCpl>
      </infAdic>
      <infNFeSupl>
        <qrCode>https://hportalsped.fazenda.mg.gov.br/portalnfce?p=31260810579611000190650100000001021349497532|2|2|1|A1</qrCode>
        <urlChave>https://hportalsped.fazenda.mg.gov.br/portalnfce</urlChave>
      </infNFeSupl>
    </infNFe>
  </NFe>
  <protNFe>
    <infProt>
      <nProt>131260000777040</nProt>
      <dhRecbto>2026-08-18T14:17:14-03:00</dhRecbto>
    </infProt>
  </protNFe>
</nfeProc>`;

describe("DANFE NFC-e", () => {
	it("parseia XML autorizado no layout do cupom térmico", () => {
		const dados = parseXmlDanfce(XML_DANFCE);
		assert.equal(dados.emitente?.nome, "COMPUMAIS");
		assert.equal(dados.emitente?.cnpj, "10579611000190");
		assert.equal(dados.homologacao, true);
		assert.equal(dados.contingencia, false);
		assert.equal(dados.itens?.[0]?.codigo, "000001");
		assert.equal(dados.valorPagar, 20);
		assert.equal(dados.pagamentos?.[0]?.tipo, "CARTÃO DE CRÉDITO");
		assert.equal(dados.numero, 102);
		assert.equal(dados.serie, 10);
		assert.equal(dados.protocolo, "131260000777040");
		assert.match(dados.urlChave ?? "", /portalnfce/);
		assert.equal(dados.consumidor?.tipo, "cnpj");
	});

	it("imprime cabeçalho, itens, pagamento, chave, protocolo e QR", () => {
		const dados = juntarDadosDanfce(parseXmlDanfce(XML_DANFCE), {});
		const texto = montarTextoDanfce(dados);
		assert.match(texto, /COMPUMAIS/);
		assert.match(texto, /CNPJ: 10\.579\.611\/0001-90/);
		assert.match(texto, /IE: 0011058410008/);
		assert.match(texto, /SACRAMENTO-MG/);
		assert.match(texto, /Fone: \(34\) 3351-1861/);
		assert.match(texto, /Documento Auxiliar da Nota Fiscal de Consumidor/);
		assert.match(texto, /Eletronica/);
		assert.match(texto, /Não permite aproveitamento de crédito de ICMS/);
		assert.match(texto, /SEM VALOR FISCAL/);
		assert.match(texto, /Codigo Descricao/);
		assert.match(texto, /000001/);
		assert.match(texto, /Valor a Pagar R\$/);
		assert.match(texto, /FORMA PAGAMENTO/);
		assert.match(texto, /CARTÃO DE CRÉDITO/);
		assert.match(texto, /Consulte pela Chave de Acesso em:/);
		assert.match(texto, /hportalsped\.fazenda\.mg\.gov\.br\/portalnfce/);
		assert.match(texto, /3126 0810 5796 1100 0190 6501/);
		assert.match(texto, /4949 7532/);
		assert.match(texto, /CONSUMIDOR - CNPJ 99\.999\.999\/0001-91/);
		assert.match(texto, /NFCe n\. 000000102 Série 010/);
		assert.match(texto, /Protocolo de Autorização: 131 2600007770 40/);
		assert.match(texto, /Data de Autorização: 18\/08\/2026 14:17:14/);
		assert.match(texto, /Lei Federal/);
		assert.match(texto, /12\.741\/2012/);
		assert.match(texto, /SIMPLES NACIONAL/);
		assert.ok(texto.includes(MARCADOR_QR_DANFCE));
	});

	it("formata chave, CNPJ e protocolo como no DANFE", () => {
		assert.equal(
			formatarChaveDanfce("31260810579611000190650100000001021349497532"),
			"3126 0810 5796 1100 0190 6501 0000 0001 0213 4949 7532",
		);
		assert.equal(formatarCnpjDanfce("10579611000190"), "10.579.611/0001-90");
		assert.equal(
			formatarProtocoloDanfce("131260000777040"),
			"131 2600007770 40",
		);
	});

	it("mapeia tPag 03 para CARTÃO DE CRÉDITO", () => {
		assert.equal(rotuloFormaPagamentoNfce("03"), "CARTÃO DE CRÉDITO");
		assert.equal(
			rotuloFormaPagamentoNfce(17),
			"PAGAMENTO INSTANTÂNEO (PIX) - DINÂMICO",
		);
	});

	it("usa fallback da venda quando o XML de contingência é incompleto", () => {
		const xml =
			parseXmlDanfce(`<NFe><infNFe Id="NFe31260810579611000190650100000001021349497532">
      <ide><tpEmis>9</tpEmis><tpAmb>2</tpAmb><nNF>102</nNF><serie>10</serie></ide>
      <emit><CNPJ>10579611000190</CNPJ></emit>
    </infNFe></NFe>`);
		const dados = juntarDadosDanfce(xml, {
			emitente: {
				nome: "COMPUMAIS",
				cnpj: "10579611000190",
				ie: "0011058410008",
				logradouro: "AVENIDA TESTE",
				numero: "143",
				bairro: "CENTRO",
				municipio: "SACRAMENTO",
				uf: "MG",
			},
			itens: [
				{
					codigo: "1",
					descricao: "Produto",
					quantidade: 1,
					unidade: "UN",
					unitario: 20,
					total: 20,
				},
			],
			valorProdutos: 20,
			valorPagar: 20,
			pagamentos: [{ tipo: "DINHEIRO", valor: 20 }],
			protocolo: undefined,
			pendenteAutorizacao: true,
		});
		const texto = montarTextoDanfce(dados);
		assert.match(texto, /EMITIDA EM CONTINGÊNCIA/);
		assert.match(texto, /Pendente de autorização/);
		assert.match(texto, /COMPUMAIS/);
	});

	it("usa o portal de MG mesmo quando o QR antigo aponta para SP", () => {
		const xml = parseXmlDanfce(`<NFe>
      <infNFe Id="NFe31260810579611000190650100000001021349497532">
        <ide><tpEmis>9</tpEmis><tpAmb>2</tpAmb><nNF>102</nNF><serie>10</serie></ide>
        <emit><CNPJ>10579611000190</CNPJ></emit>
        <infNFeSupl>
          <qrCode>https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=31260810579611000190650100000001021349497532|2|2|20.00|1|ABCD</qrCode>
        </infNFeSupl>
      </infNFe>
    </NFe>`);
		const dados = juntarDadosDanfce(xml, {
			emitente: {
				nome: "COMPUMAIS",
				cnpj: "10579611000190",
				uf: "MG",
			},
			homologacao: true,
			qrcode:
				"https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=31260810579611000190650100000001021349497532|2|2|20.00|1|ABCD",
		});
		const texto = montarTextoDanfce(dados);
		assert.match(texto, /hportalsped\.fazenda\.mg\.gov\.br\/portalnfce/);
		assert.doesNotMatch(texto, /fazenda\.sp\.gov\.br/);
		assert.match(
			dados.qrcode ?? "",
			/hportalsped\.fazenda\.mg\.gov\.br\/portalnfce/,
		);
		assert.doesNotMatch(dados.qrcode ?? "", /fazenda\.sp\.gov\.br/);
		assert.match(
			dados.qrcode ?? "",
			/\?p=31260810579611000190650100000001021349497532/,
		);
	});

	it("gera HTML com QR e destaque do valor a pagar", () => {
		const dados = juntarDadosDanfce(parseXmlDanfce(XML_DANFCE), {});
		const html = montarHtmlDanfce(dados, "<svg></svg>");
		assert.match(html, /Valor a Pagar/);
		assert.match(html, /data:image\/svg\+xml/);
		assert.match(html, /CARTÃO DE CRÉDITO/);
	});

	it("gera SVG de QR Code a partir da URL da NFC-e", () => {
		const svg = svgQrCode(
			"https://hportalsped.fazenda.mg.gov.br/portalnfce?p=3126",
		);
		assert.match(svg, /<svg/);
		assert.match(svg, /viewBox/);
	});
});
