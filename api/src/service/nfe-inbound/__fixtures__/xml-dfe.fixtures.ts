export const XML_RES_NFE = `<?xml version="1.0" encoding="UTF-8"?>
<resNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <chNFe>35250612345678000190550010000000011000000010</chNFe>
  <CNPJ>12345678000190</CNPJ>
  <xNome>FORNECEDOR TESTE LTDA</xNome>
  <IE>123456789</IE>
  <dhEmi>2025-06-01T10:00:00-03:00</dhEmi>
  <tpNF>1</tpNF>
  <vNF>1500.00</vNF>
  <digVal>abc123</digVal>
  <dhRecbto>2025-06-01T10:05:00-03:00</dhRecbto>
  <nProt>135250000000001</nProt>
</resNFe>`;

export const XML_PROC_NFE = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35250612345678000190550010000000011000000010" versao="4.00">
      <ide>
        <nNF>1</nNF>
        <serie>1</serie>
        <dhEmi>2025-06-01T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000190</CNPJ>
        <xNome>FORNECEDOR TESTE LTDA</xNome>
      </emit>
      <total>
        <ICMSTot>
          <vNF>1500.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

export const XML_PROC_EVENTO = `<?xml version="1.0" encoding="UTF-8"?>
<procEventoNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <evento versao="1.00">
    <infEvento Id="ID2102103525061234567800019055001000000001100000001001">
      <chNFe>35250612345678000190550010000000011000000010</chNFe>
      <tpEvento>210210</tpEvento>
    </infEvento>
  </evento>
</procEventoNFe>`;

export const CHAVE_NFE = "35250612345678000190550010000000011000000010";
