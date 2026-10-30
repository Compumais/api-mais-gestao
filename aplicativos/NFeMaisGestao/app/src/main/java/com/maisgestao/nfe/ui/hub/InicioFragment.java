package com.maisgestao.nfe.ui.hub;

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import com.google.gson.JsonObject;
import com.maisgestao.nfe.NfeApplication;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.data.api.ApiClient;
import com.maisgestao.nfe.data.local.PrefsStore;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class InicioFragment extends Fragment {
    private static final String DASHBOARD_URL = "file:///android_asset/dashboard/dashboard.html";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private ProgressBar progress;
    private TextView textDashboardErro;
    private WebView webDashboard;
    private boolean pageReady;
    private String pendingPayloadJson;
    private String pendingErrorMessage;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_inicio, container, false);
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        progress = view.findViewById(R.id.progress);
        textDashboardErro = view.findViewById(R.id.textDashboardErro);
        webDashboard = view.findViewById(R.id.webDashboard);
        TextView textEmpresa = view.findViewById(R.id.textEmpresa);

        PrefsStore prefs = ((NfeApplication) requireActivity().getApplication()).getPrefsStore();
        textEmpresa.setText(getString(R.string.empresa_atual, prefs.getEmpresaNome()));

        setupWebView();
        carregar(prefs);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webDashboard.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        webDashboard.setBackgroundColor(0xFFFFFFFF);
        webDashboard.setVerticalScrollBarEnabled(false);
        webDashboard.setHorizontalScrollBarEnabled(false);
        webDashboard.addJavascriptInterface(new DashboardBridge(), "AndroidDashboard");

        webDashboard.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                flushPendingToWebView();
            }
        });

        webDashboard.loadUrl(DASHBOARD_URL);
    }

    private void carregar(PrefsStore prefs) {
        String idempresa = prefs.getEmpresaId();
        if (idempresa == null) {
            showError(getString(R.string.dashboard_sem_empresa));
            return;
        }
        progress.setVisibility(View.VISIBLE);
        textDashboardErro.setVisibility(View.GONE);
        ApiClient api = ((NfeApplication) requireActivity().getApplication()).getApiClient();
        executor.execute(() -> {
            try {
                JsonObject dash = api.dashboard(idempresa);
                JsonObject exec = api.dashboardExecutivo(idempresa, "mes_atual");
                JsonObject payload = new JsonObject();
                payload.add("dashboard", dash);
                payload.add("executivo", exec);
                String json = payload.toString();
                requireActivity().runOnUiThread(() -> {
                    if (!isAdded()) {
                        return;
                    }
                    progress.setVisibility(View.GONE);
                    deliverPayload(json, null);
                });
            } catch (Exception error) {
                String message = error.getMessage();
                if (message == null || message.trim().isEmpty()) {
                    message = getString(R.string.dashboard_erro_generico);
                }
                String finalMessage = message;
                requireActivity().runOnUiThread(() -> {
                    if (!isAdded()) {
                        return;
                    }
                    progress.setVisibility(View.GONE);
                    deliverPayload(null, finalMessage);
                });
            }
        });
    }

    private void deliverPayload(@Nullable String payloadJson, @Nullable String errorMessage) {
        if (errorMessage != null) {
            pendingPayloadJson = null;
            pendingErrorMessage = errorMessage;
        } else {
            pendingPayloadJson = payloadJson;
            pendingErrorMessage = null;
        }
        flushPendingToWebView();
    }

    private void flushPendingToWebView() {
        if (!pageReady || webDashboard == null) {
            return;
        }
        if (pendingErrorMessage != null) {
            showError(pendingErrorMessage);
            evaluateJs("window.showDashboardError(" + jsString(pendingErrorMessage) + ");");
            pendingErrorMessage = null;
            return;
        }
        if (pendingPayloadJson != null) {
            textDashboardErro.setVisibility(View.GONE);
            webDashboard.setVisibility(View.VISIBLE);
            evaluateJs("window.renderDashboard(" + jsString(pendingPayloadJson) + ");");
            pendingPayloadJson = null;
        }
    }

    private void showError(String message) {
        textDashboardErro.setText(message);
        textDashboardErro.setVisibility(View.VISIBLE);
    }

    private void evaluateJs(String script) {
        webDashboard.evaluateJavascript(script, null);
    }

    private static String jsString(String raw) {
        if (raw == null) {
            return "null";
        }
        return org.json.JSONObject.quote(raw);
    }

    private final class DashboardBridge {
        @JavascriptInterface
        public void onContentHeight(int heightPx) {
            if (heightPx <= 0 || webDashboard == null) {
                return;
            }
            requireActivity().runOnUiThread(() -> {
                if (!isAdded() || webDashboard == null) {
                    return;
                }
                ViewGroup.LayoutParams params = webDashboard.getLayoutParams();
                int min = (int) (720 * getResources().getDisplayMetrics().density);
                params.height = Math.max(heightPx, min);
                webDashboard.setLayoutParams(params);
            });
        }
    }

    @Override
    public void onDestroyView() {
        pageReady = false;
        pendingPayloadJson = null;
        pendingErrorMessage = null;
        if (webDashboard != null) {
            webDashboard.destroy();
            webDashboard = null;
        }
        executor.shutdownNow();
        super.onDestroyView();
    }
}
