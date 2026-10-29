package com.pos_mais_gestao.hardware.balanca;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import androidx.core.content.ContextCompat;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.domain.balanca.BalancaConfig;
import com.pos_mais_gestao.domain.balanca.BalancaDiagnostico;
import com.pos_mais_gestao.domain.balanca.BalancaEstado;
import com.pos_mais_gestao.domain.balanca.BalancaLeitura;
import com.pos_mais_gestao.domain.balanca.DispositivoBalanca;
import com.pos_mais_gestao.hardware.balanca.protocol.Prt3Parser;
import com.pos_mais_gestao.hardware.balanca.protocol.Prt3Protocol;
import com.pos_mais_gestao.hardware.balanca.usb.UsbSerialBalancaTransport;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/** Coordena USB, protocolo e estado da balança sem reter Activities. */
public final class BalancaManager {
    public interface Listener {
        void onBalancaAlterada(BalancaDiagnostico diagnostico);
    }

    public interface LeituraCallback {
        void onResultado(BalancaLeitura leitura);
    }

    private static final String TAG = "Balanca";
    private static final int READ_TIMEOUT_MS = 120;
    private static final int RESPONSE_WINDOW_MS = 500;
    private static final int WRITE_TIMEOUT_MS = 1000;
    private static final int MAX_RECONEXOES = 3;

    private final Context context;
    private final PrefsStore prefs;
    private final BalancaTransport transport;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Set<Listener> listeners = new CopyOnWriteArraySet<>();
    private final AtomicBoolean leituraEmAndamento = new AtomicBoolean(false);
    private final AtomicBoolean conexaoEmAndamento = new AtomicBoolean(false);
    private final AtomicBoolean permissaoSolicitada = new AtomicBoolean(false);
    private final AtomicInteger geracao = new AtomicInteger();
    private final Prt3Parser parser = new Prt3Parser();

    private volatile BalancaEstado estado = BalancaEstado.DESABILITADA;
    private volatile String mensagem = "Balança desabilitada";
    private volatile String dispositivo = "";
    private volatile String driver = "";
    private volatile int vendorId = -1;
    private volatile int productId = -1;
    private volatile String ultimoPeso = "";
    private volatile long ultimaComunicacao;
    private volatile String ultimoErro = "";
    private volatile String ultimoTxHex = "";
    private volatile String ultimoRxHex = "";
    private volatile int tentativasReconexao;
    private volatile int dispositivoAguardandoPermissao = -1;

