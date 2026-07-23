package com.pos_mais_gestao.data.api;

public class VendaResultadoDto {
    public String idVenda;
    public String codigo;
    /** NFC-e autorizada pela SEFAZ. */
    public boolean nfceEmitida;
    /** API indicou que deveria emitir NFC-e nesta baixa. */
    public boolean deveEmitirNfce;
    /**
     * Sucesso operacional+fiscal: não precisava emitir, ou emitiu com sucesso.
     * Se false, a venda pode ter sido registrada mas a NFC-e falhou/rejeitou.
     */
    public boolean sucessoFiscalCompleto = true;
    /** Venda rápida em modo pedido (DAV), sem tentativa de NFC-e. */
    public boolean pedidoDav;
    public String mensagemNfce;
    public String chaveNfce;
    public String idNotaFiscal;
    public String protocolo;
    public String qrCode;
    public String urlChave;
    public String cStat;
    /** Texto ESC/POS (DAV/offline) ou corpo textual do DANFC-e (sem bytes do QR). */
    public String comprovanteTexto;
    /** Conteúdo do QR fiscal (qrCode ou urlChave). Só preencher se cupomFiscal. */
    public String qrParaImpressao;
    /** true = imprimir DANFC-e térmico (texto + QR). */
    public boolean cupomFiscal;
}
