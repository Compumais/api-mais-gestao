package com.pos_mais_gestao.util;

import com.pos_mais_gestao.domain.Produto;
import java.math.BigDecimal;
import java.math.RoundingMode;

/** Leitura de etiqueta EAN-13 impressa por balança (PLU + peso ou preço). */
public final class EtiquetaBalanca {
    private static final String ID_UNIDADE_KG = "a0000001-0000-4000-8000-000000000002";

    private EtiquetaBalanca() {}

    public static final class Config {
        public final boolean habilitada;
        public final String prefixo;
        public final int digitosCodigo;
        public final boolean conteudoPeso;
        public final boolean centavos;
        public final boolean indicadorUso;

        public Config(
                boolean habilitada,
                String prefixo,
                int digitosCodigo,
                boolean conteudoPeso,
                boolean centavos,
                boolean indicadorUso) {
            String digitos = prefixo == null ? "" : prefixo.replaceAll("\\D", "");
            this.habilitada = habilitada;
            this.prefixo = digitos.isEmpty() ? "2" : digitos.substring(0, 1);
            this.digitosCodigo = digitosCodigo == 5 || digitosCodigo == 6 ? digitosCodigo : 4;
            this.conteudoPeso = conteudoPeso;
            this.centavos = centavos;
            this.indicadorUso = indicadorUso;
        }

        public static Config desligada() {
            return new Config(false, "2", 4, false, true, false);
        }
    }

    public static final class Parseada {
        public final int codigo;
        public final BigDecimal valor;

        public Parseada(int codigo, BigDecimal valor) {
            this.codigo = codigo;
            this.valor = valor;
        }
    }

    public static final class Lancamento {
        public final BigDecimal quantidade;
        public final BigDecimal precoUnitario;

        public Lancamento(BigDecimal quantidade, BigDecimal precoUnitario) {
            this.quantidade = quantidade;
            this.precoUnitario = precoUnitario;
        }
    }

    public static Parseada parsear(String lido, Config config) {
        if (config == null || !config.habilitada || lido == null) {
            return null;
        }
        String digitos = lido.replaceAll("\\D", "");
        if (digitos.length() != 12 && digitos.length() != 13) {
            return null;
        }
        if (!digitos.startsWith(config.prefixo)) {
            return null;
        }
        if (digitos.length() == 13 && !ean13Valido(digitos)) {
            return null;
        }
        String payload = digitos.substring(0, 12);
        int extra = tamanhoExtra(config);
        int inicioCodigo = config.prefixo.length();
        int fimCodigo = inicioCodigo + config.digitosCodigo;
        int fimExtra = fimCodigo + extra;
        if (fimExtra >= 12 || fimCodigo > payload.length()) {
            return null;
        }
        int codigo;
        try {
            codigo = Integer.parseInt(payload.substring(inicioCodigo, fimCodigo));
        } catch (NumberFormatException e) {
            return null;
        }
        if (codigo < 1) {
            return null;
        }
        String campoValor = payload.substring(fimExtra);
        BigDecimal valorBruto;
        try {
            valorBruto = new BigDecimal(campoValor);
        } catch (NumberFormatException e) {
            return null;
        }
        if (valorBruto.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        BigDecimal valor = valorBruto;
        if (!config.conteudoPeso && config.centavos) {
            valor = valorBruto.movePointLeft(2);
        } else if (config.conteudoPeso) {
            valor = valorBruto.movePointLeft(3);
        }
        return new Parseada(codigo, valor.setScale(3, RoundingMode.HALF_UP));
    }

    public static Lancamento montar(Produto produto, Parseada parse, Config config) {
        BigDecimal precoCadastro = produto.getPreco() == null ? BigDecimal.ZERO : produto.getPreco();
        if (config.conteudoPeso) {
            BigDecimal quantidade = parse.valor;
            return new Lancamento(quantidade, precoCadastro);
        }
        BigDecimal totalEtiqueta = parse.valor.setScale(2, RoundingMode.HALF_UP);
        if (pareceKg(produto) && precoCadastro.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal quantidade = totalEtiqueta
                    .divide(precoCadastro, 3, RoundingMode.HALF_UP);
            return new Lancamento(quantidade, precoCadastro);
        }
        return new Lancamento(BigDecimal.ONE, totalEtiqueta);
    }

    public static boolean ean13Valido(String codigo) {
        String digitos = codigo == null ? "" : codigo.replaceAll("\\D", "");
        if (digitos.length() != 13) {
            return false;
        }
        return dvEan13(digitos.substring(0, 12)).equals(digitos.substring(12));
    }

    public static String dvEan13(String dozeDigitos) {
        int soma = 0;
        for (int i = 0; i < 12; i++) {
            int n = dozeDigitos.charAt(i) - '0';
            soma += i % 2 == 0 ? n : n * 3;
        }
        return String.valueOf((10 - (soma % 10)) % 10);
    }

    private static int tamanhoExtra(Config config) {
        if (config.indicadorUso) {
            return 1;
        }
        if (config.digitosCodigo == 4) {
            return 1;
        }
        return 0;
    }

    private static boolean pareceKg(Produto produto) {
        String id = produto.getIdUnidadeMedida() == null
                ? ""
                : produto.getIdUnidadeMedida().trim().toLowerCase();
        if (ID_UNIDADE_KG.equals(id)) {
            return true;
        }
        return ProdutoQuantidade.unidadeQuilograma(produto.getUnidadeMedida());
    }
}
