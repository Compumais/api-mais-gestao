package com.pos_mais_gestao.hardware;

public class ImpressoraInfo {
    public static final String TIPO_NENHUMA = "nenhuma";
    public static final String TIPO_BLUETOOTH = "bluetooth";
    public static final String TIPO_USB = "usb";

    public final String id;
    public final String nome;
    public final String tipo;

    public ImpressoraInfo(String id, String nome, String tipo) {
        this.id = id;
        this.nome = nome;
        this.tipo = tipo;
    }
}
