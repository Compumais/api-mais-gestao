package com.maisgestao.nfe.ui.hub;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import com.google.android.material.button.MaterialButton;
import com.maisgestao.nfe.NfeApplication;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.data.api.ApiClient;
import com.maisgestao.nfe.data.local.PrefsStore;
import com.maisgestao.nfe.ui.empresa.EmpresaActivity;
import com.maisgestao.nfe.ui.login.LoginActivity;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MaisFragment extends Fragment {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_mais, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        PrefsStore prefs = ((NfeApplication) requireActivity().getApplication()).getPrefsStore();
        TextView textUsuario = view.findViewById(R.id.textUsuario);
        String nome = prefs.getUserName();
        textUsuario.setText(nome == null ? "" : getString(R.string.ola_usuario, nome));

        MaterialButton btnTrocarEmpresa = view.findViewById(R.id.btnTrocarEmpresa);
        btnTrocarEmpresa.setOnClickListener(v -> {
            prefs.clearEmpresa();
            startActivity(new Intent(requireContext(), EmpresaActivity.class));
            requireActivity().finish();
        });

        MaterialButton btnLogout = view.findViewById(R.id.btnLogout);
        btnLogout.setOnClickListener(v -> {
            ApiClient api = ((NfeApplication) requireActivity().getApplication()).getApiClient();
            executor.execute(() -> {
                try {
                    api.logout();
                } catch (Exception ignored) {
                    prefs.logout();
                }
                requireActivity().runOnUiThread(() -> {
                    Intent intent = new Intent(requireContext(), LoginActivity.class);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                    startActivity(intent);
                    requireActivity().finish();
                });
            });
        });
    }

    @Override
    public void onDestroyView() {
        executor.shutdownNow();
        super.onDestroyView();
    }
}
