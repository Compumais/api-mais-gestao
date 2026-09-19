package com.pos_mais_gestao.data.sync;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

/** Cache persistente e versionado das imagens recebidas junto da carga do catálogo. */
public final class CatalogImageCache {
    private static final long MAX_IMAGE_BYTES = 12L * 1024L * 1024L;
    private static final int CONCURRENCY = 4;
    private static final Type MANIFEST_TYPE =
            new TypeToken<Map<String, ManifestEntry>>() {}.getType();

    public interface ProgressListener {
        void onProgress(int concluido, int total);
    }

    public static final class ImageSpec {
        public final String key;
        public final String url;
        public final String version;
        public final boolean authenticated;

        public ImageSpec(String key, String url, String version, boolean authenticated) {
            this.key = key;
            this.url = url;
            this.version = version == null || version.trim().isEmpty() ? url : version;
            this.authenticated = authenticated;
        }
    }

    public static final class SyncResult {
        public final Map<String, String> localUris;
        public final int total;
        public final int baixadas;
        public final int reutilizadas;
        public final int falhas;

        SyncResult(
                Map<String, String> localUris,
                int total,
                int baixadas,
                int reutilizadas,
                int falhas) {
            this.localUris = Collections.unmodifiableMap(localUris);
            this.total = total;
            this.baixadas = baixadas;
            this.reutilizadas = reutilizadas;
            this.falhas = falhas;
        }
    }

    private static final class ManifestEntry {
        String version;
        String file;

        ManifestEntry() {}

        ManifestEntry(String version, String file) {
            this.version = version;
            this.file = file;
        }
    }

    private static final class ItemResult {
        final String key;
        final ManifestEntry entry;
        final boolean downloaded;
        final boolean failed;

        ItemResult(String key, ManifestEntry entry, boolean downloaded, boolean failed) {
            this.key = key;
            this.entry = entry;
            this.downloaded = downloaded;
            this.failed = failed;
        }
    }

    private final File directory;
    private final File manifestFile;
    private final OkHttpClient http;
    private final Gson gson = new Gson();

    public CatalogImageCache(File directory) {
        this(
                directory,
                new OkHttpClient.Builder()
                        .connectTimeout(8, TimeUnit.SECONDS)
                        .readTimeout(20, TimeUnit.SECONDS)
                        .callTimeout(30, TimeUnit.SECONDS)
                        .build());
    }

    CatalogImageCache(File directory, OkHttpClient http) {
        this.directory = directory;
        this.manifestFile = new File(directory, "manifest.json");
        this.http = http;
    }

    public SyncResult sync(
            List<ImageSpec> specs, String bearerToken, ProgressListener progressListener) {
        if (!directory.exists() && !directory.mkdirs()) {
            return new SyncResult(Collections.emptyMap(), specs.size(), 0, 0, specs.size());
        }
        Map<String, ManifestEntry> previous = readManifest();
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENCY);
        List<Future<ItemResult>> futures = new ArrayList<>();
        for (ImageSpec spec : specs) {
            futures.add(executor.submit(task(spec, previous.get(spec.key), bearerToken)));
        }
        executor.shutdown();

        Map<String, ManifestEntry> next = new HashMap<>();
        Map<String, String> localUris = new HashMap<>();
        int downloaded = 0;
        int reused = 0;
        int failed = 0;
        int completed = 0;
        for (Future<ItemResult> future : futures) {
            try {
                ItemResult result = future.get();
                if (result.entry != null) {
                    next.put(result.key, result.entry);
                    localUris.put(
                            result.key, new File(directory, result.entry.file).toURI().toString());
                }
                if (result.failed) {
                    failed++;
                } else if (result.downloaded) {
                    downloaded++;
                } else {
                    reused++;
                }
            } catch (Exception ignored) {
                failed++;
            }
            completed++;
            if (progressListener != null) {
                progressListener.onProgress(completed, specs.size());
            }
        }

