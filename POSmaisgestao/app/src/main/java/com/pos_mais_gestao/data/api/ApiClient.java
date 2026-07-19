package com.pos_mais_gestao.data.api;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.domain.ItemCarrinho;
import com.pos_mais_gestao.domain.MeioPagamento;
import com.pos_mais_gestao.domain.Produto;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.TimeUnit;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

public class ApiClient {
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    private final PrefsStore prefsStore;
    private final Gson gson = new Gson();
    private final OkHttpClient httpClient;

    public ApiClient(PrefsStore prefsStore) {
        this.prefsStore = prefsStore;
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(20, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();
    }

    public void login(String email, String password) throws ApiException {
        JsonObject body = new JsonObject();
        body.addProperty("email", email);
        body.addProperty("password", password);

        JsonObject response = postJson("/api/auth/sign-in/email", body.toString(), false);
        String token = extrairToken(response);
        if (token == null || token.isEmpty()) {
            throw new ApiException("Sessão sem token. Verifique a API.");
        }

        String userId = null;
        String userName = null;
        if (response.has("user") && response.get("user").isJsonObject()) {
            JsonObject user = response.getAsJsonObject("user");
            userId = texto(user, "id");
            userName = texto(user, "name");
            if (userName == null) {
                userName = texto(user, "nome");
            }
        }

        prefsStore.setToken(token);
        prefsStore.setUser(userId, userName);
    }

    public List<EmpresaDto> listarEmpresas() throws ApiException {
        String userId = prefsStore.getUserId();
        String path = "/empresas?page=1&limit=100";
        if (userId != null && !userId.isEmpty()) {
            path += "&idusuario=" + userId;
        }
        JsonObject response = getJson(path);
        List<EmpresaDto> empresas = new ArrayList<>();
        JsonArray data = response.getAsJsonArray("data");
        if (data != null) {
            for (JsonElement element : data) {
                EmpresaDto empresa = gson.fromJson(element, EmpresaDto.class);
                if (empresa != null && empresa.id != null) {
                    empresas.add(empresa);
                }
            }
        }
        return empresas;
    }

    public List<Produto> buscarProdutos(String termo) throws ApiException {
        return buscarProdutos(termo, 1, 30).produtos;
    }

    public static class PaginaProdutos {
        public final List<Produto> produtos;
        public final int total;
        public final int page;
        public final int limit;

        public PaginaProdutos(List<Produto> produtos, int total, int page, int limit) {
            this.produtos = produtos;
            this.total = total;
            this.page = page;
            this.limit = limit;
        }

        public boolean temMais() {
            return page * limit < total;
        }
    }

    public PaginaProdutos buscarProdutos(String termo, int page, int limit) throws ApiException {
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId == null) {
            throw new ApiException("Empresa não selecionada");
        }
        int pagina = Math.max(1, page);
        int lim = Math.max(1, Math.min(100, limit));
        StringBuilder path = new StringBuilder("/produtos?idempresa=")
                .append(empresaId)
                .append("&inativo=0&page=")
                .append(pagina)
                .append("&limit=")
                .append(lim);
        if (termo != null && !termo.trim().isEmpty()) {
            path.append("&q=").append(encode(termo.trim()));
        }
        JsonObject response = getJson(path.toString());
        List<Produto> produtos = new ArrayList<>();
        JsonArray data = response.getAsJsonArray("data");
        if (data != null) {
            for (JsonElement element : data) {
                JsonObject obj = element.getAsJsonObject();
                String id = texto(obj, "id");
                String descricao = texto(obj, "descricao");
                if (id == null || descricao == null) {
                    continue;
                }
                BigDecimal preco = decimal(obj, "preco");
                String unidade = texto(obj, "unidademedida");
                String idUnidade = texto(obj, "idunidademedida");
                Integer codigo = null;
                if (obj.has("codigo") && !obj.get("codigo").isJsonNull()) {
                    try {
                        codigo = obj.get("codigo").getAsInt();
                    } catch (Exception ignored) {
                    }
                }
                produtos.add(new Produto(id, descricao, preco, unidade, idUnidade, codigo));
            }
        }
        int total = produtos.size();
        if (response.has("paginacao") && response.get("paginacao").isJsonObject()) {
            JsonObject pag = response.getAsJsonObject("paginacao");
            if (pag.has("total") && !pag.get("total").isJsonNull()) {
                total = pag.get("total").getAsInt();
            }
        }
        return new PaginaProdutos(produtos, total, pagina, lim);
    }

