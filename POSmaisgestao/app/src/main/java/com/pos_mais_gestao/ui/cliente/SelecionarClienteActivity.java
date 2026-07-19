package com.pos_mais_gestao.ui.cliente;

import android.content.Intent;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.api.ClienteDto;
import com.pos_mais_gestao.util.SoftInputHelper;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SelecionarClienteActivity extends AppCompatActivity {
    public static final String EXTRA_CLIENTE_ID = "cliente_id";
    public static final String EXTRA_CLIENTE_NOME = "cliente_nome";
    public static final String EXTRA_CLIENTE_DOC = "cliente_doc";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private ApiClient api;
    private ProgressBar progress;
    private TextInputEditText inputBusca;
    private ClienteAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_selecionar_cliente);

        PosApplication app = (PosApplication) getApplication();
        api = app.getApiClient();

        progress = findViewById(R.id.progressCliente);
        inputBusca = findViewById(R.id.inputBuscaCliente);
        MaterialButton btnBuscar = findViewById(R.id.btnBuscarCliente);
        MaterialButton btnSemCliente = findViewById(R.id.btnSemCliente);
        RecyclerView lista = findViewById(R.id.listaClientes);

        SoftInputHelper.hideOnStart(this);

        adapter = new ClienteAdapter(this::confirmarCliente);
        lista.setLayoutManager(new LinearLayoutManager(this));
        lista.setAdapter(adapter);

        btnBuscar.setOnClickListener(v -> buscar());
        btnSemCliente.setOnClickListener(v -> limparCliente());
        inputBusca.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH
                    || (event != null
                            && event.getKeyCode() == KeyEvent.KEYCODE_ENTER
                            && event.getAction() == KeyEvent.ACTION_DOWN)) {
                buscar();
                return true;
            }
            return false;
        });

        buscar();
    }

    private void buscar() {
        String termo = inputBusca.getText() != null ? inputBusca.getText().toString().trim() : "";
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                List<ClienteDto> clientes = api.buscarClientes(termo, 1, 30);
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    adapter.setItens(clientes);
                    if (clientes.isEmpty()) {
                        Toast.makeText(this, R.string.nenhum_cliente, Toast.LENGTH_SHORT).show();
                    }
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void confirmarCliente(ClienteDto cliente) {
        Intent data = new Intent();
        data.putExtra(EXTRA_CLIENTE_ID, cliente.id);
        data.putExtra(EXTRA_CLIENTE_NOME, cliente.nomeExibicao());
        data.putExtra(EXTRA_CLIENTE_DOC, cliente.documentoExibicao());
        setResult(RESULT_OK, data);
        finish();
    }

    private void limparCliente() {
        Intent data = new Intent();
        data.putExtra(EXTRA_CLIENTE_ID, "");
        data.putExtra(EXTRA_CLIENTE_NOME, "");
        data.putExtra(EXTRA_CLIENTE_DOC, "");
        setResult(RESULT_OK, data);
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }
}
