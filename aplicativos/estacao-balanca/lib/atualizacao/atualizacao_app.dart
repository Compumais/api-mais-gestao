import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AtualizacaoApp with WidgetsBindingObserver {
  AtualizacaoApp._();

  static final AtualizacaoApp instancia = AtualizacaoApp._();
  static const _canal = MethodChannel('estacao_balanca/atualizacao');
  static const _prefsSha = 'utility_update_sha256';
  static const _prefsVersao = 'utility_update_version';
  static var _consultou = false;

  GlobalKey<NavigatorState>? _navigatorKey;
  String? _caminhoApk;
  bool _aguardandoPermissao = false;
  bool _observando = false;
  bool _emAndamento = false;

  static void verificar(GlobalKey<NavigatorState> navigatorKey) {
    if (_consultou) return;
    _consultou = true;
    instancia._navigatorKey = navigatorKey;
    instancia._executar();
  }

  Future<String> verificarManual() {
    return _executar(avisar: true);
  }

  Future<String> _executar({bool avisar = false}) async {
    if (!Platform.isAndroid) {
      return 'Disponível apenas no Android.';
    }
    if (_emAndamento) return 'Verificação já em andamento.';
    _emAndamento = true;
    try {
      final config = await _canal.invokeMapMethod<String, String>('config') ?? {};
      final hash = (config['hash'] ?? '').trim().toLowerCase();
      final base = (config['base'] ?? '').trim();
      if (hash.isEmpty || base.isEmpty) {
        return 'Atualização não configurada neste aplicativo.';
      }
      _observar();
      final prefs = await SharedPreferences.getInstance();
      final versaoLocal = prefs.getInt(_prefsVersao) ?? 0;
      final shaGuardado = prefs.getString(_prefsSha) ?? '';
      final manifesto = await _baixarManifesto(base, hash, versaoLocal);
      if (manifesto == null || manifesto.sha256.isEmpty) {
        return 'Não foi possível consultar a atualização.';
      }
      if (shaGuardado.toLowerCase() == manifesto.sha256.toLowerCase()) {
        return 'Este aplicativo já está na versão mais recente.';
      }

      final shaInstalado = await _canal.invokeMethod<String>('sha256Instalado');
      if (shaInstalado != null &&
          shaInstalado.toLowerCase() == manifesto.sha256.toLowerCase()) {
        await prefs.setString(_prefsSha, manifesto.sha256.toLowerCase());
        await prefs.setInt(_prefsVersao, manifesto.version);
        return 'Este aplicativo já está na versão mais recente.';
      }

      final arquivo = await _baixarApk(manifesto);
      if (arquivo == null) return 'Não foi possível baixar a atualização.';
      _caminhoApk = arquivo.path;
      _mostrarDialogo();
      return 'Há uma versão nova pronta para instalar.';
    } catch (e, st) {
      debugPrint('Atualização: $e\n$st');
      if (avisar) return 'Não foi possível consultar a atualização.';
      return '';
    } finally {
      _emAndamento = false;
    }
  }

  void _observar() {
    if (_observando) return;
    _observando = true;
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed || !_aguardandoPermissao) return;
    _aguardandoPermissao = false;
    _instalarSePermitido();
  }

  Future<void> _aoInstalar() async {
    final caminho = _caminhoApk;
    if (caminho == null) return;
    final pode = await _canal.invokeMethod<bool>('podeInstalar') ?? false;
    if (!pode) {
      _aguardandoPermissao = true;
      try {
        await _canal.invokeMethod<void>('abrirPermissaoInstalacao');
      } catch (e, st) {
        _aguardandoPermissao = false;
        debugPrint('Atualização: $e\n$st');
        _mostrarDialogo();
      }
      return;
    }
    await _canal.invokeMethod<void>('instalar', {'caminho': caminho});
  }

  Future<void> _instalarSePermitido() async {
    final caminho = _caminhoApk;
    if (caminho == null) return;
    final pode = await _canal.invokeMethod<bool>('podeInstalar') ?? false;
    if (!pode) {
      _mostrarDialogo();
      return;
    }
    await _canal.invokeMethod<void>('instalar', {'caminho': caminho});
  }

  void _mostrarDialogo() {
    final contexto = _navigatorKey?.currentContext;
    if (contexto == null || !contexto.mounted) return;
    showDialog<void>(
      context: contexto,
      builder: (ctx) => AlertDialog(
        title: const Text('Nova versão'),
        content: const Text(
          'Há uma versão nova deste aplicativo. Deseja instalar agora?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Agora não'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _aoInstalar();
            },
            child: const Text('Instalar'),
          ),
        ],
      ),
    );
  }

  Future<_Manifesto?> _baixarManifesto(String baseUrl, String hash, int versaoLocal) async {
    final base = baseUrl.replaceAll(RegExp(r'/+$'), '');
    final uri = Uri.parse('$base/utilitarios/atualizacao/$hash').replace(
      queryParameters: {'version': '$versaoLocal'},
    );
    final resposta = await http
        .get(
          uri,
          headers: const {
            'Accept': 'application/json',
            'User-Agent': 'ComputicketAppUpdate',
          },
        )
        .timeout(const Duration(seconds: 20));
    if (resposta.statusCode != 200) return null;
    final json = jsonDecode(resposta.body);
    if (json is! Map) return null;
    final sha = '${json['sha256'] ?? ''}'.trim();
    final versao = json['version'];
    var download = '${json['download_url'] ?? ''}'.trim();
    if (download.isEmpty) {
      download = '$base/utilitarios/arquivo/hash/$hash';
    }
    return _Manifesto(
      version: versao is int ? versao : int.tryParse('$versao') ?? 0,
      sha256: sha,
      downloadUrl: download,
    );
  }

  Future<File?> _baixarApk(_Manifesto manifesto) async {
    final pasta = Directory('${(await getApplicationSupportDirectory()).path}/updates');
    await pasta.create(recursive: true);
    final destino = File('${pasta.path}/update.apk');
    if (await destino.exists()) {
      final existente = await _sha256Arquivo(destino);
      if (existente.toLowerCase() == manifesto.sha256.toLowerCase()) return destino;
    }

    final parcial = File('${destino.path}.part');
    final cliente = http.Client();
    try {
      final pedido = http.Request('GET', Uri.parse(manifesto.downloadUrl));
      pedido.headers['User-Agent'] = 'ComputicketAppUpdate';
      pedido.headers['Accept'] = '*/*';
      final resposta = await cliente.send(pedido).timeout(const Duration(minutes: 5));
      if (resposta.statusCode != 200) return null;
      final saida = parcial.openWrite();
      await resposta.stream.pipe(saida);
      final baixado = await _sha256Arquivo(parcial);
      if (baixado.toLowerCase() != manifesto.sha256.toLowerCase()) {
        if (await parcial.exists()) await parcial.delete();
        return null;
      }
      if (await destino.exists()) await destino.delete();
      await parcial.rename(destino.path);
      return destino;
    } catch (e) {
      if (await parcial.exists()) await parcial.delete();
      rethrow;
    } finally {
      cliente.close();
    }
  }

  Future<String> _sha256Arquivo(File arquivo) async {
    final digest = await sha256.bind(arquivo.openRead()).first;
    return digest.toString();
  }
}

class _Manifesto {
  const _Manifesto({
    required this.version,
    required this.sha256,
    required this.downloadUrl,
  });

  final int version;
  final String sha256;
  final String downloadUrl;
}
