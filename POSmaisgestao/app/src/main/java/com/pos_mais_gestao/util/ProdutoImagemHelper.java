package com.pos_mais_gestao.util;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.widget.ImageView;
import androidx.annotation.Nullable;
import coil.Coil;
import coil.request.ImageRequest;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.domain.Produto;
import okhttp3.Headers;

public final class ProdutoImagemHelper {
    private ProdutoImagemHelper() {}

    public static void carregar(ImageView imageView, @Nullable Produto produto) {
        if (imageView == null) {
            return;
        }
        imageView.setImageResource(R.drawable.ic_produto_placeholder);
        if (produto == null) {
            return;
        }
        carregar(imageView, produto.getImagem(), produto.getCaminhoImagem());
    }

    public static void carregar(
            ImageView imageView, @Nullable String imagem, @Nullable String caminhoImagem) {
        if (imageView == null) {
            return;
        }
        imageView.setImageResource(R.drawable.ic_produto_placeholder);

        String dataUri = normalizarDataUri(imagem);
        if (dataUri != null) {
            Bitmap bitmap = decodificarDataUri(dataUri);
            if (bitmap != null) {
                imageView.setImageBitmap(bitmap);
                return;
            }
        }

        String referencia = primeiraReferencia(caminhoImagem, imagem);
        if (referencia == null) {
            return;
        }

        PrefsStore prefs = new PrefsStore(imageView.getContext());
        String url = resolverUrl(prefs.getBaseUrl(), referencia);
        ImageRequest.Builder builder = new ImageRequest.Builder(imageView.getContext())
                .data(url)
                .target(imageView)
                .placeholder(R.drawable.ic_produto_placeholder)
                .error(R.drawable.ic_produto_placeholder)
                .crossfade(true);
        String token = prefs.getToken();
        if (token != null && !token.trim().isEmpty() && url.startsWith(prefs.getBaseUrl())) {
            builder.headers(new Headers.Builder()
                    .add("Authorization", "Bearer " + token.trim())
                    .build());
        }
        Coil.imageLoader(imageView.getContext()).enqueue(builder.build());
    }

    @Nullable
    private static String primeiraReferencia(String... candidatos) {
        if (candidatos == null) {
            return null;
        }
        for (String c : candidatos) {
            if (c == null) {
                continue;
            }
            String v = c.trim();
            if (v.isEmpty()) {
                continue;
            }
            if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("file://")) {
                return v;
            }
            if (v.startsWith("/") && !v.startsWith("//")) {
                return v;
            }
        }
        return null;
    }

    static String resolverUrl(String baseUrl, String referencia) {
        if (referencia.startsWith("/") && !referencia.startsWith("//")) {
            return baseUrl.replaceAll("/+$", "") + referencia;
        }
        return referencia;
    }

    @Nullable
    private static String normalizarDataUri(String imagem) {
        if (imagem == null) {
            return null;
        }
        String v = imagem.trim();
        if (v.isEmpty()) {
            return null;
        }
        if (v.startsWith("data:image")) {
            return v;
        }
        // base64 puro (legado)
        if (v.length() > 100 && !v.contains("://") && v.matches("^[A-Za-z0-9+/=\\s]+$")) {
            return "data:image/jpeg;base64," + v.replaceAll("\\s", "");
        }
        return null;
    }

    @Nullable
    private static Bitmap decodificarDataUri(String dataUri) {
        try {
            int idx = dataUri.indexOf(",");
            if (idx < 0 || idx >= dataUri.length() - 1) {
                return null;
            }
            String base64 = dataUri.substring(idx + 1);
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Exception e) {
            return null;
        }
    }
}
