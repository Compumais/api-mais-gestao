package com.pos_mais_gestao.ui.pedido;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.google.android.material.textfield.TextInputEditText;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.api.ContaMesaDto;
import com.pos_mais_gestao.data.api.ContaMesaItemDto;
import com.pos_mais_gestao.data.local.CatalogDb;
import com.pos_mais_gestao.data.local.CatalogRepository;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.domain.Produto;
import com.pos_mais_gestao.ui.OfflineBanner;
import com.pos_mais_gestao.ui.mesas.MesasActivity;
import com.pos_mais_gestao.util.MoneyFormat;
import com.pos_mais_gestao.util.ProdutoImagemHelper;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PedidoActivity extends AppCompatActivity {
    public static final String EXTRA_ID_CONTA = "id_conta";
    public static final String EXTRA_NUMERO = "numero";
    public static final String EXTRA_NOME = "nome";
    public static final String EXTRA_BROWSE_ONLY = "browse_only";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final List<Produto> produtos = new ArrayList<>();
    private final List<SacolaLinha> sacola = new ArrayList<>();
    private PrefsStore prefs;
    private ApiClient api;
    private CatalogRepository catalog;
    private boolean browseOnly;
    private String idConta;
    private int numero;
    private String nomeCliente;
    private String grupoAtivo = "";
    private String busca = "";
    private ProdutoAdapter produtoAdapter;
    private CartAdapter cartAdapter;
    private MaterialToolbar toolbar;
    private TextView txtSacolaCount;
    private TextView txtCartTotal;
    private View panelCart;
    private View panelFooter;
    private View boxSacola;
    private MaterialButton btnTrocarNome;
    private MaterialButton btnConta;
    private MaterialButton btnSend;
    private View panelOrderStatus;
    private ProgressBar progressOrder;
    private ImageView imgOrderStatus;
    private TextView txtOrderStatusTitle;
    private TextView txtOrderStatusSub;
    private MaterialButton btnOrderStatusOk;
    private ChipGroup chipGroups;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pedido);

        PosApplication app = (PosApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();
        catalog = api.catalogo();
        browseOnly = getIntent().getBooleanExtra(EXTRA_BROWSE_ONLY, false);
        idConta = getIntent().getStringExtra(EXTRA_ID_CONTA);
        numero = getIntent().getIntExtra(EXTRA_NUMERO, 0);
        nomeCliente = getIntent().getStringExtra(EXTRA_NOME);

        toolbar = findViewById(R.id.toolbarPedido);
        setSupportActionBar(toolbar);
        toolbar.setNavigationOnClickListener(v -> finish());
        btnTrocarNome = findViewById(R.id.btnTrocarNome);
        txtSacolaCount = findViewById(R.id.txtSacolaCount);
        boxSacola = findViewById(R.id.boxSacola);
        panelCart = findViewById(R.id.panelCart);
        panelFooter = findViewById(R.id.panelFooter);
        txtCartTotal = findViewById(R.id.txtCartTotal);
        btnConta = findViewById(R.id.btnConta);
        btnSend = findViewById(R.id.btnSend);
        panelOrderStatus = findViewById(R.id.panelOrderStatus);
        progressOrder = findViewById(R.id.progressOrder);
        imgOrderStatus = findViewById(R.id.imgOrderStatus);
        txtOrderStatusTitle = findViewById(R.id.txtOrderStatusTitle);
        txtOrderStatusSub = findViewById(R.id.txtOrderStatusSub);
        btnOrderStatusOk = findViewById(R.id.btnOrderStatusOk);
        chipGroups = findViewById(R.id.chipGroups);

        findViewById(R.id.btnSacola).setOnClickListener(v -> {
            if (!sacola.isEmpty()) {
                panelCart.setVisibility(panelCart.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE);
            }
        });
        btnTrocarNome.setOnClickListener(v -> dialogTrocarNome());
        btnConta.setOnClickListener(v -> mostrarConta());
        btnSend.setOnClickListener(v -> enviarPedido());
        btnOrderStatusOk.setOnClickListener(v -> voltarMesas());

        produtoAdapter = new ProdutoAdapter();
        RecyclerView listProducts = findViewById(R.id.listProducts);
        listProducts.setLayoutManager(new GridLayoutManager(this, 2));
        listProducts.setAdapter(produtoAdapter);

        cartAdapter = new CartAdapter();
        RecyclerView listCart = findViewById(R.id.listCart);
        listCart.setLayoutManager(new LinearLayoutManager(this));
        listCart.setAdapter(cartAdapter);

        TextInputEditText search = findViewById(R.id.inputProductSearch);
        search.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                busca = s == null ? "" : s.toString();
                recarregarProdutos();
            }

            @Override public void afterTextChanged(Editable s) {}
        });

        aplicarModo();
        montarChips();
        recarregarProdutos();
        atualizarSacolaUi();
    }

    private void aplicarModo() {
        if (browseOnly) {
            toolbar.setTitle(R.string.cardapio);
            btnTrocarNome.setVisibility(View.GONE);
            boxSacola.setVisibility(View.GONE);
            panelFooter.setVisibility(View.GONE);
        } else {
            atualizarHeader();
            btnTrocarNome.setVisibility(View.VISIBLE);
        }
    }

    private void atualizarHeader() {
        String rotulo = getString(prefs.isModeloComanda() ? R.string.comanda_n : R.string.mesa_n, numero);
        String nome = nomeCliente == null || nomeCliente.trim().isEmpty() ? "Cliente" : nomeCliente.trim();
        toolbar.setTitle(rotulo + " · " + nome);
    }

    private void montarChips() {
        chipGroups.removeAllViews();
        Chip todos = new Chip(this, null, com.google.android.material.R.attr.chipStyle);
        todos.setText(R.string.chip_todos);
        todos.setCheckable(true);
        todos.setChecked(true);
        todos.setId(View.generateViewId());
        todos.setTag("");
        chipGroups.addView(todos);
        List<CatalogDb.GrupoRow> grupos = catalog.listarGruposGourmet();
        for (CatalogDb.GrupoRow g : grupos) {
            Chip chip = new Chip(this, null, com.google.android.material.R.attr.chipStyle);
            chip.setText(g.nome);
            chip.setCheckable(true);
            chip.setId(View.generateViewId());
            chip.setTag(g.id);
            chipGroups.addView(chip);
        }
        chipGroups.setOnCheckedStateChangeListener((group, checkedIds) -> {
            if (checkedIds.isEmpty()) {
                return;
            }
            View chip = group.findViewById(checkedIds.get(0));
            grupoAtivo = chip != null && chip.getTag() != null ? String.valueOf(chip.getTag()) : "";
            recarregarProdutos();
        });
    }

    private void recarregarProdutos() {
        produtos.clear();
        produtos.addAll(catalog.listarPorGrupoGourmet(grupoAtivo, busca, 200));
        produtoAdapter.notifyDataSetChanged();
    }

    private void adicionarProduto(Produto produto) {
        if (browseOnly) {
            Toast.makeText(this, R.string.abra_mesa_para_pedir, Toast.LENGTH_SHORT).show();
            return;
        }
        dialogObservacao(produto, null);
    }

    private void dialogObservacao(Produto produto, SacolaLinha existente) {
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_observation, null);
        TextView txt = view.findViewById(R.id.txtObsProduct);
        TextInputEditText input = view.findViewById(R.id.inputObservation);
        txt.setText(produto.getDescricao());
        if (existente != null && existente.observacao != null) {
            input.setText(existente.observacao);
        }
        new AlertDialog.Builder(this)
                .setTitle(R.string.observacao)
                .setView(view)
                .setNegativeButton(R.string.pular, (d, w) -> {
                    if (existente == null) {
                        sacola.add(new SacolaLinha(produto, BigDecimal.ONE, null));
                    }
                    atualizarSacolaUi();
                })
                .setPositiveButton(R.string.salvar, (d, w) -> {
                    String obs = input.getText() == null ? "" : input.getText().toString().trim();
                    if (existente != null) {
                        existente.observacao = obs.isEmpty() ? null : obs;
                    } else {
                        sacola.add(new SacolaLinha(produto, BigDecimal.ONE, obs.isEmpty() ? null : obs));
                    }
                    atualizarSacolaUi();
                })
                .show();
    }

    private void atualizarSacolaUi() {
        cartAdapter.notifyDataSetChanged();
        boolean tem = !sacola.isEmpty();
        panelCart.setVisibility(tem ? View.VISIBLE : View.GONE);
        btnSend.setVisibility(tem ? View.VISIBLE : View.GONE);
        txtSacolaCount.setVisibility(tem ? View.VISIBLE : View.GONE);
        txtSacolaCount.setText(String.valueOf(sacola.size()));
        BigDecimal total = BigDecimal.ZERO;
        for (SacolaLinha linha : sacola) {
            total = total.add(linha.subtotal());
        }
        txtCartTotal.setText(getString(R.string.total_sacola, MoneyFormat.format(total)));
    }

    private void dialogTrocarNome() {
        if (idConta == null) {
            return;
        }
        View dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_trocar_nome, null);
        TextInputEditText input = dialogView.findViewById(R.id.inputName);
        String current = nomeCliente == null || nomeCliente.isEmpty() ? "Cliente" : nomeCliente;
        input.setText(current);
        if (input.getText() != null) {
            input.setSelection(input.getText().length());
        }
        new AlertDialog.Builder(this)
                .setTitle(R.string.trocar_nome)
                .setView(dialogView)
                .setNegativeButton(R.string.cancelar, null)
                .setPositiveButton(R.string.salvar, (d, w) -> {
                    String name = input.getText() == null ? "" : input.getText().toString().trim();
                    if (name.isEmpty()) {
                        Toast.makeText(this, R.string.informe_nome_cliente, Toast.LENGTH_SHORT).show();
                        return;
                    }
                    executor.execute(() -> {
                        try {
                            api.atualizarNomeClienteMesa(idConta, name);
                            runOnUiThread(() -> {
                                nomeCliente = name;
                                atualizarHeader();
                                Toast.makeText(this, R.string.nome_atualizado, Toast.LENGTH_SHORT).show();
                            });
                        } catch (ApiException e) {
                            runOnUiThread(() ->
                                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show());
                        }
                    });
                })
                .show();
    }

    private void mostrarConta() {
        if (idConta == null) {
            Toast.makeText(this, R.string.conta_nao_aberta, Toast.LENGTH_SHORT).show();
            return;
        }
        btnConta.setEnabled(false);
        executor.execute(() -> {
            try {
                ContaMesaDto conta = api.buscarContaMesa(idConta);
                List<ContaMesaItemDto> itens = api.listarItensMesa(idConta);
                runOnUiThread(() -> {
                    btnConta.setEnabled(true);
                    dialogConta(conta, itens);
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    btnConta.setEnabled(true);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void dialogConta(ContaMesaDto conta, List<ContaMesaItemDto> itens) {
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_conta, null);
        TextView txtCliente = view.findViewById(R.id.txtContaCliente);
        TextView txtTotal = view.findViewById(R.id.txtContaTotal);
        MaterialButton btnVerMais = view.findViewById(R.id.btnContaVerMais);
        RecyclerView list = view.findViewById(R.id.listConta);
        txtCliente.setText(conta != null && conta.observacao != null ? conta.observacao : "");
        txtTotal.setText(MoneyFormat.format(MoneyFormat.parse(conta != null ? conta.valortotal : null)));
        List<ContaMesaItemDto> visiveis = new ArrayList<>();
        ContaAdapter contaAdapter = new ContaAdapter(visiveis);
        list.setLayoutManager(new LinearLayoutManager(this));
        list.setAdapter(contaAdapter);
        final boolean[] expandido = {false};
        Runnable aplicar = () -> {
            visiveis.clear();
            int limite = expandido[0] ? itens.size() : Math.min(6, itens.size());
            for (int i = 0; i < limite; i++) {
                visiveis.add(itens.get(i));
            }
            contaAdapter.notifyDataSetChanged();
            btnVerMais.setVisibility(itens.size() > 6 ? View.VISIBLE : View.GONE);
            btnVerMais.setText(expandido[0] ? R.string.ver_menos : R.string.ver_mais);
        };
        aplicar.run();
        btnVerMais.setOnClickListener(v -> {
            expandido[0] = !expandido[0];
            aplicar.run();
        });
        String rotulo = getString(prefs.isModeloComanda() ? R.string.comanda_n : R.string.mesa_n, numero);
        new AlertDialog.Builder(this)
                .setTitle(getString(R.string.conta_da_mesa, rotulo))
                .setView(view)
                .setPositiveButton(android.R.string.ok, null)
                .show();
    }

    private void repetirItem(ContaMesaItemDto item) {
        Produto produto = catalog.buscarPorEan(item.idproduto);
        if (produto == null) {
            List<Produto> encontrados = catalog.buscarProdutos(item.nomeproduto, 5);
            if (!encontrados.isEmpty()) {
                produto = encontrados.get(0);
            }
        }
        if (produto == null) {
            return;
        }
        sacola.add(new SacolaLinha(produto, MoneyFormat.parse(item.quantidade).max(BigDecimal.ONE), item.observacao));
        atualizarSacolaUi();
    }

    private void enviarPedido() {
        if (idConta == null || sacola.isEmpty()) {
            return;
        }
        panelOrderStatus.setVisibility(View.VISIBLE);
        progressOrder.setVisibility(View.VISIBLE);
        imgOrderStatus.setVisibility(View.GONE);
        btnOrderStatusOk.setVisibility(View.GONE);
        txtOrderStatusSub.setVisibility(View.GONE);
        txtOrderStatusTitle.setText(R.string.enviando_pedido);
        String clientId = UUID.randomUUID().toString();
        List<SacolaLinha> envio = new ArrayList<>(sacola);
        executor.execute(() -> {
            try {
                api.enviarPedidoMesa(idConta, clientId, envio);
                runOnUiThread(() -> {
                    sacola.clear();
                    atualizarSacolaUi();
                    progressOrder.setVisibility(View.GONE);
                    imgOrderStatus.setVisibility(View.VISIBLE);
                    imgOrderStatus.setImageResource(R.drawable.ic_check);
                    txtOrderStatusTitle.setText(R.string.pedido_concluido);
                    btnOrderStatusOk.setVisibility(View.VISIBLE);
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    progressOrder.setVisibility(View.GONE);
                    imgOrderStatus.setVisibility(View.VISIBLE);
                    imgOrderStatus.setImageResource(R.drawable.ic_alert);
                    txtOrderStatusTitle.setText(e.getMessage());
                    btnOrderStatusOk.setVisibility(View.VISIBLE);
                    OfflineBanner.bind(this, false, e.getMessage());
                });
            }
        });
    }

    private void voltarMesas() {
        Intent intent = new Intent(this, MesasActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }

    class ProdutoAdapter extends RecyclerView.Adapter<ProdutoAdapter.VH> {
        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            return new VH(LayoutInflater.from(parent.getContext()).inflate(R.layout.item_produto_atalho, parent, false));
        }

        @Override
        public void onBindViewHolder(@NonNull VH holder, int position) {
            Produto p = produtos.get(position);
            holder.txtName.setText(p.getDescricao());
            holder.txtPrice.setText(MoneyFormat.format(p.getPreco()));
            ProdutoImagemHelper.carregar(holder.img, p);
            holder.itemView.setOnClickListener(v -> adicionarProduto(p));
        }

        @Override
        public int getItemCount() {
            return produtos.size();
        }

        class VH extends RecyclerView.ViewHolder {
            final ImageView img;
            final TextView txtName;
            final TextView txtPrice;

            VH(View v) {
                super(v);
                img = v.findViewById(R.id.imgProduto);
                txtName = v.findViewById(R.id.txtNomeProduto);
                txtPrice = v.findViewById(R.id.txtPrecoProduto);
            }
        }
    }

    class CartAdapter extends RecyclerView.Adapter<CartAdapter.VH> {
        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            return new VH(LayoutInflater.from(parent.getContext()).inflate(R.layout.item_cart, parent, false));
        }

        @Override
        public void onBindViewHolder(@NonNull VH holder, int position) {
            SacolaLinha linha = sacola.get(position);
            holder.txtName.setText("1x " + linha.produto.getDescricao());
            holder.txtPrice.setText(MoneyFormat.format(linha.subtotal()));
            if (linha.observacao != null && !linha.observacao.isEmpty()) {
                holder.txtDetail.setText(linha.observacao);
            } else {
                holder.txtDetail.setText(R.string.toque_obs);
            }
            holder.btnObs.setOnClickListener(v -> dialogObservacao(linha.produto, linha));
            holder.btnRemove.setOnClickListener(v -> {
                sacola.remove(position);
                atualizarSacolaUi();
            });
        }

        @Override
        public int getItemCount() {
            return sacola.size();
        }

        class VH extends RecyclerView.ViewHolder {
            final TextView txtName;
            final TextView txtDetail;
            final TextView txtPrice;
            final MaterialButton btnObs;
            final MaterialButton btnRemove;

            VH(View v) {
                super(v);
                txtName = v.findViewById(R.id.txtCartName);
                txtDetail = v.findViewById(R.id.txtCartDetail);
                txtPrice = v.findViewById(R.id.txtCartPrice);
                btnObs = v.findViewById(R.id.btnCartObs);
                btnRemove = v.findViewById(R.id.btnCartRemove);
            }
        }
    }

    class ContaAdapter extends RecyclerView.Adapter<ContaAdapter.VH> {
        private final List<ContaMesaItemDto> itens;

        ContaAdapter(List<ContaMesaItemDto> itens) {
            this.itens = itens;
        }

        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            return new VH(LayoutInflater.from(parent.getContext()).inflate(R.layout.item_conta, parent, false));
        }

        @Override
        public void onBindViewHolder(@NonNull VH holder, int position) {
            ContaMesaItemDto item = itens.get(position);
            holder.txtQtd.setText(item.quantidade != null ? item.quantidade : "1");
            holder.txtProduto.setText(item.nomeproduto);
            BigDecimal qtd = MoneyFormat.parse(item.quantidade);
            if (qtd.compareTo(BigDecimal.ZERO) <= 0) {
                qtd = BigDecimal.ONE;
            }
            holder.txtValor.setText(MoneyFormat.format(MoneyFormat.parse(item.precounitario).multiply(qtd)));
            if (item.observacao != null && !item.observacao.trim().isEmpty()) {
                holder.txtDetalhe.setVisibility(View.VISIBLE);
                holder.txtDetalhe.setText(item.observacao);
            } else {
                holder.txtDetalhe.setVisibility(View.GONE);
            }
            holder.btnRepeat.setOnClickListener(v -> repetirItem(item));
        }

        @Override
        public int getItemCount() {
            return itens.size();
        }

        class VH extends RecyclerView.ViewHolder {
            final ImageButton btnRepeat;
            final TextView txtQtd;
            final TextView txtProduto;
            final TextView txtValor;
            final TextView txtDetalhe;

            VH(View v) {
                super(v);
                btnRepeat = v.findViewById(R.id.btnContaRepeat);
                txtQtd = v.findViewById(R.id.txtContaQtd);
                txtProduto = v.findViewById(R.id.txtContaProduto);
                txtValor = v.findViewById(R.id.txtContaValor);
                txtDetalhe = v.findViewById(R.id.txtContaDetalhe);
            }
        }
    }
}
