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
import java.nio.charset.StandardCharsets;
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
        carregar(
                imageView,
                produto.getImagem(),
                produto.getCaminhoImagem(),
                "/pos/imagens/produtos/" + codificarSegmento(produto.getId()));
    }

    public static void carregar(
            ImageView imageView, @Nullable String imagem, @Nullable String caminhoImagem) {
        carregar(imageView, imagem, caminhoImagem, null);
    }

    public static void carregarGrupo(
            ImageView imageView,
            String idGrupo,
            @Nullable String imagem,
            @Nullable String caminhoImagem) {
        carregar(
                imageView,
                imagem,
                caminhoImagem,
                "/pos/imagens/grupos-gourmet/" + codificarSegmento(idGrupo));
    }

    private static void carregar(
            ImageView imageView,
            @Nullable String imagem,
            @Nullable String caminhoImagem,
            @Nullable String fallbackLan) {
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
        String url = prefs.isModoPdvLocal()
                ? resolverUrlLocal(prefs.getBaseUrl(), referencia, fallbackLan)
                : resolverUrl(prefs.getBaseUrl(), referencia, fallbackLan);
        if (url == null) {
            return;
        }
        ImageRequest.Builder builder = new ImageRequest.Builder(imageView.getContext())
                .data(url)
                .target(imageView)
                .placeholder(R.drawable.ic_produto_placeholder)
                .error(R.drawable.ic_produto_placeholder)
                .crossfade(true);
        String token = prefs.getToken();
        if (token != null
                && !token.trim().isEmpty()
                && pertenceAoServidor(url, prefs.getBaseUrl())) {
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
            if (v.startsWith("http://")
                    || v.startsWith("https://")
                    || v.startsWith("file:")
                    || v.startsWith("pdv-image://")
                    || v.matches("^[a-zA-Z]:[\\\\/].*")) {
                return v;
            }
            if (v.startsWith("/") && !v.startsWith("//")) {
                return v;
            }
        }
        return null;
    }

    public static String resolverUrl(String baseUrl, String referencia) {
        return resolverUrl(baseUrl, referencia, null);
    }

    @Nullable
    public static String resolverUrl(
            String baseUrl, String referencia, @Nullable String fallbackLan) {
        if (referencia.startsWith("file:")) {
            return referencia;
        }
        if (referencia.startsWith("pdv-image://")
                || referencia.matches("^[a-zA-Z]:[\\\\/].*")) {
            if (fallbackLan == null) {
                return null;
            }
            referencia = fallbackLan;
        }
        if (referencia.startsWith("/") && !referencia.startsWith("//")) {
            return baseUrl.replaceAll("/+$", "") + referencia;
        }
        return referencia.startsWith("http://") || referencia.startsWith("https://")
                ? referencia
                : null;
    }

    @Nullable
    public static String resolverUrlLocal(
            String baseUrl, String referencia, @Nullable String fallbackLan) {
        String resolvida = resolverUrl(baseUrl, referencia, fallbackLan);
        if (resolvida == null
                || resolvida.startsWith("file:")
                || pertenceAoServidor(resolvida, baseUrl)) {
            return resolvida;
        }
        return fallbackLan == null ? null : resolverUrl(baseUrl, fallbackLan, null);
    }

    public static boolean pertenceAoServidor(String url, String baseUrl) {
        String base = baseUrl.replaceAll("/+$", "");
        return url.equals(base) || url.startsWith(base + "/");
    }

    private static String codificarSegmento(String valor) {
        StringBuilder resultado = new StringBuilder();
        for (byte item : (valor == null ? "" : valor).getBytes(StandardCharsets.UTF_8)) {
            int b = item & 0xff;
            if ((b >= 'a' && b <= 'z')
                    || (b >= 'A' && b <= 'Z')
                    || (b >= '0' && b <= '9')
                    || b == '-'
                    || b == '.'
                    || b == '_'
                    || b == '~') {
                resultado.append((char) b);
            } else {
                resultado.append('%');
                resultado.append("0123456789ABCDEF".charAt(b >>> 4));
                resultado.append("0123456789ABCDEF".charAt(b & 0x0f));
            }
        }
        return resultado.toString();
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
