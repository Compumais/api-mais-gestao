package com.pos_mais_gestao.hardware;

public interface ImpressoraPos {
    boolean estaDisponivel();

    void imprimirTexto(String texto) throws Exception;
}
