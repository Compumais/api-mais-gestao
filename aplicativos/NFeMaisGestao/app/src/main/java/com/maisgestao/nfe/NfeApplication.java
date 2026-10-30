package com.maisgestao.nfe;

import android.app.Application;
import com.maisgestao.nfe.data.api.ApiClient;
import com.maisgestao.nfe.data.local.PrefsStore;

public class NfeApplication extends Application {
    private PrefsStore prefsStore;
    private ApiClient apiClient;

    @Override
    public void onCreate() {
        super.onCreate();
        prefsStore = new PrefsStore(this);
        apiClient = new ApiClient(prefsStore);
    }

    public PrefsStore getPrefsStore() {
        return prefsStore;
    }

    public ApiClient getApiClient() {
        return apiClient;
    }
}
