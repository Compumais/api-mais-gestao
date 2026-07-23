package com.pos_mais_gestao.hardware;

import com.pos_mais_gestao.domain.MeioPagamento;
import java.math.BigDecimal;

/**
 * Contrato para TEF/PIX nativo do fabricante.
 * Implementações reais (Stone, PagSeguro, Sunmi, etc.) devem ser plugadas aqui.
 */
public interface PagamentoHardware {
    boolean estaDisponivel();

    ResultadoPagamentoHardware pagar(MeioPagamento meio, BigDecimal valor) throws Exception;

    class ResultadoPagamentoHardware {
        public final boolean aprovado;
        public final String nsu;
        public final String autorizacao;
        public final String mensagem;

        public ResultadoPagamentoHardware(boolean aprovado, String nsu, String autorizacao, String mensagem) {
            this.aprovado = aprovado;
            this.nsu = nsu;
            this.autorizacao = autorizacao;
            this.mensagem = mensagem;
        }
    }
}
