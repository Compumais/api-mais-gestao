package com.pos_mais_gestao.data.api;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.pos_mais_gestao.data.local.CatalogRepository;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.domain.ItemCarrinho;
import com.pos_mais_gestao.domain.LancamentoPagamento;
import com.pos_mais_gestao.domain.MeioPagamento;
import com.pos_mais_gestao.domain.PagamentosResumo;
import com.pos_mais_gestao.domain.Produto;
import com.pos_mais_gestao.domain.ResumoTurnoCaixa;
import com.pos_mais_gestao.ui.pedido.SacolaLinha;
import com.pos_mais_gestao.util.MoneyFormat;
import com.pos_mais_gestao.util.PagamentosMisto;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
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
    private final CatalogRepository catalog;
    private final LocalPdvApi localPdv;
    private final Gson gson = new Gson();
    private final OkHttpClient httpClient;

    public ApiClient(PrefsStore prefsStore, CatalogRepository catalog) {
        this.prefsStore = prefsStore;
        this.catalog = catalog;
        this.localPdv = new LocalPdvApi(prefsStore);
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(20, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();
    }

    public CatalogRepository catalogo() {
        return catalog;
    }

    private boolean isLocal() {
        return prefsStore.isModoPdvLocal();
    }

    public void pingPdv() throws ApiException {
        localPdv.ping();
    }

    public void sincronizarConfigPdv() throws ApiException {
        if (!isLocal()) {
            return;
        }
        aplicarConfigPdv(localPdv.status());
    }

    public int carregarCatalogo() throws ApiException {
        if (!isLocal()) {
            throw new ApiException("Carga de catálogo só no modo PDV local");
        }
        JsonObject payload = localPdv.sync();
        int total = catalog.gravarSync(payload);
        prefsStore.setAtalhos(catalog.listarAtalhos());
        sincronizarConfigPdv();
        return total;
    }

    public void selecionarEmpresaNoPdv(String id, String nome) throws ApiException {
        if (!isLocal()) {
            return;
        }
        localPdv.selecionarEmpresa(id, nome);
        carregarCatalogo();
    }

    public void login(String email, String password) throws ApiException {
        if (isLocal()) {
            JsonObject response = localPdv.login(email, password);
            String token = texto(response, "token");
            if (token == null || token.isEmpty()) {
                throw new ApiException("Sessão sem token. Verifique o PDV.");
            }
            prefsStore.setToken(token);
            prefsStore.setUser(texto(response, "userid"), texto(response, "username"));
            try {
                sincronizarConfigPdv();
            } catch (ApiException ignored) {
            }
            return;
        }

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
        if (isLocal()) {
            JsonObject response = localPdv.listarEmpresas();
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
        if (isLocal()) {
            int lim = Math.max(1, Math.min(200, limit));
            List<Produto> produtos = catalog.buscarProdutos(termo, lim);
            return new PaginaProdutos(produtos, produtos.size(), 1, lim);
        }
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
                produtos.add(new Produto(
                        id,
                        descricao,
                        preco,
                        unidade,
                        idUnidade,
                        codigo,
                        texto(obj, "imagem"),
                        texto(obj, "caminhoimagem"),
                        flag(obj, "espizza")));
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

    public List<Produto> listarPizzas(String excetoId) throws ApiException {
        if (isLocal()) {
            return catalog.listarPizzas(excetoId, 200);
        }
        List<Produto> pizzas = new ArrayList<>();
        PaginaProdutos pagina = buscarProdutos("", 1, 100);
        for (Produto p : pagina.produtos) {
            if (p.isEspizza() && (excetoId == null || !excetoId.equals(p.getId()))) {
                pizzas.add(p);
            }
        }
        return pizzas;
    }

    public Produto atualizarPrecoProduto(String idProduto, BigDecimal preco) throws ApiException {
        if (isLocal()) {
            throw new ApiException("Alterar preço não está disponível no modo PDV local");
        }
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId == null) {
            throw new ApiException("Empresa não selecionada");
        }
        if (idProduto == null || idProduto.isEmpty()) {
            throw new ApiException("Produto inválido");
        }
        if (preco == null || preco.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException("Preço inválido");
        }
        JsonObject body = new JsonObject();
        body.addProperty("preco", MoneyFormat.toApi(preco));
        JsonObject response = putJson(
                "/produtos/" + idProduto + "?idempresa=" + empresaId, body.toString());
        JsonObject obj = response;
        if (response.has("data") && response.get("data").isJsonObject()) {
            obj = response.getAsJsonObject("data");
        }
        String id = texto(obj, "id");
        String descricao = texto(obj, "descricao");
        if (descricao == null) {
            descricao = texto(obj, "nome");
        }
        if (id == null) {
            id = idProduto;
        }
        BigDecimal precoAtualizado = decimal(obj, "preco");
        if (precoAtualizado.compareTo(BigDecimal.ZERO) == 0) {
            precoAtualizado = preco;
        }
        return new Produto(
                id,
                descricao != null ? descricao : "Produto",
                precoAtualizado,
                texto(obj, "unidademedida"),
                texto(obj, "idunidademedida"),
                inteiro(obj, "codigo"),
                texto(obj, "imagem"),
                texto(obj, "caminhoimagem"),
                flag(obj, "espizza"));
    }

    public List<ClienteDto> buscarClientes(String termo, int page, int limit) throws ApiException {
        if (isLocal()) {
            return new ArrayList<>();
        }
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId == null) {
            throw new ApiException("Empresa não selecionada");
        }
        int pagina = Math.max(1, page);
        int lim = Math.max(1, Math.min(100, limit));
        StringBuilder path = new StringBuilder("/entidades?idempresa=")
                .append(empresaId)
                .append("&cliente=1&page=")
                .append(pagina)
                .append("&limit=")
                .append(lim);
        if (termo != null && !termo.trim().isEmpty()) {
            path.append("&q=").append(encode(termo.trim()));
        }
        JsonObject response = getJson(path.toString());
        List<ClienteDto> clientes = new ArrayList<>();
        JsonArray data = response.getAsJsonArray("data");
        if (data != null) {
            for (JsonElement element : data) {
                JsonObject obj = element.getAsJsonObject();
                ClienteDto cliente = new ClienteDto();
                cliente.id = texto(obj, "id");
                cliente.nome = texto(obj, "nome");
                cliente.razaosocial = texto(obj, "razaosocial");
                cliente.cnpjcpf = texto(obj, "cnpjcpf");
                if (cliente.id != null) {
                    clientes.add(cliente);
                }
            }
        }
        return clientes;
    }

    public FechamentoCaixaDto buscarCaixaAberto() throws ApiException {
        if (isLocal()) {
            JsonObject status = localPdv.status();
            aplicarConfigPdv(status);
            if (!status.has("caixa") || status.get("caixa").isJsonNull() || !status.get("caixa").isJsonObject()) {
                return null;
            }
            JsonObject caixa = status.getAsJsonObject("caixa");
            FechamentoCaixaDto dto = new FechamentoCaixaDto();
            dto.id = 1L;
            dto.status = 0;
            dto.pdv = inteiro(caixa, "numeropdv");
            dto.suprimentoinicial = textoOuNumero(caixa, "valorabertura");
            dto.datahora = texto(caixa, "abertoem");
            dto.datacriacao = dto.datahora;
            return dto;
        }
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
        if (isLocal()) {
            throw new ApiException("Abra o caixa no PDV desktop");
        }
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
        body.addProperty("datahora", agoraIsoUtc());
        return gson.fromJson(postJson("/fechamentos-caixa", body.toString(), true), FechamentoCaixaDto.class);
    }

    public void fecharCaixa(
            long idCaixa,
            String saldoInformado,
            String saldoApurado,
            String sobra,
            String falta,
            String observacao)
            throws ApiException {
        if (isLocal()) {
            throw new ApiException("Feche o caixa no PDV desktop");
        }
        String userId = prefsStore.getUserId();
        JsonObject body = new JsonObject();
        body.addProperty("status", 1);
        body.addProperty("saldoinformado", saldoInformado);
        body.addProperty("saldoconferido", saldoInformado);
        body.addProperty("saldoapurado", saldoApurado);
        body.addProperty("sobra", sobra != null ? sobra : "0");
        body.addProperty("falta", falta != null ? falta : "0");
        body.addProperty("idusuariofechamento", userId);
        if (observacao != null && !observacao.trim().isEmpty()) {
            body.addProperty("observacao", observacao.trim());
        }
        body.addProperty("datahora", agoraIsoUtc());
        putJson("/fechamentos-caixa/" + idCaixa, body.toString());
    }

    public ResumoTurnoCaixa calcularResumoTurno(FechamentoCaixaDto caixa) throws ApiException {
        if (isLocal()) {
            return new ResumoTurnoCaixa();
        }
        ResumoTurnoCaixa resumo = new ResumoTurnoCaixa();
        if (caixa == null) {
            return resumo;
        }
        String dataInicioIso = caixa.datacriacao != null && !caixa.datacriacao.isEmpty()
                ? caixa.datacriacao
                : caixa.datahora;
        long inicioMs = parseMillis(dataInicioIso);
        // API filtra melhor com data (yyyy-MM-dd); o corte fino fica no cliente
        String dataDia = extrairDataDia(dataInicioIso);
        int numeropdv = caixa.pdv != null ? caixa.pdv : prefsStore.getNumeroPdv();

        List<JsonObject> vendas = listarVendasTurnoJson(dataDia, numeropdv, inicioMs);
        Map<String, JsonObject> contasPorId = buscarContasMesaJson(vendas);

        PagamentosResumo pagamentos = PagamentosResumo.vazio();
        for (JsonObject venda : vendas) {
            pagamentos.somar(resolverPagamentosVendaPdv(venda, contasPorId));
        }

        // Pedidos DAV (modo sem NFC-e) também entram no turno do PDV
        List<JsonObject> davs = listarDavsTurnoJson(dataDia, inicioMs);
        for (JsonObject dav : davs) {
            pagamentos.somar(extrairPagamentosDav(dav));
        }

        resumo.qtdVendas = vendas.size() + davs.size();
        resumo.pagamentos = pagamentos;
        resumo.suprimento = MoneyFormat.parse(caixa.suprimentoinicial);
        resumo.recalcular();
        return resumo;
    }

    public ContaMesaDto buscarContaMesa(String idConta) throws ApiException {
        if (isLocal()) {
            ContaMesaDto conta = mapearContaLocal(localPdv.obterConta(idConta));
            if (conta == null || conta.id == null) {
                throw new ApiException("Conta da mesa não encontrada");
            }
            return conta;
        }
        JsonObject obj = buscarContaMesaJson(idConta);
        ContaMesaDto conta = gson.fromJson(obj, ContaMesaDto.class);
        if (conta == null || conta.id == null) {
            throw new ApiException("Conta da mesa não encontrada");
        }
        return conta;
    }

    private Map<String, JsonObject> buscarContasMesaJson(List<JsonObject> vendas) {
        Set<String> contaIds = new HashSet<>();
        for (JsonObject venda : vendas) {
            String idConta = texto(venda, "idcontamesa");
            if (idConta != null && !idConta.isEmpty()) {
                contaIds.add(idConta);
            }
        }
        Map<String, JsonObject> contasPorId = new HashMap<>();
        for (String idConta : contaIds) {
            try {
                contasPorId.put(idConta, buscarContaMesaJson(idConta));
            } catch (ApiException ignored) {
            }
        }
        return contasPorId;
    }

    private JsonObject buscarContaMesaJson(String idConta) throws ApiException {
        if (idConta == null || idConta.isEmpty()) {
            throw new ApiException("Conta inválida");
        }
        JsonObject response = getJson("/contas-mesa/" + idConta);
        if (response.has("data") && response.get("data").isJsonObject()) {
            return response.getAsJsonObject("data");
        }
        return response;
    }

    private List<JsonObject> listarVendasTurnoJson(String dataDia, int numeropdv, long inicioMs)
            throws ApiException {
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId == null) {
            throw new ApiException("Empresa não selecionada");
        }
        List<JsonObject> vendas = new ArrayList<>();
        int page = 1;
        int limit = 100;
        while (true) {
            StringBuilder path = new StringBuilder("/vendas-pdv-gourmet?idempresa=")
                    .append(empresaId)
                    .append("&numeropdv=")
                    .append(numeropdv)
                    .append("&page=")
                    .append(page)
                    .append("&limit=")
                    .append(limit);
            if (dataDia != null && !dataDia.isEmpty()) {
                path.append("&dataInicio=").append(encode(dataDia));
            }
            JsonObject response = getJson(path.toString());
            JsonArray data = response.getAsJsonArray("data");
            int recebidos = 0;
            if (data != null) {
                recebidos = data.size();
                for (JsonElement element : data) {
                    if (!element.isJsonObject()) {
                        continue;
                    }
                    JsonObject venda = element.getAsJsonObject();
                    if (estaAntesDoTurno(texto(venda, "datacriacao"), inicioMs)) {
                        continue;
                    }
                    vendas.add(venda);
                }
            }
            int totalPages = 1;
            if (response.has("paginacao") && response.get("paginacao").isJsonObject()) {
                JsonObject pag = response.getAsJsonObject("paginacao");
                if (pag.has("totalPages") && !pag.get("totalPages").isJsonNull()) {
                    totalPages = pag.get("totalPages").getAsInt();
                }
            }
            if (page >= totalPages || recebidos < limit) {
                break;
            }
            page += 1;
        }
        return vendas;
    }

    private List<JsonObject> listarDavsTurnoJson(String dataDia, long inicioMs) throws ApiException {
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId == null) {
            throw new ApiException("Empresa não selecionada");
        }
        List<JsonObject> davs = new ArrayList<>();
        int page = 1;
        int limit = 100;
        while (true) {
            StringBuilder path = new StringBuilder("/davs?idempresa=")
                    .append(empresaId)
                    .append("&origem=POS")
                    .append("&page=")
                    .append(page)
                    .append("&limit=")
                    .append(limit);
            if (dataDia != null && !dataDia.isEmpty()) {
                path.append("&dataInicio=").append(encode(dataDia));
            }
            JsonObject response = getJson(path.toString());
            JsonArray data = response.getAsJsonArray("data");
            int recebidos = 0;
            if (data != null) {
                recebidos = data.size();
                for (JsonElement element : data) {
                    if (!element.isJsonObject()) {
                        continue;
                    }
                    JsonObject dav = element.getAsJsonObject();
                    String dataHora = texto(dav, "datainclusao");
                    if (dataHora == null) {
                        dataHora = texto(dav, "data");
                    }
                    if (estaAntesDoTurno(dataHora, inicioMs)) {
                        continue;
                    }
                    // currenttimemillis ajuda quando data está só no dia
                    if (inicioMs > 0 && dav.has("currenttimemillis") && !dav.get("currenttimemillis").isJsonNull()) {
                        try {
                            long millis = dav.get("currenttimemillis").getAsLong();
                            if (millis > 0 && millis < inicioMs) {
                                continue;
                            }
                        } catch (Exception ignored) {
                        }
                    }
                    davs.add(dav);
                }
            }
            int totalPages = 1;
            if (response.has("paginacao") && response.get("paginacao").isJsonObject()) {
                JsonObject pag = response.getAsJsonObject("paginacao");
                if (pag.has("totalPages") && !pag.get("totalPages").isJsonNull()) {
                    totalPages = pag.get("totalPages").getAsInt();
                }
            }
            if (page >= totalPages || recebidos < limit) {
                break;
            }
            page += 1;
        }
        return davs;
    }

    private PagamentosResumo resolverPagamentosVendaPdv(
            JsonObject venda, Map<String, JsonObject> contasPorId) throws ApiException {
        String idConta = texto(venda, "idcontamesa");
        if (idConta != null && !idConta.isEmpty()) {
            JsonObject conta = contasPorId.get(idConta);
            if (conta != null) {
                PagamentosResumo daConta = extrairPagamentosPdv(conta);
                if (daConta.total.compareTo(BigDecimal.ZERO) > 0
                        || temAlgumMeio(daConta)) {
                    return daConta;
                }
            }
        }

        PagamentosResumo daVenda = extrairPagamentosPdv(venda);
        if (temAlgumMeio(daVenda) || daVenda.total.compareTo(BigDecimal.ZERO) > 0) {
            // Se só veio valortotal sem meios, tenta ratear pelo total informado
            if (!temAlgumMeio(daVenda) && daVenda.total.compareTo(BigDecimal.ZERO) > 0) {
                daVenda.dinheiro = daVenda.total;
            }
            return daVenda;
        }

        String idVenda = texto(venda, "id");
        BigDecimal totalItens = somarItensVenda(idVenda);
        PagamentosResumo resumo = PagamentosResumo.vazio();
        resumo.dinheiro = totalItens;
        resumo.total = totalItens;
        return resumo;
    }

    private static PagamentosResumo extrairPagamentosPdv(JsonObject obj) {
        BigDecimal dinheiroBruto = decimal(obj, "valordinheiro");
        BigDecimal troco = decimal(obj, "valortroco");
        BigDecimal cartao = decimal(obj, "valorcartaocredito")
                .add(decimal(obj, "valorcartaodebito"))
                .add(decimal(obj, "valorcartao"));
        BigDecimal pix = decimal(obj, "valorpix");
        BigDecimal prepago = decimal(obj, "valorprepago");
        BigDecimal dinheiro = dinheiroBruto.subtract(troco).max(BigDecimal.ZERO);
        BigDecimal totalInformado = decimal(obj, "valortotal");
        BigDecimal somaMeios = dinheiro.add(cartao).add(pix).add(prepago);
        BigDecimal total = totalInformado.compareTo(BigDecimal.ZERO) > 0
                ? totalInformado
                : somaMeios;

        PagamentosResumo resumo = new PagamentosResumo();
        resumo.dinheiro = dinheiro;
        resumo.cartao = cartao;
        resumo.pix = pix;
        resumo.prepago = prepago;
        resumo.total = total;
        return resumo;
    }

    private static PagamentosResumo extrairPagamentosDav(JsonObject obj) {
        BigDecimal dinheiro = decimal(obj, "dinheiro");
        BigDecimal pix = decimal(obj, "pix");
        BigDecimal cartao = decimal(obj, "posavista")
                .add(decimal(obj, "avista"))
                .add(decimal(obj, "cartao"));
        BigDecimal prepago = decimal(obj, "prepago");
        BigDecimal totalInformado = decimal(obj, "valor");
        BigDecimal somaMeios = dinheiro.add(cartao).add(pix).add(prepago);
        BigDecimal total = totalInformado.compareTo(BigDecimal.ZERO) > 0
                ? totalInformado
                : somaMeios;

        PagamentosResumo resumo = new PagamentosResumo();
        resumo.dinheiro = dinheiro;
        resumo.cartao = cartao;
        resumo.pix = pix;
        resumo.prepago = prepago;
        resumo.total = total;
        if (!temAlgumMeio(resumo) && total.compareTo(BigDecimal.ZERO) > 0) {
            resumo.dinheiro = total;
        }
        return resumo;
    }

    private static boolean temAlgumMeio(PagamentosResumo resumo) {
        if (resumo == null) {
            return false;
        }
        return resumo.dinheiro.compareTo(BigDecimal.ZERO) > 0
                || resumo.cartao.compareTo(BigDecimal.ZERO) > 0
                || resumo.pix.compareTo(BigDecimal.ZERO) > 0
                || resumo.prepago.compareTo(BigDecimal.ZERO) > 0;
    }

    private BigDecimal somarItensVenda(String idVenda) throws ApiException {
        if (idVenda == null || idVenda.isEmpty()) {
            return BigDecimal.ZERO;
        }
        List<VendaItemDetalheDto> itens = listarItensVendaPdv(idVenda);
        BigDecimal total = BigDecimal.ZERO;
        for (VendaItemDetalheDto item : itens) {
            total = total.add(MoneyFormat.parse(item.precototal));
        }
        return total.setScale(2, RoundingMode.HALF_UP);
    }

    private static boolean estaAntesDoTurno(String dataHora, long inicioMs) {
        if (inicioMs <= 0) {
            return false;
        }
        long vendaMs = parseMillis(dataHora);
        return vendaMs > 0 && vendaMs < inicioMs;
    }

    private static String extrairDataDia(String iso) {
        if (iso == null || iso.trim().isEmpty()) {
            return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        }
        String value = iso.trim();
        if (value.length() >= 10) {
            String dia = value.substring(0, 10);
            if (dia.matches("\\d{4}-\\d{2}-\\d{2}")) {
                return dia;
            }
        }
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    private static String agoraIsoUtc() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(new Date());
    }

    private static long parseMillis(String iso) {
        if (iso == null || iso.trim().isEmpty()) {
            return 0L;
        }
        String value = iso.trim();
        // epoch millis numérico
        if (value.matches("^\\d{10,13}$")) {
            try {
                long n = Long.parseLong(value);
                return value.length() <= 10 ? n * 1000L : n;
            } catch (Exception ignored) {
            }
        }
        String[] patternsUtc = {
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
            "yyyy-MM-dd'T'HH:mm:ssXXX"
        };
        for (String pattern : patternsUtc) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat(pattern, Locale.US);
                sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date parsed = sdf.parse(value);
                if (parsed != null) {
                    return parsed.getTime();
                }
            } catch (Exception ignored) {
            }
        }
        String[] patternsLocal = {
            "yyyy-MM-dd'T'HH:mm:ss.SSS",
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd HH:mm:ss.SSS",
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-dd"
        };
        for (String pattern : patternsLocal) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat(pattern, Locale.US);
                Date parsed = sdf.parse(value);
                if (parsed != null) {
                    return parsed.getTime();
                }
            } catch (Exception ignored) {
            }
        }
        return 0L;
    }

    public List<Produto> listarAtalhosRemotos() throws ApiException {
        if (isLocal()) {
            return catalog.listarAtalhos();
        }
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
                Integer codigo = null;
                if (obj.has("codigo") && !obj.get("codigo").isJsonNull()) {
                    try {
                        codigo = obj.get("codigo").getAsInt();
                    } catch (Exception ignored) {
                    }
                }
                produtos.add(new Produto(
                        id,
                        descricao,
                        decimal(obj, "preco"),
                        texto(obj, "unidademedida"),
                        texto(obj, "idunidademedida"),
                        codigo,
                        texto(obj, "imagem"),
                        texto(obj, "caminhoimagem"),
                        flag(obj, "espizza")));
            }
        }
        return produtos;
    }

    public void sincronizarAtalhos(List<String> idsProdutos) throws ApiException {
        if (isLocal()) {
            return;
        }
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
        return criarVendaPdvRapida(itens, meio, null, null, null);
    }

    public VendaResultadoDto criarVendaPdvRapida(
            List<ItemCarrinho> itens, MeioPagamento meio, String identidade) throws ApiException {
        return criarVendaPdvRapida(itens, meio, identidade, null, null);
    }

    public VendaResultadoDto criarVendaPdvRapida(
            List<ItemCarrinho> itens,
            MeioPagamento meio,
            String identidade,
            String nomeCliente,
            String cnpjCpfCliente)
            throws ApiException {
        return criarVendaPdvRapida(
                itens,
                lancamentoUnico(meio, totalItens(itens)),
                BigDecimal.ZERO,
                identidade,
                nomeCliente,
                cnpjCpfCliente);
    }

    public VendaResultadoDto criarVendaPdvRapida(
            List<ItemCarrinho> itens,
            List<LancamentoPagamento> lancamentos,
            BigDecimal troco,
            String identidade,
            String nomeCliente,
            String cnpjCpfCliente)
            throws ApiException {
        if (itens == null || itens.isEmpty()) {
            throw new ApiException("Carrinho vazio");
        }
        PagamentosMisto.ResultadoFechamento fechamento;
        try {
            fechamento = PagamentosMisto.validarFechamento(totalItens(itens), lancamentos, troco);
        } catch (IllegalArgumentException e) {
            throw new ApiException(e.getMessage());
        }
        if (isLocal()) {
            return criarVendaRapidaLocal(itens, fechamento.efetivos, fechamento.troco);
        }
        if (!prefsStore.isEmitirNfcePos()) {
            return criarPedidoDavPos(
                    itens, fechamento.efetivos, fechamento.troco, identidade, nomeCliente, cnpjCpfCliente);
        }
        String empresaId = prefsStore.getEmpresaId();
        String userId = prefsStore.getUserId();
        if (empresaId == null || userId == null) {
            throw new ApiException("Sessão ou empresa inválida");
        }

        BigDecimal total = totalItens(itens);
        String totalStr = total.toPlainString();

        JsonObject vendaBody = new JsonObject();
        vendaBody.addProperty("idempresa", empresaId);
        vendaBody.addProperty("numeropdv", prefsStore.getNumeroPdv());
        vendaBody.addProperty("usuarioquefechouvenda", userId);
        // 2 = origem POS (app); 1 = balcão web/gourmet; 0 = não local
        vendaBody.addProperty("vendalocal", 2);
        vendaBody.addProperty("valortotal", totalStr);
        aplicarTotaisPagamento(vendaBody, fechamento.efetivos, fechamento.troco);
        vendaBody.add("pagamentos", PagamentosMisto.toJsonArray(fechamento.efetivos));
        if (identidade != null && !identidade.trim().isEmpty()) {
            vendaBody.addProperty("identidade", identidade.trim());
        }

        JsonObject vendaJson = postJson("/vendas-pdv-gourmet", vendaBody.toString(), true);
        String idVenda = texto(vendaJson, "id");
        if (idVenda == null) {
            throw new ApiException("Venda criada sem ID");
        }

        for (ItemCarrinho item : itens) {
            JsonObject itemBody = new JsonObject();
            itemBody.addProperty("idempresa", empresaId);
            itemBody.addProperty("idvenda", idVenda);
            itemBody.addProperty("idproduto", item.getProdutoFiscal().getId());
            itemBody.addProperty("quantidade", item.getQuantidade().toPlainString());
            itemBody.addProperty("precounitario", item.getPrecoUnitario().toPlainString());
            itemBody.addProperty("precototal", item.getSubtotal().toPlainString());
            itemBody.addProperty("precopromocao", "0");
            itemBody.addProperty("precoalterado", "0");
            itemBody.addProperty("descricao", item.getDescricaoExibicao());
            postJson("/vendas-pdv-item", itemBody.toString(), true);
        }

        JsonObject baixaBody = new JsonObject();
        baixaBody.addProperty("idempresa", empresaId);
        baixaBody.addProperty("idvenda", idVenda);
        JsonArray itensBaixa = new JsonArray();
        for (ItemCarrinho item : itens) {
            JsonObject i = new JsonObject();
            i.addProperty("idproduto", item.getProdutoFiscal().getId());
            i.addProperty("quantidade", item.getQuantidade().toPlainString());
            i.addProperty("precounitario", item.getPrecoUnitario().toPlainString());
            i.addProperty("nomeproduto", item.getDescricaoExibicao());
            itensBaixa.add(i);
        }
        baixaBody.add("itens", itensBaixa);
        JsonObject pags = new JsonObject();
        pags.addProperty("valortotal", totalStr);
        aplicarTotaisPagamento(pags, fechamento.efetivos, fechamento.troco);
        baixaBody.add("pagamentos", pags);

        JsonObject baixaJson = postJson("/estoque/baixa-venda", baixaBody.toString(), true);

        VendaResultadoDto resultado = new VendaResultadoDto();
        resultado.idVenda = idVenda;
        resultado.codigo = texto(vendaJson, "codigo");
        if (resultado.codigo == null && vendaJson.has("codigo") && !vendaJson.get("codigo").isJsonNull()) {
            resultado.codigo = String.valueOf(vendaJson.get("codigo").getAsLong());
        }
        resultado.pedidoDav = false;
        aplicarResultadoEmissaoNfce(
                resultado, baixaJson, itens, totalStr, PagamentosMisto.rotulo(fechamento.efetivos));
        return resultado;
    }

    /**
     * Fecha conta de mesa no mesmo fluxo do Gourmet: PUT status fechado → venda PDV → itens → baixa/NFC-e.
     */
    public VendaResultadoDto fecharContaMesa(String idConta, MeioPagamento meio) throws ApiException {
        return fecharContaMesa(idConta, meio, null);
    }

    public VendaResultadoDto fecharContaMesa(String idConta, MeioPagamento meio, String identidade)
            throws ApiException {
        return fecharContaMesa(idConta, null, null, identidade, meio);
    }

    public VendaResultadoDto fecharContaMesa(
            String idConta,
            List<LancamentoPagamento> lancamentos,
            BigDecimal troco,
            String identidade)
            throws ApiException {
        return fecharContaMesa(idConta, lancamentos, troco, identidade, null);
    }

    private VendaResultadoDto fecharContaMesa(
            String idConta,
            List<LancamentoPagamento> lancamentos,
            BigDecimal troco,
            String identidade,
            MeioPagamento meioLegado)
            throws ApiException {
        if (idConta == null || idConta.isEmpty()) {
            throw new ApiException("Conta da mesa inválida");
        }
        if (isLocal()) {
            if (lancamentos != null && !lancamentos.isEmpty()) {
                return mapearResultadoFiscalPdv(
                        localPdv.fecharConta(idConta, PagamentosMisto.toJsonArray(lancamentos), troco));
            }
            if (meioLegado == null) {
                throw new ApiException("Informe ao menos um lançamento de pagamento");
            }
            return mapearResultadoFiscalPdv(localPdv.fecharConta(idConta, meioLegado.name()));
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

        BigDecimal total = totalItens(itens);
        List<LancamentoPagamento> pagsLista = lancamentos != null && !lancamentos.isEmpty()
                ? lancamentos
                : lancamentoUnico(meioLegado != null ? meioLegado : MeioPagamento.DINHEIRO, total);
        PagamentosMisto.ResultadoFechamento fechamento;
        try {
            fechamento = PagamentosMisto.validarFechamento(total, pagsLista, troco);
        } catch (IllegalArgumentException e) {
            throw new ApiException(e.getMessage());
        }
        String totalStr = total.toPlainString();
        String zero = "0";

        JsonObject contaBody = new JsonObject();
        contaBody.addProperty("status", 2);
        contaBody.addProperty("desconto", zero);
        contaBody.addProperty("valortaxaservico", zero);
        contaBody.addProperty("valorcouverartistico", zero);
        contaBody.addProperty("valortotal", totalStr);
        contaBody.addProperty("valorpendente", zero);
        aplicarTotaisPagamento(contaBody, fechamento.efetivos, fechamento.troco);
        contaBody.addProperty("usuarioquefechouconta", userId);
        if (identidade != null && !identidade.trim().isEmpty()) {
            contaBody.addProperty("idcliente", identidade.trim());
        }
        putJson("/contas-mesa/" + idConta, contaBody.toString());

        JsonObject vendaBody = new JsonObject();
        vendaBody.addProperty("idempresa", empresaId);
        vendaBody.addProperty("idcontamesa", idConta);
        vendaBody.addProperty("numeropdv", prefsStore.getNumeroPdv());
        vendaBody.addProperty("usuarioquefechouvenda", userId);
        // 2 = origem POS (app); 1 = balcão web/gourmet; 0 = não local
        vendaBody.addProperty("vendalocal", 2);
        vendaBody.addProperty("valortotal", totalStr);
        aplicarTotaisPagamento(vendaBody, fechamento.efetivos, fechamento.troco);
        vendaBody.add("pagamentos", PagamentosMisto.toJsonArray(fechamento.efetivos));
        if (identidade != null && !identidade.trim().isEmpty()) {
            vendaBody.addProperty("identidade", identidade.trim());
        }

        JsonObject vendaJson = postJson("/vendas-pdv-gourmet", vendaBody.toString(), true);
        String idVenda = texto(vendaJson, "id");
        if (idVenda == null) {
            throw new ApiException("Venda criada sem ID");
        }

        for (ItemCarrinho item : itens) {
            JsonObject itemBody = new JsonObject();
            itemBody.addProperty("idempresa", empresaId);
            itemBody.addProperty("idvenda", idVenda);
            itemBody.addProperty("idproduto", item.getProdutoFiscal().getId());
            itemBody.addProperty("quantidade", item.getQuantidade().toPlainString());
            itemBody.addProperty("precounitario", item.getPrecoUnitario().toPlainString());
            itemBody.addProperty("precototal", item.getSubtotal().toPlainString());
            itemBody.addProperty("precopromocao", "0");
            itemBody.addProperty("precoalterado", "0");
            itemBody.addProperty("descricao", item.getDescricaoExibicao());
            postJson("/vendas-pdv-item", itemBody.toString(), true);
        }

        JsonObject baixaBody = new JsonObject();
        baixaBody.addProperty("idempresa", empresaId);
        baixaBody.addProperty("idvenda", idVenda);
        JsonArray itensBaixa = new JsonArray();
        for (ItemCarrinho item : itens) {
            JsonObject i = new JsonObject();
            i.addProperty("idproduto", item.getProdutoFiscal().getId());
            i.addProperty("quantidade", item.getQuantidade().toPlainString());
            i.addProperty("precounitario", item.getPrecoUnitario().toPlainString());
            i.addProperty("nomeproduto", item.getDescricaoExibicao());
            itensBaixa.add(i);
        }
        baixaBody.add("itens", itensBaixa);
        JsonObject pags = new JsonObject();
        pags.addProperty("valortotal", totalStr);
        aplicarTotaisPagamento(pags, fechamento.efetivos, fechamento.troco);
        baixaBody.add("pagamentos", pags);

        JsonObject baixaJson = postJson("/estoque/baixa-venda", baixaBody.toString(), true);

        VendaResultadoDto resultado = new VendaResultadoDto();
        resultado.idVenda = idVenda;
        resultado.codigo = texto(vendaJson, "codigo");
        if (resultado.codigo == null && vendaJson.has("codigo") && !vendaJson.get("codigo").isJsonNull()) {
            resultado.codigo = String.valueOf(vendaJson.get("codigo").getAsLong());
        }
        resultado.pedidoDav = false;
        aplicarResultadoEmissaoNfce(
                resultado, baixaJson, itens, totalStr, PagamentosMisto.rotulo(fechamento.efetivos));
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
            String meio) {
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
            String meio) {
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
                    .append(item.getDescricaoExibicao())
                    .append(" ")
                    .append(item.getSubtotal().toPlainString())
                    .append("\n");
        }
        sb.append("--------------------------------\n");
        sb.append("TOTAL R$ ").append(total).append("\n");
        sb.append("Pagamento: ").append(meio).append("\n");
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
        return criarPedidoDavPos(itens, meio, null, null, null);
    }

    public VendaResultadoDto criarPedidoDavPos(
            List<ItemCarrinho> itens,
            MeioPagamento meio,
            String identidade,
            String nomeCliente,
            String cnpjCpfCliente)
            throws ApiException {
        return criarPedidoDavPos(
                itens,
                lancamentoUnico(meio, totalItens(itens)),
                BigDecimal.ZERO,
                identidade,
                nomeCliente,
                cnpjCpfCliente);
    }

    private VendaResultadoDto criarPedidoDavPos(
            List<ItemCarrinho> itens,
            List<LancamentoPagamento> lancamentos,
            BigDecimal troco,
            String identidade,
            String nomeCliente,
            String cnpjCpfCliente)
            throws ApiException {
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId == null) {
            throw new ApiException("Empresa não selecionada");
        }

        BigDecimal total = totalItens(itens);
        PagamentosMisto.ResultadoFechamento fechamento;
        try {
            fechamento = PagamentosMisto.validarFechamento(total, lancamentos, troco);
        } catch (IllegalArgumentException e) {
            throw new ApiException(e.getMessage());
        }
        String totalStr = total.toPlainString();
        PagamentosMisto.Totais totais = fechamento.totais;

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
        if (totais.dinheiro.compareTo(BigDecimal.ZERO) > 0) {
            davBody.addProperty("dinheiro", MoneyFormat.toApi(totais.dinheiro));
        }
        if (totais.pix.compareTo(BigDecimal.ZERO) > 0) {
            davBody.addProperty("pix", MoneyFormat.toApi(totais.pix));
        }
        if (totais.cartao.compareTo(BigDecimal.ZERO) > 0) {
            davBody.addProperty("posavista", MoneyFormat.toApi(totais.cartao));
        }
        if (identidade != null && !identidade.trim().isEmpty()) {
            davBody.addProperty("idcliente", identidade.trim());
        }
        if (nomeCliente != null && !nomeCliente.trim().isEmpty()) {
            davBody.addProperty("nomecliente", nomeCliente.trim());
        }
        if (cnpjCpfCliente != null && !cnpjCpfCliente.trim().isEmpty()) {
            davBody.addProperty("cnpjcpfcliente", cnpjCpfCliente.trim());
        }

        JsonObject davJson = postJson("/davs", davBody.toString(), true);
        String idDav = texto(davJson, "id");
        if (idDav == null) {
            throw new ApiException("Pedido criado sem ID");
        }

        for (ItemCarrinho item : itens) {
            JsonObject itemBody = new JsonObject();
            itemBody.addProperty("idproduto", item.getProdutoFiscal().getId());
            itemBody.addProperty("quantidade", item.getQuantidade().toPlainString());
            itemBody.addProperty("preco", item.getPrecoUnitario().toPlainString());
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
        resultado.comprovanteTexto =
                montarComprovanteDav(itens, totalStr, PagamentosMisto.rotulo(fechamento.efetivos), resultado);
        return resultado;
    }

    private String montarComprovanteDav(
            List<ItemCarrinho> itens, String total, String meio, VendaResultadoDto resultado) {
        StringBuilder sb = new StringBuilder();
        sb.append("MAIS GESTAO - POS\n");
        sb.append("PEDIDO (DAV) - NAO FISCAL\n");
        sb.append("----------------\n");
        for (ItemCarrinho item : itens) {
            sb.append(item.getQuantidade().toPlainString())
                    .append("x ")
                    .append(item.getDescricaoExibicao())
                    .append(" ")
                    .append(item.getSubtotal().toPlainString())
                    .append("\n");
        }
        sb.append("----------------\n");
        sb.append("TOTAL: ").append(total).append("\n");
        sb.append("PAGTO: ").append(meio).append("\n");
        if (resultado.codigo != null) {
            sb.append("PEDIDO: ").append(resultado.codigo).append("\n");
        }
        sb.append("Retaguarda: Pedidos da maquininha\n");
        return sb.toString();
    }

    private String montarComprovanteNaoFiscal(
            List<ItemCarrinho> itens, String total, String meio, VendaResultadoDto resultado) {
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
                    .append(item.getDescricaoExibicao())
                    .append(" ")
                    .append(item.getSubtotal().toPlainString())
                    .append("\n");
        }
        sb.append("----------------\n");
        sb.append("TOTAL: ").append(total).append("\n");
        sb.append("PAGTO: ").append(meio).append("\n");
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

    public List<ContaMesaDto> listarMesasGrade() throws ApiException {
        if (isLocal()) {
            List<ContaMesaDto> mesas = new ArrayList<>();
            JsonArray data = arrayData(localPdv.listarMesas());
            for (JsonElement element : data) {
                if (!element.isJsonObject()) {
                    continue;
                }
                JsonObject obj = element.getAsJsonObject();
                Integer numero = inteiro(obj, "numero");
                if (numero == null) {
                    continue;
                }
                ContaMesaDto mesa = new ContaMesaDto();
                mesa.numeromesa = numero;
                if ("ocupada".equals(texto(obj, "status"))) {
                    String idConta = texto(obj, "idconta");
                    if (idConta != null && !idConta.isEmpty()) {
                        mesa.id = idConta;
                        mesa.status = 1;
                        mesa.valortotal = textoOuNumero(obj, "valortotal");
                        mesa.observacao = texto(obj, "nomecliente");
                    }
                }
                mesas.add(mesa);
            }
            mesas.sort((a, b) -> Integer.compare(
                    a.numeromesa == null ? 0 : a.numeromesa,
                    b.numeromesa == null ? 0 : b.numeromesa));
            if (mesas.isEmpty()) {
                int qtd = prefsStore.getQuantidadeMesas();
                for (int i = 1; i <= qtd; i++) {
                    ContaMesaDto mesa = new ContaMesaDto();
                    mesa.numeromesa = i;
                    mesas.add(mesa);
                }
            }
            return mesas;
        }
        List<ContaMesaDto> abertas = listarMesasAbertas();
        Map<Integer, ContaMesaDto> porNumero = new HashMap<>();
        for (ContaMesaDto mesa : abertas) {
            if (mesa.numeromesa != null) {
                porNumero.put(mesa.numeromesa, mesa);
            }
        }
        int qtd = prefsStore.getQuantidadeMesas();
        List<ContaMesaDto> grade = new ArrayList<>();
        for (int i = 1; i <= qtd; i++) {
            ContaMesaDto ocupada = porNumero.get(i);
            if (ocupada != null) {
                grade.add(ocupada);
            } else {
                ContaMesaDto livre = new ContaMesaDto();
                livre.numeromesa = i;
                grade.add(livre);
            }
        }
        return grade;
    }

    public List<ContaMesaDto> listarMesasAbertas() throws ApiException {
        if (isLocal()) {
            List<ContaMesaDto> mesas = new ArrayList<>();
            JsonArray data = arrayData(localPdv.listarMesas());
            for (JsonElement element : data) {
                if (!element.isJsonObject()) {
                    continue;
                }
                JsonObject obj = element.getAsJsonObject();
                if (!"ocupada".equals(texto(obj, "status"))) {
                    continue;
                }
                String idConta = texto(obj, "idconta");
                if (idConta == null || idConta.isEmpty()) {
                    continue;
                }
                ContaMesaDto mesa = new ContaMesaDto();
                mesa.id = idConta;
                mesa.numeromesa = inteiro(obj, "numero");
                mesa.status = 1;
                mesa.valortotal = textoOuNumero(obj, "valortotal");
                mesa.observacao = texto(obj, "nomecliente");
                mesas.add(mesa);
            }
            return mesas;
        }
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

    public void enviarPedidoMesa(String idConta, String clientOrderId, List<SacolaLinha> linhas)
            throws ApiException {
        if (!isLocal()) {
            throw new ApiException("Envio de pedido só no modo PDV local");
        }
        if (idConta == null || idConta.isEmpty()) {
            throw new ApiException("Conta inválida");
        }
        if (linhas == null || linhas.isEmpty()) {
            throw new ApiException("Pedido sem itens");
        }
        JsonArray itens = new JsonArray();
        for (SacolaLinha linha : linhas) {
            JsonObject i = new JsonObject();
            i.addProperty("idproduto", linha.produto.getId());
            i.addProperty("quantidade", linha.quantidade.doubleValue());
            if (linha.produtoMeio != null) {
                i.addProperty("idprodutomeio", linha.produtoMeio.getId());
            }
            if (linha.observacao != null && !linha.observacao.trim().isEmpty()) {
                i.addProperty("observacao", linha.observacao.trim());
            }
            itens.add(i);
        }
        JsonObject body = new JsonObject();
        body.addProperty("clientOrderId", clientOrderId);
        body.add("itens", itens);
        localPdv.enviarPedido(idConta, body);
    }

    public List<PedidoFilaDto> listarPedidosFila(boolean pendentes) throws ApiException {
        if (!isLocal()) {
            return new ArrayList<>();
        }
        JsonArray data = arrayData(localPdv.listarPedidos(pendentes));
        List<PedidoFilaDto> itens = new ArrayList<>();
        for (JsonElement element : data) {
            if (!element.isJsonObject()) {
                continue;
            }
            JsonObject obj = element.getAsJsonObject();
            PedidoFilaDto dto = new PedidoFilaDto();
            dto.id = texto(obj, "id");
            dto.idconta = texto(obj, "idconta");
            dto.numeroMesa = inteiro(obj, "numero_mesa");
            dto.nomecliente = texto(obj, "nomecliente");
            dto.descricao = texto(obj, "descricao");
            dto.quantidade = textoOuNumero(obj, "quantidade");
            dto.observacao = texto(obj, "observacao");
            dto.status = texto(obj, "status");
            dto.criadoem = texto(obj, "criadoem");
            if (dto.id != null) {
                itens.add(dto);
            }
        }
        return itens;
    }

    public void marcarPedidoEntregue(String id) throws ApiException {
        if (!isLocal()) {
            return;
        }
        localPdv.marcarPedidoEntregue(id);
    }

    public void limparFilaPedidos() throws ApiException {
        if (!isLocal()) {
            return;
        }
        localPdv.limparFilaPedidos();
    }

    public ContaMesaDto abrirMesa(int numeroMesa) throws ApiException {
        return abrirMesa(numeroMesa, null);
    }

    public ContaMesaDto abrirMesa(int numeroMesa, String nomeCliente) throws ApiException {
        if (isLocal()) {
            ContaMesaDto mesa = mapearContaLocal(localPdv.abrirMesa(numeroMesa, nomeCliente));
            if (mesa == null || mesa.id == null) {
                throw new ApiException("Não foi possível abrir a mesa");
            }
            return mesa;
        }
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
        if (nomeCliente != null && !nomeCliente.trim().isEmpty()) {
            body.addProperty("observacao", nomeCliente.trim());
        }
        JsonObject response = postJson("/contas-mesa", body.toString(), true);
        ContaMesaDto mesa = gson.fromJson(response, ContaMesaDto.class);
        if (mesa == null || mesa.id == null) {
            throw new ApiException("Não foi possível abrir a mesa");
        }
        return mesa;
    }

    public ContaMesaDto atualizarNomeClienteMesa(String idConta, String nomeCliente) throws ApiException {
        if (isLocal()) {
            ContaMesaDto mesa = mapearContaLocal(localPdv.atualizarNomeConta(idConta, nomeCliente));
            if (mesa == null || mesa.id == null) {
                throw new ApiException("Não foi possível atualizar o nome");
            }
            return mesa;
        }
        if (idConta == null || idConta.isEmpty()) {
            throw new ApiException("Conta inválida");
        }
        JsonObject body = new JsonObject();
        body.addProperty("observacao", nomeCliente == null ? "" : nomeCliente.trim());
        JsonObject response = putJson("/contas-mesa/" + idConta, body.toString());
        JsonObject obj = response;
        if (response.has("data") && response.get("data").isJsonObject()) {
            obj = response.getAsJsonObject("data");
        }
        ContaMesaDto mesa = gson.fromJson(obj, ContaMesaDto.class);
        if (mesa == null || mesa.id == null) {
            mesa = new ContaMesaDto();
            mesa.id = idConta;
            mesa.observacao = nomeCliente == null ? "" : nomeCliente.trim();
        }
        return mesa;
    }

    public List<ContaMesaItemDto> listarItensMesa(String idContaMesa) throws ApiException {
        if (isLocal()) {
            List<ContaMesaItemDto> itens = new ArrayList<>();
            JsonObject conta = localPdv.obterConta(idContaMesa);
            JsonArray data = conta.getAsJsonArray("itens");
            if (data == null) {
                return itens;
            }
            for (JsonElement element : data) {
                if (!element.isJsonObject()) {
                    continue;
                }
                ContaMesaItemDto item = mapearItemContaLocal(element.getAsJsonObject());
                if (item != null && item.id != null) {
                    itens.add(item);
                }
            }
            return itens;
        }
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
        if (isLocal()) {
            String qty = quantidade == null || quantidade.trim().isEmpty() ? "1" : quantidade.trim();
            JsonObject body = new JsonObject();
            body.addProperty("idproduto", produto.getId());
            body.addProperty("descricao", produto.getDescricao());
            body.addProperty("quantidade", parseQuantidade(qty));
            body.addProperty("precounitario", produto.getPreco().doubleValue());
            JsonObject conta = localPdv.adicionarItem(idContaMesa, body);
            JsonArray itens = conta.getAsJsonArray("itens");
            if (itens == null || itens.size() == 0) {
                throw new ApiException("Não foi possível lançar o item");
            }
            ContaMesaItemDto item = mapearItemContaLocal(itens.get(itens.size() - 1).getAsJsonObject());
            if (item == null || item.id == null) {
                throw new ApiException("Não foi possível lançar o item");
            }
            return item;
        }
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
        if (isLocal()) {
            throw new ApiException("Remova o item no PDV desktop");
        }
        deleteJson("/contas-mesa-item/" + idItem);
    }

    public PaginaVendas listarVendasPdv(
            String dataInicio, String dataFim, Integer numeropdv, int page, int limit)
            throws ApiException {
        if (isLocal()) {
            int pagina = Math.max(1, page);
            int lim = Math.max(1, Math.min(100, limit));
            List<VendaResumoDto> todas = new ArrayList<>();
            JsonArray data = arrayData(localPdv.listarVendas());
            for (JsonElement element : data) {
                if (!element.isJsonObject()) {
                    continue;
                }
                VendaResumoDto venda = mapearVendaLocal(element.getAsJsonObject());
                if (venda == null) {
                    continue;
                }
                if (numeropdv != null && venda.numeropdv != null && !numeropdv.equals(venda.numeropdv)) {
                    continue;
                }
                todas.add(venda);
            }
            int total = todas.size();
            int from = Math.min((pagina - 1) * lim, total);
            int to = Math.min(from + lim, total);
            int totalPages = total == 0 ? 0 : (int) Math.ceil(total / (double) lim);
            return new PaginaVendas(new ArrayList<>(todas.subList(from, to)), pagina, lim, total, totalPages);
        }
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId == null) {
            throw new ApiException("Empresa não selecionada");
        }
        int pagina = Math.max(1, page);
        int lim = Math.max(1, Math.min(100, limit));
        StringBuilder path = new StringBuilder("/vendas-pdv-gourmet?idempresa=")
                .append(empresaId)
                .append("&page=")
                .append(pagina)
                .append("&limit=")
                .append(lim);
        if (dataInicio != null && !dataInicio.isEmpty()) {
            path.append("&dataInicio=").append(encode(dataInicio));
        }
        if (dataFim != null && !dataFim.isEmpty()) {
            path.append("&dataFim=").append(encode(dataFim));
        }
        if (numeropdv != null) {
            path.append("&numeropdv=").append(numeropdv);
        }
        JsonObject response = getJson(path.toString());
        List<VendaResumoDto> vendas = new ArrayList<>();
        JsonArray data = response.getAsJsonArray("data");
        if (data != null) {
            for (JsonElement element : data) {
                if (!element.isJsonObject()) {
                    continue;
                }
                VendaResumoDto venda = mapearVendaPdv(element.getAsJsonObject());
                if (venda != null) {
                    vendas.add(venda);
                }
            }
        }
        return mapearPaginacao(vendas, response, pagina, lim);
    }

    public PaginaVendas listarDavsPos(
            String dataInicio, String dataFim, Integer status, int page, int limit)
            throws ApiException {
        int pagina = Math.max(1, page);
        int lim = Math.max(1, Math.min(100, limit));
        if (isLocal()) {
            return new PaginaVendas(new ArrayList<>(), pagina, lim, 0, 0);
        }
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId == null) {
            throw new ApiException("Empresa não selecionada");
        }
        StringBuilder path = new StringBuilder("/davs?idempresa=")
                .append(empresaId)
                .append("&origem=POS")
                .append("&page=")
                .append(pagina)
                .append("&limit=")
                .append(lim);
        if (dataInicio != null && !dataInicio.isEmpty()) {
            path.append("&dataInicio=").append(encode(dataInicio));
        }
        if (dataFim != null && !dataFim.isEmpty()) {
            path.append("&dataFim=").append(encode(dataFim));
        }
        if (status != null) {
            path.append("&status=").append(status);
        }
        JsonObject response = getJson(path.toString());
        List<VendaResumoDto> vendas = new ArrayList<>();
        JsonArray data = response.getAsJsonArray("data");
        if (data != null) {
            for (JsonElement element : data) {
                if (!element.isJsonObject()) {
                    continue;
                }
                VendaResumoDto venda = mapearDavPos(element.getAsJsonObject());
                if (venda != null) {
                    vendas.add(venda);
                }
            }
        }
        return mapearPaginacao(vendas, response, pagina, lim);
    }

    public List<VendaItemDetalheDto> listarItensVendaPdv(String idVenda) throws ApiException {
        if (idVenda == null || idVenda.isEmpty()) {
            throw new ApiException("Venda inválida");
        }
        if (isLocal()) {
            List<VendaItemDetalheDto> itens = new ArrayList<>();
            JsonObject venda = localPdv.obterVenda(idVenda);
            JsonArray data = venda.getAsJsonArray("itens");
            if (data == null) {
                return itens;
            }
            for (JsonElement element : data) {
                if (!element.isJsonObject()) {
                    continue;
                }
                JsonObject obj = element.getAsJsonObject();
                VendaItemDetalheDto item = new VendaItemDetalheDto();
                item.idproduto = texto(obj, "idproduto");
                item.nome = texto(obj, "descricao");
                if (item.nome == null || item.nome.isEmpty()) {
                    item.nome = "Item";
                }
                item.quantidade = textoOuNumero(obj, "quantidade");
                item.precounitario = textoOuNumero(obj, "precounitario");
                item.precototal = textoOuNumero(obj, "precototal");
                itens.add(item);
            }
            return itens;
        }
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId == null) {
            throw new ApiException("Empresa não selecionada");
        }
        String path = "/vendas-pdv-item?idempresa="
                + empresaId
                + "&idvenda="
                + encode(idVenda)
                + "&page=1&limit=100";
        JsonObject response = getJson(path);
        List<VendaItemDetalheDto> itens = new ArrayList<>();
        JsonArray data = response.getAsJsonArray("data");
        if (data == null) {
            return itens;
        }
        for (JsonElement element : data) {
            if (!element.isJsonObject()) {
                continue;
            }
            JsonObject obj = element.getAsJsonObject();
            VendaItemDetalheDto item = new VendaItemDetalheDto();
            item.id = texto(obj, "id");
            item.idproduto = texto(obj, "idproduto");
            item.quantidade = textoOuNumero(obj, "quantidade");
            item.precounitario = textoOuNumero(obj, "precounitario");
            item.precototal = textoOuNumero(obj, "precototal");
            item.nome = resolverNomeProduto(item.idproduto);
            itens.add(item);
        }
        return itens;
    }

    public List<VendaItemDetalheDto> listarItensDav(String idDav) throws ApiException {
        if (idDav == null || idDav.isEmpty()) {
            throw new ApiException("Pedido inválido");
        }
        if (isLocal()) {
            return new ArrayList<>();
        }
        JsonObject response = getJson("/davs/" + idDav + "/itens");
        List<VendaItemDetalheDto> itens = new ArrayList<>();
        JsonArray data = response.getAsJsonArray("data");
        if (data == null) {
            return itens;
        }
        for (JsonElement element : data) {
            if (!element.isJsonObject()) {
                continue;
            }
            JsonObject obj = element.getAsJsonObject();
            VendaItemDetalheDto item = new VendaItemDetalheDto();
            item.id = texto(obj, "id");
            item.idproduto = texto(obj, "idproduto");
            item.nome = texto(obj, "nomeproduto");
            if (item.nome == null || item.nome.isEmpty()) {
                item.nome = "Item";
            }
            item.quantidade = textoOuNumero(obj, "quantidade");
            item.precounitario = textoOuNumero(obj, "preco");
            if (item.precounitario == null) {
                item.precounitario = textoOuNumero(obj, "precounitario");
            }
            item.precototal = textoOuNumero(obj, "total");
            if (item.precototal == null) {
                item.precototal = textoOuNumero(obj, "precototal");
            }
            itens.add(item);
        }
        return itens;
    }

    public String buscarTextoCupomNfce(String idNotaFiscal) throws ApiException {
        if (isLocal()) {
            throw new ApiException("Reimpressão fiscal fica no PDV desktop");
        }
        if (idNotaFiscal == null || idNotaFiscal.isEmpty()) {
            throw new ApiException("Nota fiscal inválida");
        }
        JsonObject cupom = getJson("/nfce/" + idNotaFiscal + "/cupom");
        if (cupom.has("data") && cupom.get("data").isJsonObject()) {
            cupom = cupom.getAsJsonObject("data");
        }
        String textoCupom = montarDanfceTextoDoCupom(cupom);
        if (textoCupom == null || textoCupom.isEmpty()) {
            throw new ApiException("Cupom NFC-e indisponível");
        }
        return textoCupom;
    }

    private String resolverNomeProduto(String idProduto) {
        if (idProduto == null || idProduto.isEmpty()) {
            return "Produto";
        }
        try {
            JsonObject response = getJson("/produtos/" + idProduto);
            JsonObject produto = response;
            if (response.has("data") && response.get("data").isJsonObject()) {
                produto = response.getAsJsonObject("data");
            }
            String descricao = texto(produto, "descricao");
            if (descricao != null && !descricao.isEmpty()) {
                return descricao;
            }
        } catch (ApiException ignored) {
        }
        return "Produto";
    }

    private PaginaVendas mapearPaginacao(
            List<VendaResumoDto> vendas, JsonObject response, int pagina, int lim) {
        int total = vendas.size();
        int totalPages = 1;
        if (response.has("paginacao") && response.get("paginacao").isJsonObject()) {
            JsonObject pag = response.getAsJsonObject("paginacao");
            if (pag.has("total") && !pag.get("total").isJsonNull()) {
                total = pag.get("total").getAsInt();
            }
            if (pag.has("totalPages") && !pag.get("totalPages").isJsonNull()) {
                totalPages = pag.get("totalPages").getAsInt();
            } else if (lim > 0) {
                totalPages = Math.max(1, (int) Math.ceil(total / (double) lim));
            }
        }
        return new PaginaVendas(vendas, pagina, lim, total, totalPages);
    }

    private VendaResumoDto mapearVendaPdv(JsonObject obj) {
        String id = texto(obj, "id");
        if (id == null) {
            return null;
        }
        VendaResumoDto venda = new VendaResumoDto();
        venda.tipo = VendaResumoDto.Tipo.PDV;
        venda.id = id;
        venda.codigo = id.length() > 8 ? id.substring(0, 8).toUpperCase(Locale.ROOT) : id.toUpperCase(Locale.ROOT);
        venda.dataHora = texto(obj, "datacriacao");
        venda.valorTotal = textoOuNumero(obj, "valortotal");
        venda.numeropdv = inteiro(obj, "numeropdv");
        venda.mesa = obj.has("idcontamesa")
                && !obj.get("idcontamesa").isJsonNull()
                && !texto(obj, "idcontamesa").isEmpty();
        Integer vendalocal = inteiro(obj, "vendalocal");
        // 2 = POS; vendas antigas do app (vendalocal=1 sem mesa) também tratamos como POS na listagem do aparelho
        venda.origemPos = (vendalocal != null && vendalocal == 2) || !venda.mesa;
        venda.idNotaFiscal = texto(obj, "idnotafiscalnfce");
        venda.pagamentosResumo = resumirPagamentosPdv(obj);
        venda.meioPagamentoLabel = venda.pagamentosResumo;
        return venda;
    }

    private VendaResumoDto mapearDavPos(JsonObject obj) {
        String id = texto(obj, "id");
        if (id == null) {
            return null;
        }
        VendaResumoDto venda = new VendaResumoDto();
        venda.tipo = VendaResumoDto.Tipo.DAV;
        venda.id = id;
        Integer codigo = inteiro(obj, "codigo");
        venda.codigo = codigo != null ? String.valueOf(codigo) : (id.length() > 8 ? id.substring(0, 8) : id);
        venda.dataHora = texto(obj, "data");
        if (venda.dataHora == null) {
            venda.dataHora = texto(obj, "datainclusao");
        }
        venda.valorTotal = textoOuNumero(obj, "valor");
        venda.nomeCliente = texto(obj, "nomecliente");
        venda.statusDav = inteiro(obj, "status");
        venda.idNotaFiscal = texto(obj, "idnfce");
        if (venda.idNotaFiscal == null) {
            venda.idNotaFiscal = texto(obj, "idnotafiscal");
        }
        venda.pagamentosResumo = resumirPagamentosDav(obj);
        venda.meioPagamentoLabel = venda.pagamentosResumo;
        venda.mesa = false;
        return venda;
    }

    private static String resumirPagamentosPdv(JsonObject obj) {
        List<String> partes = new ArrayList<>();
        adicionarPagamentoSePositivo(partes, "Dinheiro", obj, "valordinheiro");
        adicionarPagamentoSePositivo(partes, "PIX", obj, "valorpix");
        adicionarPagamentoSePositivo(partes, "Cartão", obj, "valorcartao");
        adicionarPagamentoSePositivo(partes, "Crédito", obj, "valorcartaocredito");
        adicionarPagamentoSePositivo(partes, "Débito", obj, "valorcartaodebito");
        adicionarPagamentoSePositivo(partes, "Pré-pago", obj, "valorprepago");
        if (partes.isEmpty()) {
            return "—";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < partes.size(); i++) {
            if (i > 0) {
                sb.append(" · ");
            }
            sb.append(partes.get(i));
        }
        return sb.toString();
    }

    private static String resumirPagamentosDav(JsonObject obj) {
        List<String> partes = new ArrayList<>();
        adicionarPagamentoSePositivo(partes, "Dinheiro", obj, "dinheiro");
        adicionarPagamentoSePositivo(partes, "PIX", obj, "pix");
        adicionarPagamentoSePositivo(partes, "À vista", obj, "avista");
        adicionarPagamentoSePositivo(partes, "A prazo", obj, "aprazo");
        adicionarPagamentoSePositivo(partes, "POS", obj, "posavista");
        if (partes.isEmpty()) {
            return "Pedido POS";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < partes.size(); i++) {
            if (i > 0) {
                sb.append(" · ");
            }
            sb.append(partes.get(i));
        }
        return sb.toString();
    }

    private static void adicionarPagamentoSePositivo(
            List<String> partes, String label, JsonObject obj, String key) {
        BigDecimal valor = decimal(obj, key);
        if (valor.compareTo(BigDecimal.ZERO) > 0) {
            partes.add(label);
        }
    }

    private void aplicarConfigPdv(JsonObject status) {
        if (status == null) {
            return;
        }
        prefsStore.setModeloAtendimento(texto(status, "modeloAtendimento"));
        Integer qtd = inteiro(status, "qtdMesas");
        if (qtd != null) {
            prefsStore.setQuantidadeMesas(qtd);
        }
        Integer pdv = inteiro(status, "numeropdv");
        if (pdv != null) {
            prefsStore.setNumeroPdv(pdv);
        }
    }

    private VendaResultadoDto criarVendaRapidaLocal(
            List<ItemCarrinho> itens, List<LancamentoPagamento> lancamentos, BigDecimal troco)
            throws ApiException {
        JsonArray itensJson = new JsonArray();
        for (ItemCarrinho item : itens) {
            JsonObject i = new JsonObject();
            i.addProperty("idproduto", item.getProdutoFiscal().getId());
            i.addProperty("descricao", item.getDescricaoExibicao());
            i.addProperty("quantidade", item.getQuantidade().doubleValue());
            i.addProperty("precounitario", item.getPrecoUnitario().doubleValue());
            i.addProperty("precototal", item.getSubtotal().doubleValue());
            itensJson.add(i);
        }
        JsonObject body = new JsonObject();
        body.add("itens", itensJson);
        body.add("pagamentos", PagamentosMisto.toJsonArray(lancamentos));
        if (troco != null && troco.compareTo(BigDecimal.ZERO) > 0) {
            body.addProperty("troco", troco.doubleValue());
        }
        return mapearResultadoFiscalPdv(localPdv.vendaRapida(body));
    }

    private static BigDecimal totalItens(List<ItemCarrinho> itens) {
        BigDecimal total = BigDecimal.ZERO;
        if (itens == null) {
            return total;
        }
        for (ItemCarrinho item : itens) {
            total = total.add(item.getSubtotal());
        }
        return LancamentoPagamento.arredondar(total);
    }

    private static List<LancamentoPagamento> lancamentoUnico(MeioPagamento meio, BigDecimal total) {
        List<LancamentoPagamento> lista = new ArrayList<>();
        lista.add(LancamentoPagamento.ok(meio != null ? meio : MeioPagamento.DINHEIRO, total));
        return lista;
    }

    private static void aplicarTotaisPagamento(
            JsonObject dest, List<LancamentoPagamento> lancamentos, BigDecimal troco) {
        PagamentosMisto.Totais totais = PagamentosMisto.totais(lancamentos);
        dest.addProperty("valordinheiro", MoneyFormat.toApi(totais.dinheiro));
        dest.addProperty("valorpix", MoneyFormat.toApi(totais.pix));
        dest.addProperty("valorcartaocredito", MoneyFormat.toApi(totais.cartao));
        dest.addProperty("valorcartaodebito", "0");
        dest.addProperty("valorcartao", "0");
        dest.addProperty("valorprepago", "0");
        dest.addProperty("valortroco", MoneyFormat.toApi(troco == null ? BigDecimal.ZERO : troco));
    }

    private VendaResultadoDto mapearResultadoFiscalPdv(JsonObject response) {
        JsonObject venda = response.has("venda") && response.get("venda").isJsonObject()
                ? response.getAsJsonObject("venda")
                : response;
        JsonObject fiscal = response.has("fiscal") && response.get("fiscal").isJsonObject()
                ? response.getAsJsonObject("fiscal")
                : new JsonObject();
        String modo = texto(fiscal, "modo");
        if (modo == null) {
            modo = "nao_fiscal";
        }
        VendaResultadoDto resultado = new VendaResultadoDto();
        resultado.idVenda = texto(venda, "id");
        if (resultado.idVenda != null && resultado.idVenda.length() > 8) {
            resultado.codigo = resultado.idVenda.substring(0, 8).toUpperCase(Locale.ROOT);
        } else {
            resultado.codigo = resultado.idVenda;
        }
        resultado.pedidoDav = false;
        resultado.nfceEmitida = "online".equals(modo);
        resultado.deveEmitirNfce =
                "online".equals(modo) || "contingencia".equals(modo) || "erro".equals(modo);
        resultado.sucessoFiscalCompleto = !"erro".equals(modo);
        resultado.mensagemNfce = texto(fiscal, "mensagem");
        resultado.chaveNfce = texto(fiscal, "chave");
        resultado.qrCode = texto(fiscal, "qrcode");
        resultado.cStat = texto(fiscal, "cStat");
        resultado.cupomFiscal = false;
        StringBuilder sb = new StringBuilder();
        sb.append("Modo: ").append(modo).append("\n");
        if (resultado.mensagemNfce != null) {
            sb.append(resultado.mensagemNfce).append("\n");
        }
        if (resultado.chaveNfce != null) {
            sb.append("Chave: ").append(resultado.chaveNfce).append("\n");
        }
        if (resultado.cStat != null) {
            sb.append("cStat: ").append(resultado.cStat).append("\n");
        }
        resultado.comprovanteTexto = sb.toString();
        return resultado;
    }

    private ContaMesaDto mapearContaLocal(JsonObject obj) {
        if (obj == null) {
            return null;
        }
        ContaMesaDto mesa = new ContaMesaDto();
        mesa.id = texto(obj, "id");
        mesa.numeromesa = inteiro(obj, "numero_mesa");
        if (mesa.numeromesa == null) {
            mesa.numeromesa = inteiro(obj, "numero");
        }
        String status = texto(obj, "status");
        mesa.status = "aberta".equals(status) || "ocupada".equals(status) ? 1 : 2;
        mesa.valortotal = textoOuNumero(obj, "valortotal");
        mesa.observacao = texto(obj, "nomecliente");
        return mesa;
    }

    private ContaMesaItemDto mapearItemContaLocal(JsonObject obj) {
        if (obj == null) {
            return null;
        }
        ContaMesaItemDto item = new ContaMesaItemDto();
        item.id = texto(obj, "id");
        item.idproduto = texto(obj, "idproduto");
        item.nomeproduto = texto(obj, "descricao");
        if (item.nomeproduto == null) {
            item.nomeproduto = texto(obj, "nomeproduto");
        }
        item.quantidade = textoOuNumero(obj, "quantidade");
        item.precounitario = textoOuNumero(obj, "precounitario");
        item.observacao = texto(obj, "observacao");
        return item;
    }

    private VendaResumoDto mapearVendaLocal(JsonObject obj) {
        String id = texto(obj, "id");
        if (id == null) {
            return null;
        }
        VendaResumoDto venda = new VendaResumoDto();
        venda.tipo = VendaResumoDto.Tipo.PDV;
        venda.id = id;
        venda.codigo = id.length() > 8 ? id.substring(0, 8).toUpperCase(Locale.ROOT) : id.toUpperCase(Locale.ROOT);
        venda.dataHora = texto(obj, "criadoem");
        venda.valorTotal = textoOuNumero(obj, "valortotal");
        venda.numeropdv = inteiro(obj, "numeropdv");
        venda.mesa = "mesa".equals(texto(obj, "origem"));
        venda.origemPos = !venda.mesa;
        venda.pagamentosResumo = resumirPagamentosPdv(obj);
        venda.meioPagamentoLabel = venda.pagamentosResumo;
        return venda;
    }

    private static JsonArray arrayData(JsonObject obj) {
        if (obj != null && obj.has("data") && obj.get("data").isJsonArray()) {
            return obj.getAsJsonArray("data");
        }
        return new JsonArray();
    }

    private static double parseQuantidade(String qty) {
        try {
            return new BigDecimal(qty.replace(",", ".")).doubleValue();
        } catch (Exception e) {
            return 1d;
        }
    }

    private static String textoOuNumero(JsonObject obj, String key) {
        if (obj == null || !obj.has(key) || obj.get(key).isJsonNull()) {
            return null;
        }
        JsonElement el = obj.get(key);
        if (el.isJsonPrimitive()) {
            return el.getAsString();
        }
        return el.toString();
    }

    private static Integer inteiro(JsonObject obj, String key) {
        if (obj == null || !obj.has(key) || obj.get(key).isJsonNull()) {
            return null;
        }
        try {
            return obj.get(key).getAsInt();
        } catch (Exception e) {
            try {
                return Integer.parseInt(obj.get(key).getAsString());
            } catch (Exception ignored) {
                return null;
            }
        }
    }

    private static boolean flag(JsonObject obj, String key) {
        if (obj == null || !obj.has(key) || obj.get(key).isJsonNull()) {
            return false;
        }
        try {
            if (obj.get(key).isJsonPrimitive() && obj.get(key).getAsJsonPrimitive().isBoolean()) {
                return obj.get(key).getAsBoolean();
            }
            return obj.get(key).getAsInt() == 1;
        } catch (Exception e) {
            try {
                String v = obj.get(key).getAsString();
                return "1".equals(v) || "true".equalsIgnoreCase(v);
            } catch (Exception ignored) {
                return false;
            }
        }
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
        JsonElement el = obj.get(key);
        try {
            if (el.isJsonPrimitive()) {
                if (el.getAsJsonPrimitive().isNumber()) {
                    return BigDecimal.valueOf(el.getAsDouble()).setScale(2, RoundingMode.HALF_UP);
                }
                return MoneyFormat.parse(el.getAsString());
            }
            return MoneyFormat.parse(el.toString());
        } catch (Exception e) {
            try {
                return BigDecimal.valueOf(el.getAsDouble()).setScale(2, RoundingMode.HALF_UP);
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
