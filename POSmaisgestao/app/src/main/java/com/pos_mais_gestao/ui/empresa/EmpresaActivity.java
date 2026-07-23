package com.pos_mais_gestao.ui.empresa;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.api.EmpresaDto;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.ui.home.HomeActivity;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class EmpresaActivity extends AppCompatActivity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private PrefsStore prefs;
    private ApiClient api;
    private ProgressBar progress;
    private EmpresaAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_empresa);

        PosApplication app = (PosApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();

        progress = findViewById(R.id.progressEmpresa);
        RecyclerView lista = findViewById(R.id.listaEmpresas);
        adapter = new EmpresaAdapter(this::selecionarEmpresa);
        lista.setLayoutManager(new LinearLayoutManager(this));
        lista.setAdapter(adapter);

        carregar();
    }

    private void carregar() {
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                List<EmpresaDto> empresas = api.listarEmpresas();
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    if (empresas.isEmpty()) {
                        Toast.makeText(this, "Nenhuma empresa encontrada", Toast.LENGTH_LONG).show();
                        return;
                    }
                    if (empresas.size() == 1) {
                        selecionarEmpresa(empresas.get(0));
                        return;
                    }
                    adapter.setItens(empresas);
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void selecionarEmpresa(EmpresaDto empresa) {
        prefs.setEmpresa(empresa.id, empresa.nome);
        Intent intent = new Intent(this, HomeActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }
}
