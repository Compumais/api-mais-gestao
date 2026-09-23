import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import 'package:estacao_balanca/core/models.dart';

enum FontePeso { local, pdv, auto }

class AppPrefs {
  AppPrefs(this._prefs);

  final SharedPreferences _prefs;
  static const _uuid = Uuid();
  static const _atalhosKey = 'atalhoIds';
  static const _atalhosCacheKey = 'atalhosCacheJson';

  static Future<AppPrefs> create() async {
    final prefs = await SharedPreferences.getInstance();
    final app = AppPrefs(prefs);
    if (app.terminalId.isEmpty) {
      await app.setTerminalId(_uuid.v4());
    }
    return app;
  }

  String get baseUrl => _prefs.getString('baseUrl') ?? 'http://192.168.0.1:5050';
  Future<void> setBaseUrl(String v) =>
      _prefs.setString('baseUrl', v.trim().replaceAll(RegExp(r'/+$'), ''));

  String get token => _prefs.getString('token') ?? '';
  Future<void> setToken(String v) => _prefs.setString('token', v);

  String get terminalId => _prefs.getString('terminalId') ?? '';
  Future<void> setTerminalId(String v) => _prefs.setString('terminalId', v);

  String get username => _prefs.getString('username') ?? '';
  Future<void> setUsername(String v) => _prefs.setString('username', v);

  String get empresaId => _prefs.getString('empresaId') ?? '';
  Future<void> setEmpresaId(String v) => _prefs.setString('empresaId', v);

  String get empresaNome => _prefs.getString('empresaNome') ?? '';
  Future<void> setEmpresaNome(String v) => _prefs.setString('empresaNome', v);

  bool get hasSession => token.isNotEmpty;

  bool get balancaLocalHabilitada =>
      _prefs.getBool('balancaLocal') ?? true;
  Future<void> setBalancaLocalHabilitada(bool v) =>
      _prefs.setBool('balancaLocal', v);

  String get portaSerial => _prefs.getString('portaSerial') ?? '';
  Future<void> setPortaSerial(String v) => _prefs.setString('portaSerial', v);

  int get baudRate => _prefs.getInt('baudRate') ?? 2400;
  Future<void> setBaudRate(int v) => _prefs.setInt('baudRate', v);

  FontePeso get fontePeso {
    final raw = _prefs.getString('fontePeso') ?? 'auto';
    return FontePeso.values.firstWhere(
      (e) => e.name == raw,
      orElse: () => FontePeso.auto,
    );
  }

  Future<void> setFontePeso(FontePeso v) =>
      _prefs.setString('fontePeso', v.name);

  List<String> get atalhoIds =>
      _prefs.getStringList(_atalhosKey) ?? const <String>[];

  Future<void> setAtalhoIds(List<String> ids) =>
      _prefs.setStringList(_atalhosKey, ids);

  bool get temAtalhos => atalhoIds.isNotEmpty;

  Future<void> salvarAtalhosCache(List<ProdutoLan> produtos) async {
    final payload = jsonEncode(produtos.map((p) => p.toJson()).toList());
    await _prefs.setString(_atalhosCacheKey, payload);
  }

  List<ProdutoLan> lerAtalhosCache() {
    final raw = _prefs.getString(_atalhosCacheKey);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return const [];
      return decoded
          .whereType<Map>()
          .map((e) => ProdutoLan.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> clearSession() async {
    await _prefs.remove('token');
    await _prefs.remove('username');
    await _prefs.remove('empresaId');
    await _prefs.remove('empresaNome');
  }

  Future<void> aplicarUrlOuQr(String entrada) async {
    final t = entrada.trim();
    if (t.startsWith('mgpos://')) {
      final uri = Uri.parse(t);
      final url = uri.queryParameters['url'];
      if (url != null && url.isNotEmpty) {
        await setBaseUrl(Uri.decodeComponent(url));
        return;
      }
    }
    await setBaseUrl(t);
  }
}
