package com.maisgestao.nfe.util;

import android.text.TextUtils;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import java.util.Locale;
import java.util.regex.Pattern;

public final class EntidadeFormHelper {
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private EntidadeFormHelper() {}

    public static Integer inferirTipopessoa(String cnpjcpf) {
        String digitos = DocumentosBrasil.somenteDigitos(cnpjcpf);
        if (digitos.length() == 14) {
            return 1;
        }
        if (digitos.length() == 11) {
            return 0;
        }
        return null;
    }

    public static String validarCampos(
            String nome,
            String cnpjcpf,
            String email,
            String cep,
            Integer tipopessoa,
            Integer indiedest,
            String inscricaoestadual,
            String idestado) {
        if (TextUtils.isEmpty(nome) || nome.trim().length() < 3) {
            return "Nome é obrigatório (mínimo 3 caracteres)";
        }
        if (TextUtils.isEmpty(cnpjcpf)) {
            return "CNPJ/CPF é obrigatório";
        }
        if (!DocumentosBrasil.validarCpfCnpj(cnpjcpf)) {
            return "CNPJ/CPF inválido";
        }
        if (!TextUtils.isEmpty(email) && !EMAIL.matcher(email.trim()).matches()) {
            return "E-mail inválido";
        }
        String cepLimpo = DocumentosBrasil.somenteDigitos(cep);
        if (!cepLimpo.isEmpty() && cepLimpo.length() != 8) {
            return "CEP deve conter 8 dígitos";
        }
        if (indiedest == null || (indiedest != 1 && indiedest != 2 && indiedest != 9)) {
            return "Selecione o indicador de IE para NF-e";
        }
        if (tipopessoa != null && tipopessoa == 0 && indiedest != 9) {
            return "Pessoa física deve ser não contribuinte (indicador 9)";
        }
        if (tipopessoa != null && tipopessoa == 1 && indiedest == 1) {
            String ieNumerica = DocumentosBrasil.somenteDigitos(inscricaoestadual);
            if (ieNumerica.isEmpty()) {
                return "Informe a inscrição estadual do contribuinte ICMS";
            }
            if (TextUtils.isEmpty(idestado)) {
                return "Selecione o estado do contribuinte ICMS";
            }
        }
        return null;
    }

    public static JsonObject montarPayload(
            String idempresa,
            boolean criar,
            String nome,
            String razaosocial,
            String cnpjcpf,
            Integer tipopessoa,
            Integer indiedest,
            String inscricaoestadual,
            String rg,
            String email,
            String telefone,
            String fax,
            String endereco,
            String numeroendereco,
            String complemento,
            String bairro,
            String idcidade,
            String idestado,
            String cep,
            String pais,
            String nascimento,
            String idplanocontas,
            boolean flagCliente,
            boolean flagFornecedor,
            boolean flagTransportador,
            boolean flagRepresentante) {
        JsonObject body = new JsonObject();
        if (criar && idempresa != null) {
            body.addProperty("idempresa", idempresa);
        }
        body.addProperty("nome", nome.trim());
        body.addProperty("cnpjcpf", DocumentosBrasil.somenteDigitos(cnpjcpf));
        addNullable(body, "razaosocial", emptyToNull(razaosocial));
        if (tipopessoa != null) {
            body.addProperty("tipopessoa", tipopessoa);
        }
        IndIeDestNormalizado ie = montarIndIeDest(indiedest, inscricaoestadual);
        if (ie.indiedest != null) {
            body.addProperty("indiedest", ie.indiedest);
        }
        addNullable(body, "inscricaoestadual", ie.inscricaoestadual);
        addNullable(body, "rg", emptyToNull(rg));
        addNullable(body, "email", emptyToNull(email));
        addNullable(body, "telefone", digitsOrNull(telefone));
        addNullable(body, "fax", digitsOrNull(fax));
        addNullable(body, "endereco", emptyToNull(endereco));
        addNullable(body, "numeroendereco", emptyToNull(numeroendereco));
        addNullable(body, "complemento", emptyToNull(complemento));
        addNullable(body, "bairro", emptyToNull(bairro));
        addNullable(body, "idcidade", emptyToNull(idcidade));
        addNullable(body, "idestado", normalizeUf(idestado));
        addNullable(body, "cep", formatarCep(cep));
        addNullable(body, "pais", emptyToNull(pais));
        addNullable(body, "nascimento", emptyToNull(nascimento));
        addNullable(body, "idplanocontas", emptyToNull(idplanocontas));
        body.addProperty("cliente", flagCliente ? 1 : 0);
        body.addProperty("fornecedor", flagFornecedor ? 1 : 0);
        body.addProperty("transportador", flagTransportador ? 1 : 0);
        body.addProperty("representante", flagRepresentante ? 1 : 0);
        return body;
    }

    private static final class IndIeDestNormalizado {
        final Integer indiedest;
        final String inscricaoestadual;

        IndIeDestNormalizado(Integer indiedest, String inscricaoestadual) {
            this.indiedest = indiedest;
            this.inscricaoestadual = inscricaoestadual;
        }
    }

    private static IndIeDestNormalizado montarIndIeDest(Integer indiedest, String inscricaoestadual) {
        String ie = inscricaoestadual == null ? null : inscricaoestadual.trim();
        if (indiedest == null) {
            return new IndIeDestNormalizado(null, emptyToNull(ie));
        }
        if (indiedest == 9) {
            return new IndIeDestNormalizado(9, null);
        }
        if (indiedest == 2) {
            if (ie == null || ie.isEmpty()) {
                ie = "ISENTO";
            } else {
                String upper = ie.toUpperCase(Locale.ROOT);
                if ("ISENTA".equals(upper) || "ISENTO".equals(upper)) {
                    ie = "ISENTO";
                }
            }
            return new IndIeDestNormalizado(2, ie);
        }
        if (indiedest == 1 && ie != null && !ie.isEmpty()) {
            String upper = ie.toUpperCase(Locale.ROOT);
            if (!"ISENTO".equals(upper) && !"ISENTA".equals(upper)) {
                ie = DocumentosBrasil.somenteDigitos(ie);
                if (ie.isEmpty()) {
                    ie = null;
                }
            }
        }
        return new IndIeDestNormalizado(indiedest, emptyToNull(ie));
    }

    private static String formatarCep(String cep) {
        String limpo = DocumentosBrasil.somenteDigitos(cep);
        if (limpo.isEmpty()) {
            return null;
        }
        return limpo.length() > 8 ? limpo.substring(0, 8) : limpo;
    }

    private static String digitsOrNull(String valor) {
        String limpo = DocumentosBrasil.somenteDigitos(valor);
        return limpo.isEmpty() ? null : limpo;
    }

    private static String normalizeUf(String idestado) {
        String uf = emptyToNull(idestado);
        return uf == null ? null : uf.toUpperCase(Locale.ROOT);
    }

    private static String emptyToNull(String valor) {
        if (valor == null) {
            return null;
        }
        String trimmed = valor.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static void addNullable(JsonObject body, String key, String value) {
        if (value == null) {
            body.add(key, JsonNull.INSTANCE);
        } else {
            body.addProperty(key, value);
        }
    }
}
