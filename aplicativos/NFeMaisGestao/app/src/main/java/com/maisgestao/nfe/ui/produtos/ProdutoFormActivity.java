package com.maisgestao.nfe.ui.produtos;

import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.Toast;
import com.maisgestao.nfe.ui.NfeAppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.google.gson.JsonObject;
import com.maisgestao.nfe.NfeApplication;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.data.api.ApiClient;
import com.maisgestao.nfe.data.api.dto.ProdutoDto;
import com.maisgestao.nfe.data.local.PrefsStore;
import com.maisgestao.nfe.util.UiExecutor;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ProdutoFormActivity extends NfeAppCompatActivity {
    public static final String EXTRA_PRODUTO_ID = "produto_id";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private ApiClient api;
    private PrefsStore prefs;
    private String produtoId;
    private TextInputEditText inputNome;
    private TextInputEditText inputPreco;
    private TextInputEditText inputNcm;
    private TextInputEditText inputCodigo;
    private Spinner spinnerUnidade;
    private ProgressBar progress;
    private final List<JsonObject> unidades = new ArrayList<>();
    private final List<String> unidadeLabels = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_produto_form);

        NfeApplication app = (NfeApplication) getApplication();
        api = app.getApiClient();
        prefs = app.getPrefsStore();
        produtoId = getIntent().getStringExtra(EXTRA_PRODUTO_ID);

        inputNome = findViewById(R.id.inputNome);
        inputPreco = findViewById(R.id.inputPreco);
        inputNcm = findViewById(R.id.inputNcm);
        inputCodigo = findViewById(R.id.inputCodigo);
        spinnerUnidade = findViewById(R.id.spinnerUnidade);
        progress = findViewById(R.id.progress);
        MaterialButton btnSalvar = findViewById(R.id.btnSalvar);
        btnSalvar.setOnClickListener(v -> salvar());

        carregarUnidades();
        if (produtoId != null) {
            setTitle(R.string.editar_produto);
            carregarProduto();
        } else {
            setTitle(R.string.novo_produto);
            carregarProximoCodigo();
        }
    }

    private void carregarUnidades() {
        String idempresa = prefs.getEmpresaId();
        if (idempresa == null) {
            return;
        }
        progress.setVisibility(View.VISIBLE);
        UiExecutor.run(
                this,
                executor,
                () -> {
                    List<JsonObject> lista = api.listarUnidades(idempresa);
                    runOnUiThread(() -> {
                        unidades.clear();
                        unidadeLabels.clear();
                        unidades.addAll(lista);
                        for (JsonObject u : lista) {
                            String desc = u.has("descricao") ? u.get("descricao").getAsString() : u.toString();
                            unidadeLabels.add(desc);
                        }
                        spinnerUnidade.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, unidadeLabels));
                        progress.setVisibility(View.GONE);
                    });
                },
                null,
                error -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                });
    }

    private void carregarProximoCodigo() {
        String idempresa = prefs.getEmpresaId();
        if (idempresa == null) {
            return;
        }
        UiExecutor.run(
                this,
                executor,
                () -> {
                    int codigo = api.proximoCodigo(idempresa);
                    runOnUiThread(() -> inputCodigo.setText(String.valueOf(codigo)));
                },
                null,
                error -> Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show());
    }

    private void carregarProduto() {
        progress.setVisibility(View.VISIBLE);
        UiExecutor.run(
                this,
                executor,
                () -> {
                    ProdutoDto produto = api.buscarProduto(produtoId);
                    runOnUiThread(() -> {
                        progress.setVisibility(View.GONE);
                        inputNome.setText(produto.nome);
                        inputPreco.setText(produto.preco == null ? "" : produto.preco);
                        inputNcm.setText(produto.ncm == null ? "" : produto.ncm);
                        if (produto.codigo != null) {
                            inputCodigo.setText(String.valueOf(produto.codigo));
                        }
                        selecionarUnidade(produto.idunidademedida);
                    });
                },
                null,
                error -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                });
    }

    private void selecionarUnidade(String id) {
        if (id == null) {
            return;
        }
        for (int i = 0; i < unidades.size(); i++) {
            JsonObject u = unidades.get(i);
            if (u.has("id") && id.equals(u.get("id").getAsString())) {
                spinnerUnidade.setSelection(i);
                break;
            }
        }
    }

    private void salvar() {
        String idempresa = prefs.getEmpresaId();
        if (idempresa == null) {
            return;
        }
        JsonObject body = new JsonObject();
        body.addProperty("idempresa", idempresa);
        body.addProperty("nome", text(inputNome));
        body.addProperty("preco", text(inputPreco).replace(",", "."));
        body.addProperty("ncm", text(inputNcm));
        body.addProperty("tipo", "P");
        try {
            body.addProperty("codigo", Integer.parseInt(text(inputCodigo)));
        } catch (Exception ignored) {
            body.addProperty("codigo", 1);
        }
        int idx = spinnerUnidade.getSelectedItemPosition();
        if (idx >= 0 && idx < unidades.size() && unidades.get(idx).has("id")) {
            body.addProperty("idunidademedida", unidades.get(idx).get("id").getAsString());
        }

        progress.setVisibility(View.VISIBLE);
        UiExecutor.run(
                this,
                executor,
                () -> {
                    if (produtoId == null) {
                        api.criarProduto(body);
                    } else {
                        api.atualizarProduto(produtoId, body);
                    }
                },
                () -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, R.string.salvo, Toast.LENGTH_SHORT).show();
                    finish();
                },
                error -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                });
    }

    private static String text(TextInputEditText edit) {
        return edit.getText() == null ? "" : edit.getText().toString().trim();
    }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}
