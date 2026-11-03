import 'dart:convert';

import 'package:http/http.dart' as http;

import 'modelos.dart';

class PdvErro implements Exception {
  PdvErro(this.mensagem, {this.status});

  final String mensagem;
  final int? status;

  bool get naoAutorizado => status == 401;

  @override
  String toString() => mensagem;
}

class PdvApi {
  PdvApi({
    required this.baseUrl,
    this.token,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final String baseUrl;
  String? token;
  final http.Client _client;

  Future<String> login({
    required String usuario,
    required String senha,
    required String identificador,
  }) async {
    final json = await _enviar(
      'POST',
      '/pos/login',
      auth: false,
      body: {
        'email': usuario.trim(),
        'login': usuario.trim(),
        'password': senha,
        'identificador': identificador,
      },
    );
    final recebido = json['token']?.toString() ?? '';
    if (recebido.isEmpty) {
      throw PdvErro('O PDV não devolveu o token de acesso.');
    }
    token = recebido;
    return recebido;
  }

  Future<bool> modeloComanda() async {
    final json = await _enviar('GET', '/pos/status');
    return json['modeloAtendimento']?.toString() == 'comanda';
  }

  Future<List<MesaResumo>> listarAbertas() async {
    final json = await _enviar('GET', '/pos/mesas');
    final data = json['data'];
    if (data is! List) {
      throw PdvErro('Resposta de mesas inválida.');
    }
    final mesas = data
        .whereType<Map>()
        .map((item) => MesaResumo.fromJson(Map<String, dynamic>.from(item)))
        .toList();
    return filtrarContasAbertas(mesas);
  }

  Future<ContaDetalhe> obterConta(String id) async {
    final json = await _enviar('GET', '/pos/contas/$id');
    if (json['id'] == null) {
      throw PdvErro('Conta não encontrada.');
    }
    return ContaDetalhe.fromJson(json);
  }

  Future<void> fecharConta(String id, Map<String, dynamic> pagamento) async {
    await _enviar(
      'POST',
      '/pos/contas/$id/fechar',
      body: {
        'pagamentos': [pagamento],
      },
    );
  }

  Future<Map<String, dynamic>> _enviar(
    String method,
    String path, {
    bool auth = true,
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('${baseUrl.replaceAll(RegExp(r'/+$'), '')}$path');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (auth) {
      final atual = token;
      if (atual == null || atual.isEmpty) {
        throw PdvErro('Sessão ausente.', status: 401);
      }
      headers['Authorization'] = 'Bearer $atual';
    }
    final http.Response resposta;
    try {
      final futuro = switch (method) {
        'POST' => _client.post(uri, headers: headers, body: jsonEncode(body ?? {})),
        _ => _client.get(uri, headers: headers),
      };
      resposta = await futuro.timeout(const Duration(seconds: 30));
    } catch (erro) {
      if (erro is PdvErro) {
        rethrow;
      }
      throw PdvErro('Sem comunicação com o PDV.');
    }
    final json = _lerJson(resposta.body);
    if (resposta.statusCode < 200 || resposta.statusCode >= 300) {
      final mensagem = json['error']?.toString();
      throw PdvErro(
        mensagem == null || mensagem.isEmpty
            ? 'O PDV respondeu HTTP ${resposta.statusCode}.'
            : mensagem,
        status: resposta.statusCode,
      );
    }
    return json;
  }

  Map<String, dynamic> _lerJson(String corpo) {
    if (corpo.trim().isEmpty) {
      return {};
    }
    try {
      final decoded = jsonDecode(corpo);
      if (decoded is Map) {
        return Map<String, dynamic>.from(decoded);
      }
    } catch (_) {
      return {};
    }
    return {};
  }
}