    private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context receiverContext, Intent intent) {
            String action = intent.getAction();
            if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                if (isHabilitada()) {
                    Log.i(TAG, "Dispositivo USB detectado");
                    conectar();
                }
            } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                UsbDevice removido = obterDispositivo(intent);
                if (removido != null
                        && removido.getVendorId() == vendorId
                        && removido.getProductId() == productId) {
                    Log.i(TAG, "Dispositivo USB desconectado");
                    desconectarInterno("Balança desconectada");
                }
            }
        }
    };

    @SuppressWarnings("deprecation")
    private static UsbDevice obterDispositivo(Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice.class);
        }
        return intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
    }

    public BalancaManager(Context context, PrefsStore prefs) {
        this(context, prefs, new UsbSerialBalancaTransport(context));
    }

    BalancaManager(Context context, PrefsStore prefs, BalancaTransport transport) {
        this.context = context.getApplicationContext();
        this.prefs = prefs;
        this.transport = transport;
        IntentFilter filter = new IntentFilter();
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        ContextCompat.registerReceiver(
                this.context, usbReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
        aplicarConfiguracao();
    }

    public void onPermissaoUsb(UsbDevice device, boolean concedida) {
        if (device == null || device.getDeviceId() != dispositivoAguardandoPermissao) {
            Log.w(TAG, "Ignorando resultado de permissão USB obsoleto");
            return;
        }
        dispositivoAguardandoPermissao = -1;
        permissaoSolicitada.set(false);
        if (!isHabilitada()) {
            return;
        }
        if (concedida) {
            Log.i(TAG, "Permissão USB concedida");
            conectar();
        } else {
            falhar("Permissão USB negada", null, false);
        }
    }

    public boolean isHabilitada() {
        return prefs.getBalancaConfig().habilitada;
    }

    public void setHabilitada(boolean habilitada) {
        prefs.setBalancaHabilitada(habilitada);
        aplicarConfiguracao();
    }

    public void aplicarConfiguracao() {
        if (!isHabilitada()) {
            desconectarInterno("Balança desabilitada");
            atualizarEstado(BalancaEstado.DESABILITADA, "Balança desabilitada");
            return;
        }
        if (transport.estaAberto()) {
            desconectarInterno("Aplicando configuração da balança");
        }
        conectar();
    }

    public List<DispositivoBalanca> listarDispositivos() {
        try {
            return transport.listar();
        } catch (Exception error) {
            falhar("Falha ao listar dispositivos USB", error, false);
            return Collections.emptyList();
        }
    }

    public void selecionarDispositivo(DispositivoBalanca info) {
        prefs.setBalancaDispositivo(info.vendorId, info.productId, info.serial);
        dispositivo = info.nome;
        driver = info.driver;
        vendorId = info.vendorId;
        productId = info.productId;
        if (isHabilitada()) {
            desconectarInterno("Aplicando dispositivo");
            conectar();
        } else {
            notificar();
        }
    }

    public void setLogHex(boolean habilitado) {
        prefs.setBalancaLogHex(habilitado);
        if (!habilitado) {
            ultimoTxHex = "";
            ultimoRxHex = "";
        }
        notificar();
    }

    public void conectar() {
        if (!isHabilitada()
                || transport.estaAberto()
                || !conexaoEmAndamento.compareAndSet(false, true)) {
            return;
        }
        final int token = geracao.get();
        atualizarEstado(BalancaEstado.CONECTANDO, "Procurando conversor USB-Serial");
        executor.execute(() -> {
            try {
                conectarNoWorker(token);
            } finally {
                conexaoEmAndamento.set(false);
            }
        });
    }

    private void conectarNoWorker(int token) {
        if (token != geracao.get() || !isHabilitada() || transport.estaAberto()) {
            return;
        }
        try {
            BalancaConfig config = prefs.getBalancaConfig();
            List<DispositivoBalanca> disponiveis = transport.listar();
            if (!config.temDispositivoSelecionado() && disponiveis.size() == 1) {
                DispositivoBalanca unico = disponiveis.get(0);
                prefs.setBalancaDispositivo(unico.vendorId, unico.productId, unico.serial);
                config = prefs.getBalancaConfig();
            }
            UsbDevice device = transport.localizar(config);
            if (device == null) {
                atualizarEstado(BalancaEstado.DESCONECTADA, "Conversor USB-Serial não encontrado");
                return;
            }
            atualizarInfoDispositivo(device, disponiveis);
            if (!transport.temPermissao(device)) {
                atualizarEstado(BalancaEstado.CONECTANDO, "Aguardando permissão USB");
                if (permissaoSolicitada.compareAndSet(false, true)) {
                    dispositivoAguardandoPermissao = device.getDeviceId();
                    Log.i(TAG, "Solicitando permissão USB");
                    transport.solicitarPermissao(device);
                }
                return;
            }
            transport.abrir(device, config);
            if (token != geracao.get() || !isHabilitada()) {
                transport.fechar();
                return;
            }
            parser.resetar();
            tentativasReconexao = 0;
            ultimoErro = "";
            Log.i(TAG, "Conexão USB-Serial estabelecida");
            atualizarEstado(BalancaEstado.CONECTADA, "Balança conectada");
        } catch (Exception error) {
            falhar("Falha ao conectar à balança", error, true);
        }
    }

    public void solicitarPeso(LeituraCallback callback) {
        if (!isHabilitada()) {
            entregar(callback, BalancaLeitura.estado(BalancaEstado.DESABILITADA, "Balança desabilitada"));
            return;
        }
        if (!transport.estaAberto()) {
            conectar();
            entregar(callback, BalancaLeitura.estado(BalancaEstado.DESCONECTADA, "Balança desconectada"));
            return;
        }
        if (!leituraEmAndamento.compareAndSet(false, true)) {
            entregar(callback, BalancaLeitura.estado(BalancaEstado.LENDO, "Leitura em andamento"));
            return;
        }
        final int token = geracao.get();
        atualizarEstado(BalancaEstado.LENDO, "Aguardando peso");
        executor.execute(() -> lerNoWorker(token, callback));
    }

    private void lerNoWorker(int token, LeituraCallback callback) {
        BalancaLeitura resultado = BalancaLeitura.estado(BalancaEstado.ERRO, "Sem resposta da balança");
        try {
            parser.resetar();
            byte[] pedido = Prt3Protocol.solicitarPeso();
            transport.escrever(pedido, WRITE_TIMEOUT_MS);
            registrarTx(pedido);
            byte[] buffer = new byte[64];
            long limite = System.currentTimeMillis() + RESPONSE_WINDOW_MS;
            while (token == geracao.get() && System.currentTimeMillis() < limite) {
                int lidos = transport.ler(buffer, READ_TIMEOUT_MS);
                if (lidos > 0) {
                    registrarRx(buffer, lidos);
                    List<BalancaLeitura> leituras = parser.aceitar(buffer, lidos);
                    if (!leituras.isEmpty()) {
                        resultado = leituras.get(leituras.size() - 1);
                        break;
                    }
                }
            }
            if (token == geracao.get()) {
                aplicarLeitura(resultado);
            }
        } catch (IOException error) {
            resultado = BalancaLeitura.estado(BalancaEstado.ERRO, "Erro de comunicação USB");
            falhar("Erro de comunicação USB", error, true);
        } finally {
            leituraEmAndamento.set(false);
            entregar(callback, resultado);
        }
    }

    public BalancaDiagnostico getDiagnostico() {
        return new BalancaDiagnostico(
                estado,
                mensagem,
                dispositivo,
                driver,
                vendorId,
                productId,
                ultimoPeso,
                ultimaComunicacao,
                ultimoErro,
                ultimoTxHex,
                ultimoRxHex);
    }

    public void adicionarListener(Listener listener) {
        if (listener != null) {
            listeners.add(listener);
            entregarDiagnostico(listener);
        }
    }

    public void removerListener(Listener listener) {
        listeners.remove(listener);
    }

    private void aplicarLeitura(BalancaLeitura leitura) {
        if (leitura.getPesoKg() != null) {
            ultimoPeso = leitura.getPesoKg().toPlainString() + " kg";
        }
        if (leitura.getEstado() == BalancaEstado.ERRO) {
            ultimoErro = leitura.getMensagem();
        }
        Log.i(TAG, leitura.isPesoValido()
                ? "Peso estável recebido: " + leitura.getPesoKg().toPlainString()
                : leitura.getMensagem());
        atualizarEstado(leitura.getEstado(), leitura.getMensagem());
    }

    private void atualizarInfoDispositivo(UsbDevice device, List<DispositivoBalanca> infos) {
        vendorId = device.getVendorId();
        productId = device.getProductId();
        dispositivo = device.getProductName() == null
                ? "Conversor USB-Serial"
                : device.getProductName();
        for (DispositivoBalanca info : infos) {
            if (info.vendorId == vendorId && info.productId == productId) {
                driver = info.driver;
                dispositivo = info.nome;
                break;
            }
        }
    }

    private void desconectarInterno(String motivo) {
        geracao.incrementAndGet();
        leituraEmAndamento.set(false);
        permissaoSolicitada.set(false);
        dispositivoAguardandoPermissao = -1;
        tentativasReconexao = 0;
        parser.resetar();
        transport.fechar();
        Log.i(TAG, motivo);
        if (isHabilitada()) {
            atualizarEstado(BalancaEstado.DESCONECTADA, motivo);
        }
    }

    private void falhar(String resumo, Throwable error, boolean reconectar) {
        ultimoErro = error == null || error.getMessage() == null
                ? resumo
                : resumo + ": " + error.getMessage();
        transport.fechar();
        Log.w(TAG, ultimoErro, error);
        atualizarEstado(BalancaEstado.ERRO, resumo);
        if (reconectar) {
            agendarReconexao();
        }
    }

    private void agendarReconexao() {
        if (!isHabilitada() || tentativasReconexao >= MAX_RECONEXOES) {
            return;
        }
        tentativasReconexao++;
        int token = geracao.get();
        mainHandler.postDelayed(() -> {
            if (token == geracao.get() && isHabilitada() && !transport.estaAberto()) {
                conectar();
            }
        }, 1000L * tentativasReconexao);
    }

    private void atualizarEstado(BalancaEstado novoEstado, String novaMensagem) {
        estado = novoEstado;
        mensagem = novaMensagem;
        notificar();
    }

    private void registrarTx(byte[] dados) {
        ultimaComunicacao = System.currentTimeMillis();
        if (prefs.getBalancaConfig().logHex) {
            ultimoTxHex = hex(dados, dados.length);
            ultimoRxHex = "";
        }
        notificar();
    }

    private void registrarRx(byte[] dados, int tamanho) {
        ultimaComunicacao = System.currentTimeMillis();
        if (prefs.getBalancaConfig().logHex) {
            String trecho = hex(dados, tamanho);
            ultimoRxHex = ultimoRxHex.isEmpty() ? trecho : (ultimoRxHex + " " + trecho);
            if (ultimoRxHex.length() > 191) {
                ultimoRxHex = ultimoRxHex.substring(ultimoRxHex.length() - 191);
            }
        }
        notificar();
    }

    private String hex(byte[] dados, int tamanho) {
        StringBuilder out = new StringBuilder();
        int limite = Math.min(Math.min(tamanho, dados.length), 64);
        for (int i = 0; i < limite; i++) {
            if (i > 0) {
                out.append(' ');
            }
            out.append(String.format("%02X", dados[i] & 0xFF));
        }
        return out.toString();
    }

    private void entregar(LeituraCallback callback, BalancaLeitura leitura) {
        if (callback != null) {
            mainHandler.post(() -> callback.onResultado(leitura));
        }
    }

    private void notificar() {
        BalancaDiagnostico snapshot = getDiagnostico();
        mainHandler.post(() -> {
            for (Listener listener : listeners) {
                listener.onBalancaAlterada(snapshot);
            }
        });
    }

    private void entregarDiagnostico(Listener listener) {
        BalancaDiagnostico snapshot = getDiagnostico();
        mainHandler.post(() -> listener.onBalancaAlterada(snapshot));
    }
}