        writeManifest(next);
        cleanup(next);
        return new SyncResult(localUris, specs.size(), downloaded, reused, failed);
    }

    private Callable<ItemResult> task(
            ImageSpec spec, ManifestEntry previous, String bearerToken) {
        return () -> {
            if (previous != null
                    && spec.version.equals(previous.version)
                    && validCacheFile(previous.file)) {
                return new ItemResult(spec.key, previous, false, false);
            }
            try {
                Request.Builder request = new Request.Builder().url(spec.url).get();
                if (spec.authenticated
                        && bearerToken != null
                        && !bearerToken.trim().isEmpty()) {
                    request.header("Authorization", "Bearer " + bearerToken.trim());
                }
                try (Response response = http.newCall(request.build()).execute()) {
                    if (!response.isSuccessful()) {
                        throw new IllegalStateException("HTTP " + response.code());
                    }
                    ResponseBody body = response.body();
                    if (body == null) {
                        throw new IllegalStateException("Imagem vazia");
                    }
                    if (body.contentLength() > MAX_IMAGE_BYTES) {
                        throw new IllegalStateException("Imagem excede o limite");
                    }
                    byte[] bytes = body.bytes();
                    if (bytes.length == 0 || bytes.length > MAX_IMAGE_BYTES) {
                        throw new IllegalStateException("Tamanho de imagem inválido");
                    }
                    String extension = extension(body.contentType() == null
                            ? null
                            : body.contentType().toString(), bytes);
                    String fileName = sha256(spec.key + "\n" + spec.version) + extension;
                    writeAtomically(fileName, bytes);
                    return new ItemResult(
                            spec.key, new ManifestEntry(spec.version, fileName), true, false);
                }
            } catch (Exception ignored) {
                if (previous != null && validCacheFile(previous.file)) {
                    return new ItemResult(spec.key, previous, false, true);
                }
                return new ItemResult(spec.key, null, false, true);
            }
        };
    }

    private Map<String, ManifestEntry> readManifest() {
        if (!manifestFile.isFile()) {
            return new HashMap<>();
        }
        try (InputStreamReader reader =
                new InputStreamReader(new FileInputStream(manifestFile), StandardCharsets.UTF_8)) {
            Map<String, ManifestEntry> result = gson.fromJson(reader, MANIFEST_TYPE);
            return result == null ? new HashMap<>() : result;
        } catch (Exception ignored) {
            return new HashMap<>();
        }
    }

    private void writeManifest(Map<String, ManifestEntry> manifest) {
        File temporary = new File(directory, "manifest.json.tmp");
        try (FileOutputStream output = new FileOutputStream(temporary)) {
            output.write(gson.toJson(manifest).getBytes(StandardCharsets.UTF_8));
            output.getFD().sync();
        } catch (Exception ignored) {
            temporary.delete();
            return;
        }
        if (manifestFile.exists() && !manifestFile.delete()) {
            temporary.delete();
            return;
        }
        temporary.renameTo(manifestFile);
    }

    private void cleanup(Map<String, ManifestEntry> manifest) {
        Set<String> keep = new HashSet<>();
        keep.add(manifestFile.getName());
        keep.add("manifest.json.tmp");
        for (ManifestEntry entry : manifest.values()) {
            if (entry != null && entry.file != null) {
                keep.add(entry.file);
            }
        }
        File[] files = directory.listFiles();
        if (files == null) {
            return;
        }
        for (File file : files) {
            if (file.isFile()
                    && !keep.contains(file.getName())
                    && file.getName().matches("^[0-9a-f]{64}\\.(jpg|png|webp)$")) {
                file.delete();
            }
        }
    }

    private boolean validCacheFile(String name) {
        return name != null
                && name.matches("^[0-9a-f]{64}\\.(jpg|png|webp)$")
                && new File(directory, name).isFile();
    }

    private void writeAtomically(String name, byte[] bytes) throws Exception {
        File destination = new File(directory, name);
        File temporary = new File(directory, name + ".tmp");
        try (FileOutputStream output = new FileOutputStream(temporary)) {
            output.write(bytes);
            output.getFD().sync();
        }
        if (destination.exists() && !destination.delete()) {
            temporary.delete();
            throw new IllegalStateException("Não foi possível atualizar a imagem");
        }
        if (!temporary.renameTo(destination)) {
            temporary.delete();
            throw new IllegalStateException("Não foi possível publicar a imagem");
        }
    }

    private static String extension(String contentType, byte[] bytes) {
        String type = contentType == null ? "" : contentType.toLowerCase();
        if (type.startsWith("image/png") || isPng(bytes)) return ".png";
        if (type.startsWith("image/jpeg") || isJpeg(bytes)) return ".jpg";
        if (type.startsWith("image/webp") || isWebp(bytes)) return ".webp";
        throw new IllegalArgumentException("Formato de imagem não suportado");
    }

    private static boolean isPng(byte[] b) {
        return b.length >= 8
                && (b[0] & 0xff) == 0x89
                && b[1] == 0x50
                && b[2] == 0x4e
                && b[3] == 0x47;
    }

    private static boolean isJpeg(byte[] b) {
        return b.length >= 3
                && (b[0] & 0xff) == 0xff
                && (b[1] & 0xff) == 0xd8
                && (b[2] & 0xff) == 0xff;
    }

    private static boolean isWebp(byte[] b) {
        return b.length >= 12
                && b[0] == 'R'
                && b[1] == 'I'
                && b[2] == 'F'
                && b[3] == 'F'
                && b[8] == 'W'
                && b[9] == 'E'
                && b[10] == 'B'
                && b[11] == 'P';
    }

    private static String sha256(String value) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder result = new StringBuilder();
        for (byte item : digest) {
            result.append(String.format("%02x", item & 0xff));
        }
        return result.toString();
    }
}
