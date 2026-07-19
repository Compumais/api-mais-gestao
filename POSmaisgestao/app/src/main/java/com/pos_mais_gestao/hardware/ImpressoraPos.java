package com.pos_mais_gestao.hardware;

public interface ImpressoraPos {
    boolean estaDisponivel();

    /** Comprovante texto simples (DAV / offline). */
    void imprimirTexto(String texto) throws Exception;

    /** DANFC-e térmico: texto + QR ESC/POS. */
    void imprimirDanfce(String texto, String qrConteudo) throws Exception;
}
