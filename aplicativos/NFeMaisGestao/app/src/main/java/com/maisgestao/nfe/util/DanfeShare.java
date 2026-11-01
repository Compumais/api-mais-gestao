package com.maisgestao.nfe.util;

import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;

public final class DanfeShare {
    private static final String[] PACOTES = {"com.whatsapp", "com.whatsapp.w4b"};

    private DanfeShare() {}

    public static Uri salvar(Context context, String notaId, byte[] pdf) throws Exception {
        File dir = new File(context.getCacheDir(), "danfe");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        File file = new File(dir, "danfe-" + notaId + ".pdf");
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(pdf);
        }
        return FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", file);
    }

    public static String pacoteWhatsApp(Context context) {
        PackageManager pm = context.getPackageManager();
        for (String pacote : PACOTES) {
            try {
                pm.getPackageInfo(pacote, 0);
                return pacote;
            } catch (PackageManager.NameNotFoundException ignored) {
            }
        }
        return null;
    }

    public static Intent intentWhatsApp(Context context, Uri uri, String telefone, String legenda) {
        String pacote = pacoteWhatsApp(context);
        if (pacote == null) {
            return null;
        }
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("application/pdf");
        send.putExtra(Intent.EXTRA_STREAM, uri);
        send.setClipData(ClipData.newRawUri("DANFE", uri));
        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        if (legenda != null && !legenda.trim().isEmpty()) {
            send.putExtra(Intent.EXTRA_TEXT, legenda.trim());
        }
        String jid = jid(telefone);
        if (jid != null) {
            send.putExtra("jid", jid);
        }
        send.setPackage(pacote);
        context.grantUriPermission(pacote, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return send;
    }

    static String jid(String telefone) {
        if (telefone == null) {
            return null;
        }
        String digitos = telefone.replaceAll("\\D", "");
        if (digitos.startsWith("00")) {
            digitos = digitos.substring(2);
        }
        if (digitos.length() == 10 || digitos.length() == 11) {
            digitos = "55" + digitos;
        }
        if (digitos.length() < 12 || digitos.length() > 15) {
            return null;
        }
        return digitos + "@s.whatsapp.net";
    }
}
