import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../pdv/modelos.dart';

class SessaoStore {
  SessaoStore(this.prefs);

  static const urlPadrao = 'http://10.0.2.2:5050';

  final SharedPreferences prefs;

  String get url => prefs.getString('pdv_url') ?? urlPadrao;

  String? get token {
    final valor = prefs.getString('token');
    if (valor == null || valor.isEmpty) {
      return null;
    }
    return valor;
  }

  String get usuario => prefs.getString('usuario') ?? '';

  String get cnpj => prefs.getString('cnpj') ?? '';

  bool get comanda => prefs.getBool('modelo_comanda') ?? false;

  String get terminalId {
    final atual = prefs.getString('terminal_id');
    if (atual != null && atual.isNotEmpty) {
      return atual;
    }
    final novo = const Uuid().v4();
    prefs.setString('terminal_id', novo);
    return novo;
  }

  FechamentoPendente? get pendente {
    final bruto = prefs.getString('fechamento_pendente');
    if (bruto == null || bruto.isEmpty) {
      return null;
    }
    try {
      final json = jsonDecode(bruto);
      if (json is! Map) {
        return null;
      }
      final item = FechamentoPendente.fromJson(Map<String, dynamic>.from(json));
      if (item.idConta.isEmpty || item.nsu.isEmpty) {
        return null;
      }
      return item;
    } catch (_) {
      return null;
    }
  }

  Future<void> salvarLogin({
    required String url,
    required String token,
    required String usuario,
    required bool comanda,
  }) async {
    await prefs.setString('pdv_url', url.trim().replaceAll(RegExp(r'/+$'), ''));
    await prefs.setString('token', token);
    await prefs.setString('usuario', usuario.trim());
    await prefs.setBool('modelo_comanda', comanda);
  }

  Future<void> salvarCnpj(String cnpj) async {
    await prefs.setString('cnpj', cnpj.trim());
  }

  Future<void> salvarPendente(FechamentoPendente fechamento) async {
    await prefs.setString('fechamento_pendente', jsonEncode(fechamento.toJson()));
  }

  Future<void> limparPendente() async {
    await prefs.remove('fechamento_pendente');
  }

  Future<void> sair() async {
    await prefs.remove('token');
  }
}
