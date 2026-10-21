package com.pos_mais_gestao.hardware;

/** Destino ESC/POS em rede: host e porta TCP (padrão 9100, raw). */
public final class ImpressoraRedeEndereco {
    public static final int PORTA_PADRAO = 9100;

    public final String host;
    public final int porta;

    public ImpressoraRedeEndereco(String host, int porta) {
        this.host = host;
        this.porta = porta;
    }

    public static ImpressoraRedeEndereco montar(String host, String portaTexto) {
        if (!hostValido(host)) {
            return null;
        }
        String porta = portaTexto == null ? "" : portaTexto.trim();
        int valor = PORTA_PADRAO;
        if (!porta.isEmpty()) {
            try {
                valor = Integer.parseInt(porta);
            } catch (NumberFormatException error) {
                return null;
            }
        }
        if (valor < 1 || valor > 65535) {
            return null;
        }
        return new ImpressoraRedeEndereco(host.trim(), valor);
    }

    public static ImpressoraRedeEndereco parse(String id) {
        if (id == null) {
            return null;
        }
        String texto = id.trim();
        if (texto.isEmpty()) {
            return null;
        }
        int sep = texto.lastIndexOf(':');
        if (sep <= 0 || sep == texto.length() - 1) {
            return hostValido(texto) ? new ImpressoraRedeEndereco(texto, PORTA_PADRAO) : null;
        }
        return montar(texto.substring(0, sep), texto.substring(sep + 1));
    }

    public static boolean hostValido(String host) {
        if (host == null) {
            return false;
        }
        String valor = host.trim();
        if (valor.isEmpty() || valor.length() > 253) {
            return false;
        }
        return valor.indexOf(' ') < 0 && valor.indexOf('/') < 0;
    }

    public String formatar() {
        return host + ":" + porta;
    }

    public String nomeExibicao() {
        return host + ":" + porta + " (Rede)";
    }
}
