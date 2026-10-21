package com.pos_mais_gestao.util;

import com.pos_mais_gestao.data.api.ContaMesaItemDto;
import com.pos_mais_gestao.domain.ItemCarrinho;
import com.pos_mais_gestao.domain.LancamentoPagamento;
import com.pos_mais_gestao.domain.MeioPagamento;
import com.pos_mais_gestao.domain.ResumoTurnoCaixa;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/** Texto de cupom térmico não fiscal, alinhado à largura da bobina (32 ou 48 colunas). */
public final class CupomTexto {
    public static final int COLUNAS_58 = 32;
    public static final int COLUNAS_80 = 48;

    private CupomTexto() {}

    public static final class Cabecalho {
        public final String empresa;
        public final String cnpj;
        public final String endereco;
        public final String telefone;
        public final String operador;
        public final int pdv;
        public final int colunas;
        public final Date momento;

        public Cabecalho(
                String empresa,
                String cnpj,
                String endereco,
                String telefone,
                String operador,
                int pdv,
                int colunas,
                Date momento) {
            this.empresa = empresa;
            this.cnpj = cnpj;
            this.endereco = endereco;
            this.telefone = telefone;
            this.operador = operador;
            this.pdv = pdv;
            this.colunas = colunas == COLUNAS_80 ? COLUNAS_80 : COLUNAS_58;
            this.momento = momento != null ? momento : new Date();
        }
    }

    public static final class LinhaItem {
        public final String nome;
        public final BigDecimal quantidade;
        public final BigDecimal precoUnitario;
        public final BigDecimal subtotal;

        public LinhaItem(String nome, BigDecimal quantidade, BigDecimal precoUnitario, BigDecimal subtotal) {
            this.nome = nome;
            this.quantidade = quantidade;
            this.precoUnitario = precoUnitario;
            this.subtotal = subtotal;
        }
    }

    public static final class LinhaPagamento {
        public final String rotulo;
        public final BigDecimal valor;

        public LinhaPagamento(String rotulo, BigDecimal valor) {
            this.rotulo = rotulo;
            this.valor = valor;
        }
    }

    public static String endereco(String logradouro, String numero, String complemento, String bairro, String cep) {
        StringBuilder linha = new StringBuilder();
        acrescentar(linha, logradouro, "");
        acrescentar(linha, numero, ", ");
        acrescentar(linha, complemento, " ");
        StringBuilder bloco = new StringBuilder();
        if (linha.length() > 0) {
            bloco.append(linha);
        }
        if (bairro != null && !bairro.trim().isEmpty()) {
            if (bloco.length() > 0) {
                bloco.append(" - ");
            }
            bloco.append(bairro.trim());
        }
        if (cep != null && !cep.trim().isEmpty()) {
            if (bloco.length() > 0) {
                bloco.append(" - ");
            }
            bloco.append("CEP ").append(cep.trim());
        }
        return bloco.toString();
    }

    public static List<LinhaItem> deCarrinho(List<ItemCarrinho> itens) {
        List<LinhaItem> linhas = new ArrayList<>();
        if (itens == null) {
            return linhas;
        }
        for (ItemCarrinho item : itens) {
            linhas.add(new LinhaItem(
                    item.getDescricaoExibicao(),
                    item.getQuantidade(),
                    item.getPrecoUnitario(),
                    item.getSubtotal()));
        }
        return linhas;
    }

