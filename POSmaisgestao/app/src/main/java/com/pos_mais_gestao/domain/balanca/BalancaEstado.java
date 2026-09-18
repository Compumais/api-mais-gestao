package com.pos_mais_gestao.domain.balanca;

public enum BalancaEstado {
    DESABILITADA,
    DESCONECTADA,
    CONECTANDO,
    CONECTADA,
    LENDO,
    ESTAVEL,
    INSTAVEL,
    PESO_NEGATIVO,
    SOBRECARGA,
    ERRO
}
