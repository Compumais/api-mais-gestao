package com.maisgestao.nfe.ui.clientes;

import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.Toast;
import com.maisgestao.nfe.ui.NfeAppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.google.gson.JsonObject;
import com.maisgestao.nfe.NfeApplication;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.data.api.ApiClient;
import com.maisgestao.nfe.data.api.dto.EntidadeDto;
import com.maisgestao.nfe.data.local.PrefsStore;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ClienteFormActivity extends NfeAppCompatActivity {
    public static final String EXTRA_CLIENTE_ID = "cliente_id";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private ApiClient api;
    private PrefsStore prefs;
    private String clienteId;
    private TextInputEditText inputNome;
    private TextInputEditText inputRazao;
    private TextInputEditText inputCnpjCpf;
    private TextInputEditText inputEmail;
    private TextInputEditText inputTelefone;
    private ProgressBar progress;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_cliente_form);

        NfeApplication app = (NfeApplication) getApplication();
        api = app.getApiClient();
        prefs = app.getPrefsStore();
        clienteId = getIntent().getStringExtra(EXTRA_CLIENTE_ID);

        inputNome = findViewById(R.id.inputNome);
        inputRazao = findViewById(R.id.inputRazao);
        inputCnpjCpf = findViewById(R.id.inputCnpjCpf);
        inputEmail = findViewById(R.id.inputEmail);
        inputTelefone = findViewById(R.id.inputTelefone);
        progress = findViewById(R.id.progress);
        MaterialButton btnSalvar = findViewById(R.id.btnSalvar);
        btnSalvar.setOnClickListener(v -> salvar());

        if (clienteId != null) {
            setTitle(R.string.editar_cliente);
            carregar();
        } else {
            setTitle(R.string.novo_cliente);
        }
    }

    private void carregar() {
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                EntidadeDto entidade = api.buscarEntidade(clienteId);
                runOnUiThread(() -> {
                    if (isFinishing()) {
                        return;
                    }
                    progress.setVisibility(View.GONE);
                    inputNome.setText(entidade.nome);
                    inputRazao.setText(entidade.razaosocial == null ? "" : entidade.razaosocial);
                    inputCnpjCpf.setText(entidade.cnpjcpf == null ? "" : entidade.cnpjcpf);
                    inputEmail.setText(entidade.email == null ? "" : entidade.email);
                    inputTelefone.setText(entidade.telefone == null ? "" : entidade.telefone);
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    if (isFinishing()) {
                        return;
                    }
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void salvar() {
        String idempresa = prefs.getEmpresaId();
        if (idempresa == null) {
            return;
        }
        JsonObject body = new JsonObject();
        body.addProperty("idempresa", idempresa);
        body.addProperty("nome", text(inputNome));
        body.addProperty("razaosocial", text(inputRazao));
        body.addProperty("cnpjcpf", text(inputCnpjCpf));
        body.addProperty("email", text(inputEmail));
        body.addProperty("telefone", text(inputTelefone));
        body.addProperty("cliente", 1);

        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                if (clienteId == null) {
                    api.criarEntidade(body);
                } else {
                    api.atualizarEntidade(clienteId, body);
                }
                runOnUiThread(() -> {
                    if (isFinishing()) {
                        return;
                    }
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, R.string.salvo, Toast.LENGTH_SHORT).show();
                    finish();
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    if (isFinishing()) {
                        return;
                    }
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
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