    public static List<LinhaItem> deConta(List<ContaMesaItemDto> itens) {
        List<LinhaItem> linhas = new ArrayList<>();
        if (itens == null) {
            return linhas;
        }
        for (ContaMesaItemDto item : itens) {
            BigDecimal qtd = decimal(item.quantidade);
            BigDecimal preco = decimal(item.precounitario);
            if (qtd.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            linhas.add(new LinhaItem(
                    item.nomeproduto != null ? item.nomeproduto : "Item",
                    qtd,
                    preco,
                    preco.multiply(qtd)));
        }
        return linhas;
    }

    public static List<LinhaPagamento> deLancamentos(List<LancamentoPagamento> lancamentos) {
        List<LinhaPagamento> linhas = new ArrayList<>();
        if (lancamentos == null) {
            return linhas;
        }
        for (LancamentoPagamento item : lancamentos) {
            if (item == null || !item.isOk() || item.valor == null || item.valor.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            linhas.add(new LinhaPagamento(rotuloMeio(item.meio), item.valor));
        }
        return linhas;
    }

    public static String venda(
            Cabecalho cab,
            String titulo,
            String codigo,
            String referencia,
            String cliente,
            String dataDocumento,
            List<LinhaItem> itens,
            BigDecimal total,
            List<LinhaPagamento> pagamentos,
            BigDecimal troco,
            List<String> avisos) {
        StringBuilder sb = new StringBuilder();
        int cols = cab.colunas;
        cabecalhoEmpresa(sb, cab);
        separador(sb, cols);
        centralizar(sb, titulo != null ? titulo : "COMPROVANTE NAO FISCAL", cols);
        centralizar(sb, "NAO E DOCUMENTO FISCAL", cols);
        separador(sb, cols);
        linha(sb, cols, par(cols, "Data", dataDocumento != null && !dataDocumento.trim().isEmpty()
                ? dataDocumento.trim()
                : formatarData(cab.momento)));
        linha(sb, cols, par(cols, "PDV", String.valueOf(Math.max(1, cab.pdv))));
        if (tem(cab.operador)) {
            linha(sb, cols, par(cols, "Operador", cab.operador.trim()));
        }
        if (tem(codigo)) {
            linha(sb, cols, par(cols, "Codigo", codigo.trim()));
        }
        if (tem(referencia)) {
            linha(sb, cols, referencia.trim());
        }
        if (tem(cliente)) {
            linha(sb, cols, "Cliente: " + cliente.trim());
        }
        separador(sb, cols);
        if (itens != null) {
            for (LinhaItem item : itens) {
                escreverItem(sb, cols, item);
            }
        }
        separador(sb, cols);
        linha(sb, cols, par(cols, "TOTAL", MoneyFormat.format(total)));
        if (pagamentos != null) {
            for (LinhaPagamento pag : pagamentos) {
                linha(sb, cols, par(cols, pag.rotulo, MoneyFormat.format(pag.valor)));
            }
        }
        if (troco != null && troco.compareTo(BigDecimal.ZERO) > 0) {
            linha(sb, cols, par(cols, "Troco", MoneyFormat.format(troco)));
        }
        if (avisos != null) {
            boolean algum = false;
            for (String aviso : avisos) {
                if (tem(aviso)) {
                    if (!algum) {
                        separador(sb, cols);
                        algum = true;
                    }
                    linha(sb, cols, aviso.trim());
                }
            }
        }
        separador(sb, cols);
        centralizar(sb, "Obrigado pela preferencia", cols);
        return sb.toString();
    }

    public static String abertura(Cabecalho cab, BigDecimal suprimento, String identificacao) {
        StringBuilder sb = new StringBuilder();
        int cols = cab.colunas;
        cabecalhoEmpresa(sb, cab);
        separador(sb, cols);
        centralizar(sb, "ABERTURA DE CAIXA", cols);
        separador(sb, cols);
        linha(sb, cols, par(cols, "Data", formatarData(cab.momento)));
        linha(sb, cols, par(cols, "PDV", String.valueOf(Math.max(1, cab.pdv))));
        if (tem(cab.operador)) {
            linha(sb, cols, par(cols, "Operador", cab.operador.trim()));
        }
        if (tem(identificacao)) {
            linha(sb, cols, par(cols, "Caixa", identificacao.trim()));
        }
        separador(sb, cols);
        linha(sb, cols, par(cols, "Suprimento", MoneyFormat.format(suprimento)));
        separador(sb, cols);
        centralizar(sb, "Caixa aberto", cols);
        return sb.toString();
    }

    public static String fechamento(
            Cabecalho cab,
            ResumoTurnoCaixa resumo,
            BigDecimal saldoInformado,
            String observacao,
            String abertoEm) {
        StringBuilder sb = new StringBuilder();
        int cols = cab.colunas;
        cabecalhoEmpresa(sb, cab);
        separador(sb, cols);
        centralizar(sb, "FECHAMENTO DE CAIXA", cols);
        separador(sb, cols);
        linha(sb, cols, par(cols, "Fechado em", formatarData(cab.momento)));
        String aberturaFmt = dataAmigavel(abertoEm);
        if (tem(aberturaFmt)) {
            linha(sb, cols, par(cols, "Aberto em", aberturaFmt));
        }
        linha(sb, cols, par(cols, "PDV", String.valueOf(Math.max(1, cab.pdv))));
        if (tem(cab.operador)) {
            linha(sb, cols, par(cols, "Operador", cab.operador.trim()));
        }
        separador(sb, cols);
        if (resumo == null) {
            linha(sb, cols, "Resumo indisponivel");
            return sb.toString();
        }
        if (resumo.pagamentos == null) {
            resumo.pagamentos = com.pos_mais_gestao.domain.PagamentosResumo.vazio();
        }
        linha(sb, cols, par(cols, "Suprimento", MoneyFormat.format(resumo.suprimento)));
        linha(sb, cols, par(cols, "Vendas", String.valueOf(resumo.qtdVendas)));
        linha(sb, cols, par(cols, "Total vendido", MoneyFormat.format(resumo.totalVendas)));
        separador(sb, cols);
        centralizar(sb, "MEIOS DE PAGAMENTO", cols);
        linha(sb, cols, par(cols, "Dinheiro", MoneyFormat.format(resumo.pagamentos.dinheiro)));
        linha(sb, cols, par(cols, "Cartao", MoneyFormat.format(resumo.pagamentos.cartao)));
        linha(sb, cols, par(cols, "PIX", MoneyFormat.format(resumo.pagamentos.pix)));
        linha(sb, cols, par(cols, "Pre-pago", MoneyFormat.format(resumo.pagamentos.prepago)));
        separador(sb, cols);
        linha(sb, cols, par(cols, "Gaveta esperada", MoneyFormat.format(resumo.saldoCaixaFisico)));
        BigDecimal informado = saldoInformado != null ? saldoInformado : BigDecimal.ZERO;
        linha(sb, cols, par(cols, "Gaveta contada", MoneyFormat.format(informado)));
        BigDecimal diferenca = informado.subtract(
                resumo.saldoCaixaFisico != null ? resumo.saldoCaixaFisico : BigDecimal.ZERO);
        if (diferenca.compareTo(BigDecimal.ZERO) == 0) {
            linha(sb, cols, "Caixa conferido");
        } else if (diferenca.compareTo(BigDecimal.ZERO) > 0) {
            linha(sb, cols, par(cols, "Sobra", MoneyFormat.format(diferenca)));
        } else {
            linha(sb, cols, par(cols, "Falta", MoneyFormat.format(diferenca.negate())));
        }
        if (tem(observacao)) {
            separador(sb, cols);
            linha(sb, cols, "Obs: " + observacao.trim());
        }
        separador(sb, cols);
        centralizar(sb, "Fim do turno", cols);
        return sb.toString();
    }

    public static String conferencia(
            Cabecalho cab,
            String tituloMesa,
            String cliente,
            String telefone,
            List<LinhaItem> itens,
            BigDecimal total) {
        StringBuilder sb = new StringBuilder();
        int cols = cab.colunas;
        cabecalhoEmpresa(sb, cab);
        separador(sb, cols);
        centralizar(sb, "CONFERENCIA", cols);
        centralizar(sb, "NAO E DOCUMENTO FISCAL", cols);
        separador(sb, cols);
        linha(sb, cols, par(cols, "Data", formatarData(cab.momento)));
        linha(sb, cols, par(cols, "PDV", String.valueOf(Math.max(1, cab.pdv))));
        if (tem(cab.operador)) {
            linha(sb, cols, par(cols, "Operador", cab.operador.trim()));
        }
        if (tem(tituloMesa)) {
            linha(sb, cols, tituloMesa.trim());
        }
        if (tem(cliente)) {
            linha(sb, cols, "Cliente: " + cliente.trim());
        }
        if (tem(telefone)) {
            linha(sb, cols, "Telefone: " + telefone.trim());
        }
        separador(sb, cols);
        if (itens != null) {
            for (LinhaItem item : itens) {
                escreverItem(sb, cols, item);
            }
        }
        separador(sb, cols);
        linha(sb, cols, par(cols, "TOTAL", MoneyFormat.format(total)));
        separador(sb, cols);
        centralizar(sb, "Conferencia de consumo", cols);
        centralizar(sb, "Sem valor de pagamento", cols);
        return sb.toString();
    }

    public static String formatarCnpj(String cnpj) {
        if (cnpj == null) {
            return "";
        }
        String digitos = cnpj.replaceAll("\\D", "");
        if (digitos.length() != 14) {
            return cnpj.trim();
        }
        return digitos.substring(0, 2) + "."
                + digitos.substring(2, 5) + "."
                + digitos.substring(5, 8) + "/"
                + digitos.substring(8, 12) + "-"
                + digitos.substring(12);
    }

    public static String dataAmigavel(String iso) {
        if (iso == null || iso.trim().isEmpty()) {
            return "";
        }
        String texto = iso.trim();
        String[] padroes = {
                "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                "yyyy-MM-dd'T'HH:mm:ssXXX",
                "yyyy-MM-dd'T'HH:mm:ss",
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd"
        };
        for (String padrao : padroes) {
            try {
                SimpleDateFormat entrada = new SimpleDateFormat(padrao, Locale.US);
                entrada.setLenient(false);
                Date data = entrada.parse(texto);
                if ("yyyy-MM-dd".equals(padrao)) {
                    return new SimpleDateFormat("dd/MM/yyyy", Locale.forLanguageTag("pt-BR")).format(data);
                }
                return formatarData(data);
            } catch (ParseException ignored) {
            }
        }
        return texto;
    }

    static String semAcento(String texto) {
        if (texto == null) {
            return "";
        }
        String normal = Normalizer.normalize(texto, Normalizer.Form.NFD);
        return normal.replaceAll("\\p{M}", "");
    }

    private static void cabecalhoEmpresa(StringBuilder sb, Cabecalho cab) {
        if (tem(cab.empresa)) {
            centralizar(sb, cab.empresa.trim(), cab.colunas);
        }
        String cnpj = formatarCnpj(cab.cnpj);
        if (tem(cnpj)) {
            centralizar(sb, "CNPJ " + cnpj, cab.colunas);
        }
        if (tem(cab.endereco)) {
            centralizar(sb, cab.endereco.trim(), cab.colunas);
        }
        if (tem(cab.telefone)) {
            centralizar(sb, "Tel " + cab.telefone.trim(), cab.colunas);
        }
    }

    private static void escreverItem(StringBuilder sb, int cols, LinhaItem item) {
        String nome = item.nome != null ? item.nome : "Item";
        linha(sb, cols, nome);
        String qtd = qtd(item.quantidade) + " x " + MoneyFormat.format(item.precoUnitario);
        linha(sb, cols, par(cols, "  " + qtd, MoneyFormat.format(item.subtotal)));
    }

    private static String rotuloMeio(MeioPagamento meio) {
        if (meio == MeioPagamento.PIX) {
            return "PIX";
        }
        if (meio == MeioPagamento.CARTAO) {
            return "Cartao";
        }
        return "Dinheiro";
    }

    private static String qtd(BigDecimal valor) {
        if (valor == null) {
            return "0";
        }
        return valor.stripTrailingZeros().toPlainString().replace('.', ',');
    }

    private static BigDecimal decimal(String valor) {
        try {
            if (valor == null || valor.trim().isEmpty()) {
                return BigDecimal.ZERO;
            }
            return new BigDecimal(valor.trim().replace(",", "."));
        } catch (NumberFormatException error) {
            return BigDecimal.ZERO;
        }
    }

    private static void separador(StringBuilder sb, int cols) {
        sb.append(repetir('-', cols)).append('\n');
    }

    private static void centralizar(StringBuilder sb, String texto, int cols) {
        String limpo = semAcento(texto);
        for (String parte : quebrar(limpo, cols)) {
            sb.append(centro(parte, cols)).append('\n');
        }
    }

    private static void linha(StringBuilder sb, int cols, String texto) {
        String limpo = semAcento(texto);
        String[] blocos = limpo.split("\n", -1);
        for (String bloco : blocos) {
            if (cols <= 0 || bloco.length() <= cols) {
                sb.append(bloco).append('\n');
                continue;
            }
            for (String parte : quebrar(bloco, cols)) {
                sb.append(parte).append('\n');
            }
        }
    }

    private static String par(int cols, String esquerda, String direita) {
        String esq = semAcento(esquerda == null ? "" : esquerda);
        String dir = semAcento(direita == null ? "" : direita);
        if (esq.length() + dir.length() + 1 > cols) {
            return esq + "\n" + padLeft(dir, cols);
        }
        return esq + repetir(' ', cols - esq.length() - dir.length()) + dir;
    }

    private static String centro(String texto, int cols) {
        if (texto.length() >= cols) {
            return texto;
        }
        int esquerda = (cols - texto.length()) / 2;
        return repetir(' ', esquerda) + texto;
    }

    private static String padLeft(String texto, int cols) {
        if (texto.length() >= cols) {
            return texto;
        }
        return repetir(' ', cols - texto.length()) + texto;
    }

    private static List<String> quebrar(String texto, int cols) {
        List<String> linhas = new ArrayList<>();
        if (texto == null || texto.isEmpty()) {
            return linhas;
        }
        if (cols <= 0) {
            linhas.add(texto);
            return linhas;
        }
        String restante = texto.trim();
        while (restante.length() > cols) {
            int corte = restante.lastIndexOf(' ', cols);
            if (corte <= 0) {
                corte = cols;
            }
            linhas.add(restante.substring(0, corte).trim());
            restante = restante.substring(corte).trim();
        }
        if (!restante.isEmpty()) {
            linhas.add(restante);
        }
        return linhas;
    }

    private static String formatarData(Date data) {
        return new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.forLanguageTag("pt-BR")).format(data);
    }

    private static String repetir(char c, int n) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            sb.append(c);
        }
        return sb.toString();
    }

    private static void acrescentar(StringBuilder sb, String valor, String prefixo) {
        if (valor == null || valor.trim().isEmpty()) {
            return;
        }
        if (sb.length() > 0) {
            sb.append(prefixo);
        }
        sb.append(valor.trim());
    }

    private static boolean tem(String valor) {
        return valor != null && !valor.trim().isEmpty();
    }
}
