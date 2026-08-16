package com.pos_mais_gestao;

import android.app.Activity;
import android.app.Application;
import android.os.Bundle;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.local.CatalogRepository;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.data.sync.OutboxSync;
import com.pos_mais_gestao.hardware.EscPosPrinter;
import com.pos_mais_gestao.hardware.ImpressoraPos;
import com.pos_mais_gestao.hardware.PagamentoHardware;
import com.pos_mais_gestao.hardware.StubPagamentoHardware;
import com.pos_mais_gestao.util.ThemeHelper;
import com.pos_mais_gestao.util.WindowInsetsHelper;

public class PosApplication extends Application {
    private PrefsStore prefsStore;
    private ApiClient apiClient;
    private OutboxSync outboxSync;
    private ImpressoraPos impressoraPos;
    private PagamentoHardware pagamentoHardware;

    @Override
    public void onCreate() {
        super.onCreate();
        prefsStore = new PrefsStore(this);
        ThemeHelper.aplicar(ThemeHelper.normalizar(prefsStore.getTema()));
        apiClient = new ApiClient(prefsStore, new CatalogRepository(this));
        outboxSync = new OutboxSync(this, apiClient);
        impressoraPos = new EscPosPrinter(this);
        pagamentoHardware = new StubPagamentoHardware();
        registerActivityLifecycleCallbacks(new ActivityLifecycleCallbacks() {
            @Override
            public void onActivityCreated(Activity activity, Bundle savedInstanceState) {
                WindowInsetsHelper.prepararJanela(activity);
            }

            @Override
            public void onActivityStarted(Activity activity) {
                WindowInsetsHelper.aplicarConteudo(activity);
            }

            @Override
            public void onActivityResumed(Activity activity) {}

            @Override
            public void onActivityPaused(Activity activity) {}

            @Override
            public void onActivityStopped(Activity activity) {}

            @Override
            public void onActivitySaveInstanceState(Activity activity, Bundle outState) {}

            @Override
            public void onActivityDestroyed(Activity activity) {}
        });
    }

    public PrefsStore getPrefsStore() {
        return prefsStore;
    }

    public ApiClient getApiClient() {
        return apiClient;
    }

    public OutboxSync getOutboxSync() {
        return outboxSync;
    }

    public ImpressoraPos getImpressoraPos() {
        return impressoraPos;
    }

    public PagamentoHardware getPagamentoHardware() {
        return pagamentoHardware;
    }
}
