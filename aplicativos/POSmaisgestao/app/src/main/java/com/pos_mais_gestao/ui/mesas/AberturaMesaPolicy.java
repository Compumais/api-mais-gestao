package com.pos_mais_gestao.ui.mesas;

import com.pos_mais_gestao.util.TelefoneBrasil;

public final class AberturaMesaPolicy {
    public enum ErroIdentificacao {
        OK,
        NOME_OBRIGATORIO,
        TELEFONE_OBRIGATORIO,
        TELEFONE_INVALIDO
    }

    private AberturaMesaPolicy() {}

    public static boolean devePedirNome(boolean flagHabilitada, boolean contaJaAberta) {
        return flagHabilitada && !contaJaAberta;
    }

    /**
     * Valida nome/telefone conforme flags do PDV.
     * Campo opcional vazio é aceito; telefone preenchido (mesmo opcional) precisa ser válido.
     */
    public static ErroIdentificacao validarIdentificacao(
            String nome,
            String telefone,
            boolean exigirNome,
            boolean exigirTelefone) {
        String nomeOk = TelefoneBrasil.nomeInformado(nome);
        String telOk = telefone == null ? "" : telefone.trim();
        if (exigirNome && nomeOk.isEmpty()) {
            return ErroIdentificacao.NOME_OBRIGATORIO;
        }
        if (exigirTelefone && telOk.isEmpty()) {
            return ErroIdentificacao.TELEFONE_OBRIGATORIO;
        }
        if (!telOk.isEmpty() && !TelefoneBrasil.valido(telOk)) {
            return ErroIdentificacao.TELEFONE_INVALIDO;
        }
        return ErroIdentificacao.OK;
    }
}