    public FechamentoCaixaDto buscarCaixaAberto() throws ApiException {
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId == null) {
            throw new ApiException("Empresa não selecionada");
        }
        String path = "/fechamentos-caixa?idempresa=" + empresaId
                + "&pdv=" + prefsStore.getNumeroPdv()
                + "&status=0&page=1&limit=1";
        JsonObject response = getJson(path);
        JsonArray data = response.getAsJsonArray("data");
        if (data == null || data.size() == 0) {
            return null;
        }
        return gson.fromJson(data.get(0), FechamentoCaixaDto.class);
    }

    public FechamentoCaixaDto abrirCaixa(String suprimentoInicial) throws ApiException {
        String empresaId = prefsStore.getEmpresaId();
        String userId = prefsStore.getUserId();
        if (empresaId == null || userId == null) {
            throw new ApiException("Sessão ou empresa inválida");
        }
        FechamentoCaixaDto existente = buscarCaixaAberto();
        if (existente != null) {
            throw new ApiException("Já existe um caixa aberto para este PDV");
        }
        JsonObject body = new JsonObject();
        body.addProperty("idempresa", empresaId);
        body.addProperty("pdv", prefsStore.getNumeroPdv());
        body.addProperty("idusuario", userId);
        body.addProperty("idusuariosuprimento", userId);
        body.addProperty("suprimentoinicial", suprimentoInicial);
        body.addProperty("status", 0);
        body.addProperty("local", 1);
        body.addProperty("datahora", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                .format(new Date()));
        return gson.fromJson(postJson("/fechamentos-caixa", body.toString(), true), FechamentoCaixaDto.class);
    }

    public void fecharCaixa(long idCaixa, String saldoInformado, String observacao) throws ApiException {
        String userId = prefsStore.getUserId();
        JsonObject body = new JsonObject();
        body.addProperty("status", 1);
        body.addProperty("saldoinformado", saldoInformado);
        body.addProperty("saldoconferido", saldoInformado);
        body.addProperty("saldoapurado", saldoInformado);
        body.addProperty("sobra", "0");
        body.addProperty("falta", "0");
        body.addProperty("idusuariofechamento", userId);
        if (observacao != null) {
            body.addProperty("observacao", observacao);
        }
        body.addProperty("datahora", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                .format(new Date()));
        putJson("/fechamentos-caixa/" + idCaixa, body.toString());
    }

    public List<Produto> listarAtalhosRemotos() throws ApiException {
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId == null) {
            throw new ApiException("Empresa não selecionada");
        }
        JsonObject response = getJson("/atalhos-pdv?idempresa=" + empresaId);
        List<Produto> produtos = new ArrayList<>();
        JsonArray data = response.getAsJsonArray("data");
        if (data != null) {
            for (JsonElement element : data) {
                JsonObject obj = element.getAsJsonObject();
                String id = texto(obj, "idproduto");
                String descricao = texto(obj, "descricao");
                if (id == null || descricao == null) {
                    continue;
                }
                produtos.add(new Produto(
                        id,
                        descricao,
                        decimal(obj, "preco"),
                        texto(obj, "unidademedida"),
                        texto(obj, "idunidademedida"),
                        obj.has("codigo") && !obj.get("codigo").isJsonNull()
                                ? obj.get("codigo").getAsInt()
                                : null));
            }
        }
        return produtos;
    }

    public void sincronizarAtalhos(List<String> idsProdutos) throws ApiException {
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId == null) {
            throw new ApiException("Empresa não selecionada");
        }
        JsonObject body = new JsonObject();
        body.addProperty("idempresa", empresaId);
        JsonArray arr = new JsonArray();
        for (String id : idsProdutos) {
            arr.add(id);
        }
        body.add("idsProdutos", arr);
        putJson("/atalhos-pdv", body.toString());
    }

    public VendaResultadoDto criarVendaPdvRapida(List<ItemCarrinho> itens, MeioPagamento meio)
            throws ApiException {
        if (itens == null || itens.isEmpty()) {
            throw new ApiException("Carrinho vazio");
        }
        if (!prefsStore.isEmitirNfcePos()) {
            return criarPedidoDavPos(itens, meio);
        }
        String empresaId = prefsStore.getEmpresaId();
        String userId = prefsStore.getUserId();
        if (empresaId == null || userId == null) {
            throw new ApiException("Sessão ou empresa inválida");
        }

        BigDecimal total = BigDecimal.ZERO;
        for (ItemCarrinho item : itens) {
            total = total.add(item.getSubtotal());
        }
        String totalStr = total.toPlainString();
        String zero = "0";

        JsonObject vendaBody = new JsonObject();
        vendaBody.addProperty("idempresa", empresaId);
        vendaBody.addProperty("numeropdv", prefsStore.getNumeroPdv());
        vendaBody.addProperty("usuarioquefechouvenda", userId);
        vendaBody.addProperty("vendalocal", 1);
        vendaBody.addProperty("valortotal", totalStr);
        vendaBody.addProperty("valortroco", zero);
        vendaBody.addProperty("valordinheiro", meio == MeioPagamento.DINHEIRO ? totalStr : zero);
        vendaBody.addProperty("valorpix", meio == MeioPagamento.PIX ? totalStr : zero);
        vendaBody.addProperty("valorcartaocredito", meio == MeioPagamento.CARTAO ? totalStr : zero);
        vendaBody.addProperty("valorcartaodebito", zero);
        vendaBody.addProperty("valorcartao", zero);
        vendaBody.addProperty("valorprepago", zero);

        JsonObject vendaJson = postJson("/vendas-pdv-gourmet", vendaBody.toString(), true);
        String idVenda = texto(vendaJson, "id");
        if (idVenda == null) {
            throw new ApiException("Venda criada sem ID");
        }

        for (ItemCarrinho item : itens) {
            JsonObject itemBody = new JsonObject();
            itemBody.addProperty("idempresa", empresaId);
            itemBody.addProperty("idvenda", idVenda);
            itemBody.addProperty("idproduto", item.getProduto().getId());
            itemBody.addProperty("quantidade", item.getQuantidade().toPlainString());
            itemBody.addProperty("precounitario", item.getProduto().getPreco().toPlainString());
            itemBody.addProperty("precototal", item.getSubtotal().toPlainString());
            itemBody.addProperty("precopromocao", "0");
            itemBody.addProperty("precoalterado", "0");
            postJson("/vendas-pdv-item", itemBody.toString(), true);
        }

        JsonObject baixaBody = new JsonObject();
        baixaBody.addProperty("idempresa", empresaId);
        baixaBody.addProperty("idvenda", idVenda);
        JsonArray itensBaixa = new JsonArray();
        for (ItemCarrinho item : itens) {
            JsonObject i = new JsonObject();
            i.addProperty("idproduto", item.getProduto().getId());
            i.addProperty("quantidade", item.getQuantidade().toPlainString());
            i.addProperty("precounitario", item.getProduto().getPreco().toPlainString());
            i.addProperty("nomeproduto", item.getProduto().getDescricao());
            itensBaixa.add(i);
        }
        baixaBody.add("itens", itensBaixa);
        JsonObject pags = new JsonObject();
        pags.addProperty("valortotal", totalStr);
        pags.addProperty("valortroco", zero);
        pags.addProperty("valordinheiro", meio == MeioPagamento.DINHEIRO ? totalStr : zero);
        pags.addProperty("valorpix", meio == MeioPagamento.PIX ? totalStr : zero);
        pags.addProperty("valorcartaocredito", meio == MeioPagamento.CARTAO ? totalStr : zero);
        pags.addProperty("valorcartaodebito", zero);
        pags.addProperty("valorcartao", zero);
        pags.addProperty("valorprepago", zero);
        baixaBody.add("pagamentos", pags);

        JsonObject baixaJson = postJson("/estoque/baixa-venda", baixaBody.toString(), true);

        VendaResultadoDto resultado = new VendaResultadoDto();
        resultado.idVenda = idVenda;
        resultado.codigo = texto(vendaJson, "codigo");
        if (resultado.codigo == null && vendaJson.has("codigo") && !vendaJson.get("codigo").isJsonNull()) {
            resultado.codigo = String.valueOf(vendaJson.get("codigo").getAsLong());
        }
        resultado.pedidoDav = false;
        aplicarResultadoEmissaoNfce(resultado, baixaJson, itens, totalStr, meio);
        return resultado;
    }

    /**
     * Fecha conta de mesa no mesmo fluxo do Gourmet: PUT status fechado → venda PDV → itens → baixa/NFC-e.
     */
    public VendaResultadoDto fecharContaMesa(String idConta, MeioPagamento meio) throws ApiException {
        if (idConta == null || idConta.isEmpty()) {
            throw new ApiException("Conta da mesa inválida");
        }
        String empresaId = prefsStore.getEmpresaId();
        String userId = prefsStore.getUserId();
        if (empresaId == null || userId == null) {
            throw new ApiException("Sessão ou empresa inválida");
        }

        List<ContaMesaItemDto> itensMesa = listarItensMesa(idConta);
        if (itensMesa == null || itensMesa.isEmpty()) {
            throw new ApiException("Comanda vazia — lance itens antes de fechar");
        }

        List<ItemCarrinho> itens = converterItensMesa(itensMesa);
        if (itens.isEmpty()) {
            throw new ApiException("Comanda sem itens válidos");
        }

        BigDecimal total = BigDecimal.ZERO;
        for (ItemCarrinho item : itens) {
            total = total.add(item.getSubtotal());
        }
        String totalStr = total.toPlainString();
        String zero = "0";

        JsonObject contaBody = new JsonObject();
        contaBody.addProperty("status", 2);
        contaBody.addProperty("desconto", zero);
        contaBody.addProperty("valortaxaservico", zero);
        contaBody.addProperty("valorcouverartistico", zero);
        contaBody.addProperty("valortotal", totalStr);
        contaBody.addProperty("valortroco", zero);
        contaBody.addProperty("valorpendente", zero);
        contaBody.addProperty("valordinheiro", meio == MeioPagamento.DINHEIRO ? totalStr : zero);
        contaBody.addProperty("valorpix", meio == MeioPagamento.PIX ? totalStr : zero);
        contaBody.addProperty("valorcartaocredito", meio == MeioPagamento.CARTAO ? totalStr : zero);
        contaBody.addProperty("valorcartaodebito", zero);
        contaBody.addProperty("valorcartao", zero);
        contaBody.addProperty("valorprepago", zero);
        contaBody.addProperty("usuarioquefechouconta", userId);
        putJson("/contas-mesa/" + idConta, contaBody.toString());

        JsonObject vendaBody = new JsonObject();
        vendaBody.addProperty("idempresa", empresaId);
        vendaBody.addProperty("idcontamesa", idConta);
        vendaBody.addProperty("numeropdv", prefsStore.getNumeroPdv());
        vendaBody.addProperty("usuarioquefechouvenda", userId);
        vendaBody.addProperty("vendalocal", 1);
        vendaBody.addProperty("valortotal", totalStr);
        vendaBody.addProperty("valortroco", zero);
        vendaBody.addProperty("valordinheiro", meio == MeioPagamento.DINHEIRO ? totalStr : zero);
        vendaBody.addProperty("valorpix", meio == MeioPagamento.PIX ? totalStr : zero);
        vendaBody.addProperty("valorcartaocredito", meio == MeioPagamento.CARTAO ? totalStr : zero);
        vendaBody.addProperty("valorcartaodebito", zero);
        vendaBody.addProperty("valorcartao", zero);
        vendaBody.addProperty("valorprepago", zero);

        JsonObject vendaJson = postJson("/vendas-pdv-gourmet", vendaBody.toString(), true);
        String idVenda = texto(vendaJson, "id");
        if (idVenda == null) {
            throw new ApiException("Venda criada sem ID");
        }

        for (ItemCarrinho item : itens) {
            JsonObject itemBody = new JsonObject();
            itemBody.addProperty("idempresa", empresaId);
            itemBody.addProperty("idvenda", idVenda);
            itemBody.addProperty("idproduto", item.getProduto().getId());
            itemBody.addProperty("quantidade", item.getQuantidade().toPlainString());
            itemBody.addProperty("precounitario", item.getProduto().getPreco().toPlainString());
            itemBody.addProperty("precototal", item.getSubtotal().toPlainString());
            itemBody.addProperty("precopromocao", "0");
            itemBody.addProperty("precoalterado", "0");
            postJson("/vendas-pdv-item", itemBody.toString(), true);
        }

        JsonObject baixaBody = new JsonObject();
        baixaBody.addProperty("idempresa", empresaId);
        baixaBody.addProperty("idvenda", idVenda);
        JsonArray itensBaixa = new JsonArray();
        for (ItemCarrinho item : itens) {
            JsonObject i = new JsonObject();
            i.addProperty("idproduto", item.getProduto().getId());
            i.addProperty("quantidade", item.getQuantidade().toPlainString());
            i.addProperty("precounitario", item.getProduto().getPreco().toPlainString());
            i.addProperty("nomeproduto", item.getProduto().getDescricao());
            itensBaixa.add(i);
        }
        baixaBody.add("itens", itensBaixa);
        JsonObject pags = new JsonObject();
        pags.addProperty("valortotal", totalStr);
        pags.addProperty("valortroco", zero);
        pags.addProperty("valordinheiro", meio == MeioPagamento.DINHEIRO ? totalStr : zero);
        pags.addProperty("valorpix", meio == MeioPagamento.PIX ? totalStr : zero);
        pags.addProperty("valorcartaocredito", meio == MeioPagamento.CARTAO ? totalStr : zero);
        pags.addProperty("valorcartaodebito", zero);
        pags.addProperty("valorcartao", zero);
        pags.addProperty("valorprepago", zero);
        baixaBody.add("pagamentos", pags);

        JsonObject baixaJson = postJson("/estoque/baixa-venda", baixaBody.toString(), true);

        VendaResultadoDto resultado = new VendaResultadoDto();
        resultado.idVenda = idVenda;
        resultado.codigo = texto(vendaJson, "codigo");
        if (resultado.codigo == null && vendaJson.has("codigo") && !vendaJson.get("codigo").isJsonNull()) {
            resultado.codigo = String.valueOf(vendaJson.get("codigo").getAsLong());
        }
        resultado.pedidoDav = false;
        aplicarResultadoEmissaoNfce(resultado, baixaJson, itens, totalStr, meio);
        if (resultado.sucessoFiscalCompleto && !resultado.cupomFiscal
                && (resultado.mensagemNfce == null
                        || resultado.mensagemNfce.equals("Venda registrada")
                        || resultado.mensagemNfce.startsWith("Venda registrada ("))) {
            resultado.mensagemNfce = "Mesa fechada";
        }
        return resultado;
    }

    private static List<ItemCarrinho> converterItensMesa(List<ContaMesaItemDto> itensMesa) {
        List<ItemCarrinho> itens = new ArrayList<>();
        for (ContaMesaItemDto dto : itensMesa) {
            if (dto.idproduto == null || dto.idproduto.isEmpty()) {
                continue;
            }
            BigDecimal preco;
            BigDecimal qty;
            try {
                preco = new BigDecimal(dto.precounitario != null ? dto.precounitario : "0");
            } catch (Exception e) {
                preco = BigDecimal.ZERO;
            }
            try {
                qty = new BigDecimal(dto.quantidade != null ? dto.quantidade : "0");
            } catch (Exception e) {
                qty = BigDecimal.ZERO;
            }
            if (qty.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            String nome = dto.nomeproduto != null ? dto.nomeproduto : "Item";
            Produto produto = new Produto(dto.idproduto, nome, preco, "UN", null, null);
            itens.add(new ItemCarrinho(produto, qty));
        }
        return itens;
    }

    private void aplicarResultadoEmissaoNfce(
            VendaResultadoDto resultado,
            JsonObject baixaJson,
            List<ItemCarrinho> itens,
            String totalStr,
            MeioPagamento meio) {
        boolean deveEmitir = baixaJson.has("deveEmitirNfce")
                && !baixaJson.get("deveEmitirNfce").isJsonNull()
                && baixaJson.get("deveEmitirNfce").getAsBoolean();
        resultado.deveEmitirNfce = deveEmitir;
        resultado.nfceEmitida = false;
        resultado.cupomFiscal = false;
        resultado.sucessoFiscalCompleto = !deveEmitir;

        JsonArray avisos = baixaJson.has("avisos") && baixaJson.get("avisos").isJsonArray()
                ? baixaJson.getAsJsonArray("avisos")
                : null;

        if (baixaJson.has("emissaoNfce") && baixaJson.get("emissaoNfce").isJsonObject()) {
            JsonObject nfce = baixaJson.getAsJsonObject("emissaoNfce");
            resultado.nfceEmitida = nfce.has("emitida") && !nfce.get("emitida").isJsonNull()
                    && nfce.get("emitida").getAsBoolean();
            resultado.chaveNfce = texto(nfce, "chave");
            resultado.idNotaFiscal = texto(nfce, "idnotafiscal");
            resultado.protocolo = texto(nfce, "protocolo");
            resultado.qrCode = texto(nfce, "qrCode");
            resultado.urlChave = texto(nfce, "urlChave");
            resultado.cStat = texto(nfce, "cStat");
            resultado.mensagemNfce = montarMotivoFalhaNfce(nfce, avisos);

            if (resultado.nfceEmitida) {
                resultado.sucessoFiscalCompleto = true;
                resultado.mensagemNfce = "NFC-e autorizada — disponível em Consulta NFC-e";
                resultado.cupomFiscal = resultado.chaveNfce != null && !resultado.chaveNfce.isEmpty();
                String qr = resultado.qrCode != null && !resultado.qrCode.isEmpty()
                        ? resultado.qrCode
                        : resultado.urlChave;
                resultado.qrParaImpressao = qr;
                resultado.comprovanteTexto = montarDanfceTexto(resultado, itens, totalStr, meio);
                if (resultado.idNotaFiscal != null) {
                    try {
                        JsonObject cupom = getJson("/nfce/" + resultado.idNotaFiscal + "/cupom");
                        if (cupom.has("data") && cupom.get("data").isJsonObject()) {
                            cupom = cupom.getAsJsonObject("data");
                        }
                        String doCupom = montarDanfceTextoDoCupom(cupom);
                        if (doCupom != null && !doCupom.isEmpty()) {
                            resultado.comprovanteTexto = doCupom;
                        }
                        if (cupom.has("nfce") && cupom.get("nfce").isJsonObject()) {
                            JsonObject nfceCupom = cupom.getAsJsonObject("nfce");
                            String qrCupom = texto(nfceCupom, "qrCode");
                            if (qrCupom == null || qrCupom.isEmpty()) {
                                qrCupom = texto(nfceCupom, "urlChave");
                            }
                            if (qrCupom != null && !qrCupom.isEmpty()) {
                                resultado.qrParaImpressao = qrCupom;
                            }
                        }
                    } catch (ApiException ignored) {
                        // fallback já montado acima
                    }
                }
            } else if (deveEmitir) {
                resultado.sucessoFiscalCompleto = false;
                if (resultado.mensagemNfce == null || resultado.mensagemNfce.isEmpty()) {
                    resultado.mensagemNfce = "NFC-e não autorizada";
                }
                resultado.cupomFiscal = false;
                resultado.comprovanteTexto =
                        montarComprovanteNaoFiscal(itens, totalStr, meio, resultado);
            } else {
                resultado.mensagemNfce = "Venda registrada (sem emissão NFC-e para este pagamento)";
                resultado.comprovanteTexto = montarComprovanteNaoFiscal(itens, totalStr, meio, resultado);
            }
        } else if (deveEmitir) {
            resultado.sucessoFiscalCompleto = false;
            resultado.mensagemNfce = montarMotivoFalhaNfce(null, avisos);
            if (resultado.mensagemNfce == null || resultado.mensagemNfce.isEmpty()) {
                resultado.mensagemNfce = "NFC-e não autorizada";
            }
            resultado.cupomFiscal = false;
            resultado.comprovanteTexto = montarComprovanteNaoFiscal(itens, totalStr, meio, resultado);
        } else {
            resultado.mensagemNfce = "Venda registrada";
            resultado.comprovanteTexto = montarComprovanteNaoFiscal(itens, totalStr, meio, resultado);
        }
    }

    private static String montarMotivoFalhaNfce(JsonObject nfce, JsonArray avisos) {
        if (nfce != null) {
            String erro = texto(nfce, "erro");
            if (erro != null && !erro.isEmpty()) {
                return erro;
            }
            String xMotivo = texto(nfce, "xMotivo");
            if (xMotivo != null && !xMotivo.isEmpty()) {
                return xMotivo;
            }
            if (nfce.has("pendencias") && nfce.get("pendencias").isJsonArray()) {
                JsonArray pendencias = nfce.getAsJsonArray("pendencias");
                StringBuilder sb = new StringBuilder();
                for (JsonElement el : pendencias) {
                    if (!el.isJsonObject()) {
                        continue;
                    }
                    String msg = texto(el.getAsJsonObject(), "mensagem");
                    if (msg == null || msg.isEmpty()) {
                        continue;
                    }
                    if (sb.length() > 0) {
                        sb.append("; ");
                    }
                    sb.append(msg);
                }
                if (sb.length() > 0) {
                    return sb.toString();
                }
            }
        }
        if (avisos != null) {
            for (JsonElement el : avisos) {
                if (el.isJsonNull()) {
                    continue;
                }
                String a = el.getAsString();
                if (a != null && a.matches("(?i).*(nfc|sefaz|cfop|duplicidade|emiss[aã]o).*")) {
                    return a;
                }
            }
            if (avisos.size() > 0 && !avisos.get(0).isJsonNull()) {
                return avisos.get(0).getAsString();
            }
        }
        return null;
    }

    private String montarDanfceTextoDoCupom(JsonObject cupom) {
        StringBuilder sb = new StringBuilder();
        sb.append("DOCUMENTO AUXILIAR DA NFC-e\n");
        String empresa = texto(cupom, "empresaNome");
        if (empresa == null) {
            empresa = prefsStore.getEmpresaNome();
        }
        if (empresa != null) {
            sb.append(empresa).append("\n");
        }
        String dataHora = texto(cupom, "dataHora");
        if (dataHora != null) {
            sb.append(dataHora).append("\n");
        }
        sb.append("--------------------------------\n");
        if (cupom.has("itens") && cupom.get("itens").isJsonArray()) {
            for (JsonElement el : cupom.getAsJsonArray("itens")) {
                if (!el.isJsonObject()) {
                    continue;
                }
                JsonObject item = el.getAsJsonObject();
                String nome = texto(item, "nome");
                String qty = texto(item, "quantidade");
                String preco = texto(item, "precounitario");
                sb.append(qty != null ? qty : "?")
                        .append("x ")
                        .append(nome != null ? nome : "Item")
                        .append(" ")
                        .append(preco != null ? preco : "")
                        .append("\n");
            }
        }
        sb.append("--------------------------------\n");
        if (cupom.has("total") && !cupom.get("total").isJsonNull()) {
            sb.append("TOTAL R$ ").append(cupom.get("total").getAsString()).append("\n");
        }
        if (cupom.has("pagamentos") && cupom.get("pagamentos").isJsonArray()) {
            for (JsonElement el : cupom.getAsJsonArray("pagamentos")) {
                if (!el.isJsonObject()) {
                    continue;
                }
                JsonObject pag = el.getAsJsonObject();
                String label = texto(pag, "label");
                if (label == null) {
                    label = texto(pag, "meio");
                }
                String valor = "";
                if (pag.has("valor") && !pag.get("valor").isJsonNull()) {
                    valor = pag.get("valor").isJsonPrimitive()
                            ? pag.get("valor").getAsString()
                            : String.valueOf(pag.get("valor"));
                }
                sb.append(label != null ? label : "Pagamento").append(": ").append(valor).append("\n");
            }
        }
        sb.append("--------------------------------\n");
        sb.append("CHAVE DE ACESSO\n");
        if (cupom.has("nfce") && cupom.get("nfce").isJsonObject()) {
            JsonObject nfce = cupom.getAsJsonObject("nfce");
            String chave = texto(nfce, "chave");
            if (chave != null) {
                sb.append(com.pos_mais_gestao.hardware.DanfceEscPos.formatarChave(chave)).append("\n");
            }
            String protocolo = texto(nfce, "protocolo");
            if (protocolo != null) {
                sb.append("Protocolo: ").append(protocolo).append("\n");
            }
        }
        return sb.toString();
    }

    private String montarDanfceTexto(
            VendaResultadoDto resultado,
            List<ItemCarrinho> itens,
            String total,
            MeioPagamento meio) {
        StringBuilder sb = new StringBuilder();
        sb.append("DOCUMENTO AUXILIAR DA NFC-e\n");
        String empresa = prefsStore.getEmpresaNome();
        if (empresa != null && !empresa.isEmpty()) {
            sb.append(empresa).append("\n");
        }
        SimpleDateFormat fmt = new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault());
        sb.append(fmt.format(new Date())).append("\n");
        sb.append("--------------------------------\n");
        for (ItemCarrinho item : itens) {
            sb.append(item.getQuantidade().toPlainString())
                    .append("x ")
                    .append(item.getProduto().getDescricao())
                    .append(" ")
                    .append(item.getSubtotal().toPlainString())
                    .append("\n");
        }
        sb.append("--------------------------------\n");
        sb.append("TOTAL R$ ").append(total).append("\n");
        sb.append("Pagamento: ").append(meio.name()).append("\n");
        sb.append("--------------------------------\n");
        sb.append("CHAVE DE ACESSO\n");
        if (resultado.chaveNfce != null) {
            sb.append(com.pos_mais_gestao.hardware.DanfceEscPos.formatarChave(resultado.chaveNfce))
                    .append("\n");
        }
        if (resultado.protocolo != null) {
            sb.append("Protocolo: ").append(resultado.protocolo).append("\n");
        }
        if (resultado.codigo != null) {
            sb.append("Venda: ").append(resultado.codigo).append("\n");
        }
        return sb.toString();
    }

    public VendaResultadoDto criarPedidoDavPos(List<ItemCarrinho> itens, MeioPagamento meio)
            throws ApiException {
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId == null) {
            throw new ApiException("Empresa não selecionada");
        }

        BigDecimal total = BigDecimal.ZERO;
        for (ItemCarrinho item : itens) {
            total = total.add(item.getSubtotal());
        }
        String totalStr = total.toPlainString();

        long agora = System.currentTimeMillis();
        SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        iso.setTimeZone(TimeZone.getTimeZone("UTC"));
        SimpleDateFormat dia = new SimpleDateFormat("yyyy-MM-dd", Locale.US);

        JsonObject davBody = new JsonObject();
        davBody.addProperty("idempresa", empresaId);
        davBody.addProperty("status", 0);
        davBody.addProperty("tipodocumento", 4);
        davBody.addProperty("data", dia.format(new Date(agora)));
        davBody.addProperty("datainclusao", iso.format(new Date(agora)));
        davBody.addProperty("currenttimemillis", agora);
        davBody.addProperty("extra1", "POS");
        davBody.addProperty("valor", totalStr);

        JsonObject davJson = postJson("/davs", davBody.toString(), true);
        String idDav = texto(davJson, "id");
        if (idDav == null) {
            throw new ApiException("Pedido criado sem ID");
        }

        for (ItemCarrinho item : itens) {
            JsonObject itemBody = new JsonObject();
            itemBody.addProperty("idproduto", item.getProduto().getId());
            itemBody.addProperty("quantidade", item.getQuantidade().toPlainString());
            itemBody.addProperty("preco", item.getProduto().getPreco().toPlainString());
            if (item.getProduto().getUnidadeMedida() != null) {
                itemBody.addProperty("unidademedida", item.getProduto().getUnidadeMedida());
            }
            postJson("/davs/" + idDav + "/itens", itemBody.toString(), true);
        }

        VendaResultadoDto resultado = new VendaResultadoDto();
        resultado.idVenda = idDav;
        resultado.codigo = texto(davJson, "codigo");
        if (resultado.codigo == null && davJson.has("codigo") && !davJson.get("codigo").isJsonNull()) {
            resultado.codigo = String.valueOf(davJson.get("codigo").getAsLong());
        }
        resultado.pedidoDav = true;
        resultado.nfceEmitida = false;
        resultado.deveEmitirNfce = false;
        resultado.sucessoFiscalCompleto = true;
        resultado.cupomFiscal = false;
        resultado.mensagemNfce = "Pedido #" + (resultado.codigo != null ? resultado.codigo : "—")
                + " — veja em Pedidos da maquininha";
        resultado.comprovanteTexto = montarComprovanteDav(itens, totalStr, meio, resultado);
        return resultado;
    }

    private String montarComprovanteDav(
            List<ItemCarrinho> itens, String total, MeioPagamento meio, VendaResultadoDto resultado) {
        StringBuilder sb = new StringBuilder();
        sb.append("MAIS GESTAO - POS\n");
        sb.append("PEDIDO (DAV) - NAO FISCAL\n");
        sb.append("----------------\n");
        for (ItemCarrinho item : itens) {
            sb.append(item.getQuantidade().toPlainString())
                    .append("x ")
                    .append(item.getProduto().getDescricao())
                    .append(" ")
                    .append(item.getSubtotal().toPlainString())
                    .append("\n");
        }
        sb.append("----------------\n");
        sb.append("TOTAL: ").append(total).append("\n");
        sb.append("PAGTO: ").append(meio.name()).append("\n");
        if (resultado.codigo != null) {
            sb.append("PEDIDO: ").append(resultado.codigo).append("\n");
        }
        sb.append("Retaguarda: Pedidos da maquininha\n");
        return sb.toString();
    }

    private String montarComprovanteNaoFiscal(
            List<ItemCarrinho> itens, String total, MeioPagamento meio, VendaResultadoDto resultado) {
        StringBuilder sb = new StringBuilder();
        sb.append("MAIS GESTAO - POS\n");
        sb.append("COMPROVANTE NAO FISCAL\n");
        if (resultado.deveEmitirNfce && !resultado.nfceEmitida) {
            sb.append("NFC-e NAO TRANSMITIDA\n");
        }
        sb.append("----------------\n");
        for (ItemCarrinho item : itens) {
            sb.append(item.getQuantidade().toPlainString())
                    .append("x ")
                    .append(item.getProduto().getDescricao())
                    .append(" ")
                    .append(item.getSubtotal().toPlainString())
                    .append("\n");
        }
        sb.append("----------------\n");
        sb.append("TOTAL: ").append(total).append("\n");
        sb.append("PAGTO: ").append(meio.name()).append("\n");
        if (resultado.codigo != null) {
            sb.append("VENDA: ").append(resultado.codigo).append("\n");
        }
        if (resultado.cStat != null && !resultado.cStat.isEmpty()) {
            sb.append("SEFAZ cStat: ").append(resultado.cStat).append("\n");
        }
        if (resultado.mensagemNfce != null) {
            sb.append(resultado.mensagemNfce).append("\n");
        }
        if (resultado.deveEmitirNfce && !resultado.nfceEmitida) {
            sb.append("Reemitir em Consulta NFC-e\n");
        }
        return sb.toString();
    }

    public List<ContaMesaDto> listarMesasAbertas() throws ApiException {
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId == null) {
            throw new ApiException("Empresa não selecionada");
        }
        String path = "/contas-mesa?idempresa=" + empresaId + "&status=1&page=1&limit=100";
        JsonObject response = getJson(path);
        List<ContaMesaDto> mesas = new ArrayList<>();
        JsonArray data = response.getAsJsonArray("data");
        if (data != null) {
            for (JsonElement element : data) {
                ContaMesaDto mesa = gson.fromJson(element, ContaMesaDto.class);
                if (mesa != null && mesa.id != null) {
                    mesas.add(mesa);
                }
            }
        }
        return mesas;
    }

    public ContaMesaDto abrirMesa(int numeroMesa) throws ApiException {
        String empresaId = prefsStore.getEmpresaId();
        String userId = prefsStore.getUserId();
        if (empresaId == null || userId == null) {
            throw new ApiException("Sessão ou empresa inválida");
        }
        JsonObject body = new JsonObject();
        body.addProperty("idempresa", empresaId);
        body.addProperty("idusuario", userId);
        body.addProperty("numeromesa", numeroMesa);
        body.addProperty("status", 1);
        body.addProperty("idgarcom", userId);
        JsonObject response = postJson("/contas-mesa", body.toString(), true);
        ContaMesaDto mesa = gson.fromJson(response, ContaMesaDto.class);
        if (mesa == null || mesa.id == null) {
            throw new ApiException("Não foi possível abrir a mesa");
        }
        return mesa;
    }

    public List<ContaMesaItemDto> listarItensMesa(String idContaMesa) throws ApiException {
        String path = "/contas-mesa-item?idcontamesa=" + idContaMesa + "&page=1&limit=100";
        JsonObject response = getJson(path);
        List<ContaMesaItemDto> itens = new ArrayList<>();
        JsonArray data = response.getAsJsonArray("data");
        if (data != null) {
            for (JsonElement element : data) {
                ContaMesaItemDto item = gson.fromJson(element, ContaMesaItemDto.class);
                if (item != null && item.id != null) {
                    itens.add(item);
                }
            }
        }
        return itens;
    }

    public ContaMesaItemDto adicionarItemMesa(String idContaMesa, Produto produto) throws ApiException {
        return adicionarItemMesa(idContaMesa, produto, "1");
    }

    public ContaMesaItemDto adicionarItemMesa(String idContaMesa, Produto produto, String quantidade)
            throws ApiException {
        String userId = prefsStore.getUserId();
        if (userId == null) {
            throw new ApiException("Usuário não autenticado");
        }
        if (produto.getIdUnidadeMedida() == null || produto.getIdUnidadeMedida().isEmpty()) {
            throw new ApiException("Produto sem unidade de medida cadastrada");
        }
        String qty = quantidade == null || quantidade.trim().isEmpty() ? "1" : quantidade.trim();
        JsonObject body = new JsonObject();
        body.addProperty("idcontamesa", idContaMesa);
        body.addProperty("idproduto", produto.getId());
        body.addProperty("idgarcom", userId);
        String nome = produto.getDescricao();
        if (nome.length() > 120) {
            nome = nome.substring(0, 120);
        }
        body.addProperty("nomeproduto", nome);
        body.addProperty("quantidade", qty);
        body.addProperty("precounitario", produto.getPreco().toPlainString());
        body.addProperty("precopromocao", "0");
        body.addProperty("precoalterado", "0");
        body.addProperty("unidademedida", produto.getIdUnidadeMedida());
        JsonObject response = postJson("/contas-mesa-item", body.toString(), true);
        ContaMesaItemDto item = gson.fromJson(response, ContaMesaItemDto.class);
        if (item == null || item.id == null) {
            throw new ApiException("Não foi possível lançar o item");
        }
        return item;
    }

    public void removerItemMesa(String idItem) throws ApiException {
        deleteJson("/contas-mesa-item/" + idItem);
    }

    private void deleteJson(String path) throws ApiException {
        Request.Builder builder = new Request.Builder().url(prefsStore.getBaseUrl() + path).delete();
        String token = prefsStore.getToken();
        if (token != null && !token.isEmpty()) {
            builder.header("Authorization", "Bearer " + token);
        }
        execute(builder.build());
    }

    private String extrairToken(JsonObject response) {
        if (response.has("session") && response.get("session").isJsonObject()) {
            String token = texto(response.getAsJsonObject("session"), "token");
            if (token != null) {
                return token;
            }
        }
        return texto(response, "token");
    }

    private JsonObject getJson(String path) throws ApiException {
        Request.Builder builder = new Request.Builder().url(prefsStore.getBaseUrl() + path).get();
        String token = prefsStore.getToken();
        if (token != null && !token.isEmpty()) {
            builder.header("Authorization", "Bearer " + token);
        }
        return execute(builder.build());
    }

    private JsonObject postJson(String path, String jsonBody, boolean autenticado) throws ApiException {
        RequestBody body = RequestBody.create(jsonBody, JSON);
        Request.Builder builder = new Request.Builder()
                .url(prefsStore.getBaseUrl() + path)
                .post(body)
                .header("Content-Type", "application/json");
        if (autenticado) {
            String token = prefsStore.getToken();
            if (token != null && !token.isEmpty()) {
                builder.header("Authorization", "Bearer " + token);
            }
        }
        return execute(builder.build());
    }

    private JsonObject putJson(String path, String jsonBody) throws ApiException {
        RequestBody body = RequestBody.create(jsonBody, JSON);
        Request.Builder builder = new Request.Builder()
                .url(prefsStore.getBaseUrl() + path)
                .put(body)
                .header("Content-Type", "application/json");
        String token = prefsStore.getToken();
        if (token != null && !token.isEmpty()) {
            builder.header("Authorization", "Bearer " + token);
        }
        return execute(builder.build());
    }

    private JsonObject execute(Request request) throws ApiException {
        try (Response response = httpClient.newCall(request).execute()) {
            ResponseBody responseBody = response.body();
            String raw = responseBody != null ? responseBody.string() : "";
            if (!response.isSuccessful()) {
                String message = extrairErro(raw);
                throw new ApiException(message, response.code());
            }
            if (raw == null || raw.trim().isEmpty()) {
                return new JsonObject();
            }
            JsonElement element = JsonParser.parseString(raw);
            if (element.isJsonObject()) {
                return element.getAsJsonObject();
            }
            JsonObject wrapper = new JsonObject();
            wrapper.add("data", element);
            return wrapper;
        } catch (ApiException e) {
            throw e;
        } catch (IOException e) {
            throw new ApiException("Falha de rede: " + e.getMessage());
        } catch (Exception e) {
            throw new ApiException("Erro ao processar resposta: " + e.getMessage());
        }
    }

    private String extrairErro(String raw) {
        try {
            JsonObject obj = JsonParser.parseString(raw).getAsJsonObject();
            if (obj.has("error") && !obj.get("error").isJsonNull()) {
                return obj.get("error").getAsString();
            }
            if (obj.has("message") && !obj.get("message").isJsonNull()) {
                return obj.get("message").getAsString();
            }
        } catch (Exception ignored) {
        }
        return raw == null || raw.isEmpty() ? "Erro na API" : raw;
    }

    private static String texto(JsonObject obj, String key) {
        if (obj == null || !obj.has(key) || obj.get(key).isJsonNull()) {
            return null;
        }
        JsonElement el = obj.get(key);
        if (el.isJsonPrimitive()) {
            return el.getAsString();
        }
        return el.toString();
    }

    private static BigDecimal decimal(JsonObject obj, String key) {
        if (obj == null || !obj.has(key) || obj.get(key).isJsonNull()) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(obj.get(key).getAsString());
        } catch (Exception e) {
            try {
                return BigDecimal.valueOf(obj.get(key).getAsDouble());
            } catch (Exception ignored) {
                return BigDecimal.ZERO;
            }
        }
    }

    private static String encode(String value) {
        try {
            return java.net.URLEncoder.encode(value, "UTF-8");
        } catch (Exception e) {
            return value;
        }
    }
}
