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

    /** Abre a identificação quando nome, telefone ou palavra-chave estiver ligado. */
    public static boolean devePedirIdentificacao(
            boolean pedirNome,
            boolean pedirTelefone,
            boolean palavraChave,
            boolean contaJaAberta) {
        return !contaJaAberta && (pedirNome || pedirTelefone || palavraChave);
    }

    public static boolean deveExigirNome(boolean pedirNome, boolean exigirNome) {
        return pedirNome && exigirNome;
    }

    public static boolean deveExigirTelefone(boolean pedirTelefone, boolean palavraChave) {
        return pedirTelefone || palavraChave;
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
