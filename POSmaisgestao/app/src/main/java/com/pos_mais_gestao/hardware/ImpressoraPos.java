package com.pos_mais_gestao.hardware;

import com.pos_mais_gestao.domain.ItemFicha;
import java.util.List;

public interface ImpressoraPos {
    boolean estaDisponivel();

    /** Comprovante texto simples (DAV / offline). */
    void imprimirTexto(String texto) throws Exception;

    /** DANFC-e térmico: texto + QR ESC/POS. */
    void imprimirDanfce(String texto, String qrConteudo) throws Exception;

    /** Fichas de evento: uma via por unidade, com corte entre cada. */
    void imprimirFichasEvento(String empresaNome, String codigoVenda, List<ItemFicha> itens)
            throws Exception;
}
