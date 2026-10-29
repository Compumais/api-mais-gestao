package com.pos_mais_gestao.util;

import java.net.URI;

/** Interpreta o QR de descoberta LAN exibido pelo PDV desktop. */
public final class PosConnectionQrParser {
    private PosConnectionQrParser() {
    }

    public static String parse(String content) {
        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("QR vazio");
        }

        URI qr;
        try {
            qr = URI.create(content.trim());
        } catch (RuntimeException error) {
            throw new IllegalArgumentException("Este não é um QR de conexão do PDV");
        }
        String version = queryParameter(qr, "v");
        if (!"mgpos".equalsIgnoreCase(qr.getScheme())
                || !"connect".equalsIgnoreCase(qr.getHost())
                || !"1".equals(version)) {
            throw new IllegalArgumentException("Este não é um QR de conexão do PDV");
        }

        String url = queryParameter(qr, "url");
        try {
            URI parsed = URI.create(url == null ? "" : url.trim());
            int port = parsed.getPort();
            if (!"http".equalsIgnoreCase(parsed.getScheme())
                    || parsed.getHost() == null
                    || parsed.getHost().trim().isEmpty()
                    || parsed.getUserInfo() != null
                    || port < 1
                    || port > 65535) {
                throw new IllegalArgumentException();
            }
            return "http://" + parsed.getHost() + ":" + port;
        } catch (RuntimeException error) {
            throw new IllegalArgumentException("QR do PDV inválido");
        }
    }

    private static String queryParameter(URI uri, String name) {
        String query = uri.getQuery();
        if (query == null) {
            return null;
        }
        for (String part : query.split("&")) {
            String[] pair = part.split("=", 2);
            if (pair[0].equals(name)) {
                return pair.length > 1 ? pair[1] : "";
            }
        }
        return null;
    }
}
