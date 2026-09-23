import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:estacao_balanca/core/models.dart';
import 'package:estacao_balanca/core/prefs.dart';

class LanClient {
  LanClient(this.prefs);

  final AppPrefs prefs;

  Uri _uri(String path) {
    final base = prefs.baseUrl.replaceAll(RegExp(r'/+$'), '');
    return Uri.parse('$base$path');
  }

  Map<String, String> _headers({bool auth = true}) {
    final h = <String, String>{'Content-Type': 'application/json'};
    if (auth && prefs.token.isNotEmpty) {
      h['Authorization'] = 'Bearer ${prefs.token}';
    }
    return h;
  }

  Future<Map<String, dynamic>> _decode(http.Response res) async {
    Map<String, dynamic> json = {};
    if (res.body.isNotEmpty) {
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) {
        json = decoded;
      } else if (decoded is List) {
        json = {'data': decoded};
      }
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw LanException(
        json['error']?.toString() ?? 'HTTP ${res.statusCode}',
        statusCode: res.statusCode,
      );
    }
    return json;
  }

  Future<Map<String, dynamic>> health() async {
    final res = await http
        .get(_uri('/pos/health'), headers: _headers(auth: false))
        .timeout(const Duration(seconds: 4));
    return _decode(res);
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final body = jsonEncode({
      'email': email.trim(),
      'password': password,
      'identificador': prefs.terminalId,
    });
    final res = await http
        .post(_uri('/pos/login'), headers: _headers(auth: false), body: body)
        .timeout(const Duration(seconds: 20));
    final json = await _decode(res);
    final token = json['token']?.toString() ?? '';
    if (token.isEmpty) {
      throw LanException('Login sem token');
    }
    await prefs.setToken(token);
    await prefs.setUsername(json['username']?.toString() ?? email);
    return json;
  }

  Future<List<EmpresaLan>> listarEmpresas() async {
    final res = await http
        .get(_uri('/pos/empresas'), headers: _headers())
        .timeout(const Duration(seconds: 15));
    final json = await _decode(res);
    final data = json['data'];
    if (data is! List) return [];
    return data
        .whereType<Map>()
        .map((e) => EmpresaLan.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<void> selecionarEmpresa(EmpresaLan empresa) async {
    final body = jsonEncode({
      'idempresa': empresa.id,
      'nomeempresa': empresa.nome,
    });
    final res = await http
        .post(_uri('/pos/empresa'), headers: _headers(), body: body)
        .timeout(const Duration(seconds: 15));
    await _decode(res);
    await prefs.setEmpresaId(empresa.id);
    await prefs.setEmpresaNome(empresa.nome);
  }

  Future<Map<String, dynamic>> status() async {
    final res = await http
        .get(_uri('/pos/status'), headers: _headers())
        .timeout(const Duration(seconds: 15));
    return _decode(res);
  }

  Future<ProdutoLan> buscarProdutoPorEan(String ean) async {
    final encoded = Uri.encodeComponent(ean.trim());
    final res = await http
        .get(_uri('/pos/produtos/ean/$encoded'), headers: _headers())
        .timeout(const Duration(seconds: 10));
    final json = await _decode(res);
    final produto = json['produto'];
    if (produto is! Map) {
      throw LanException('Produto inválido na resposta');
    }
    return ProdutoLan.fromJson(Map<String, dynamic>.from(produto));
  }

  Future<ContaLan?> obterContaPorNumero(int numero) async {
    final res = await http
        .get(_uri('/pos/mesas/$numero/conta'), headers: _headers())
        .timeout(const Duration(seconds: 10));
    if (res.statusCode == 404) return null;
    if (res.body.isEmpty || res.body.trim() == 'null') return null;
    Map<String, dynamic> json = {};
    final decoded = jsonDecode(res.body);
    if (decoded == null) return null;
    if (decoded is Map<String, dynamic>) {
      json = decoded;
    } else {
      return null;
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      if (res.statusCode == 404 ||
          (json['error']?.toString().toLowerCase().contains('não encontr') ??
              false)) {
        return null;
      }
      throw LanException(
        json['error']?.toString() ?? 'HTTP ${res.statusCode}',
        statusCode: res.statusCode,
      );
    }
    if (json['id'] == null) {
      if (json['conta'] is Map) {
        return ContaLan.fromJson(
          Map<String, dynamic>.from(json['conta'] as Map),
        );
      }
      return null;
    }
    return ContaLan.fromJson(json);
  }

  Future<ContaLan> abrirComanda(int numero, {String? nomecliente}) async {
    final body = jsonEncode({
      if (nomecliente != null && nomecliente.isNotEmpty)
        'nomecliente': nomecliente,
    });
    final res = await http
        .post(
          _uri('/pos/mesas/$numero/abrir'),
          headers: _headers(),
          body: body,
        )
        .timeout(const Duration(seconds: 15));
    final json = await _decode(res);
    return ContaLan.fromJson(json);
  }

  Future<ContaLan> resolverComanda(int numero) async {
    final existente = await obterContaPorNumero(numero);
    if (existente != null && existente.id.isNotEmpty) {
      return existente;
    }
    return abrirComanda(numero);
  }

  Future<void> adicionarItem({
    required String idConta,
    required ProdutoLan produto,
    required double quantidade,
    String? observacao,
  }) async {
    final body = jsonEncode({
      'idproduto': produto.id,
      'descricao': produto.descricao,
      'quantidade': quantidade,
      'precounitario': produto.preco,
      if (observacao != null) 'observacao': observacao,
    });
    final res = await http
        .post(
          _uri('/pos/contas/$idConta/itens'),
          headers: _headers(),
          body: body,
        )
        .timeout(const Duration(seconds: 20));
    await _decode(res);
  }

  Future<PesoPdv> lerPesoPdv() async {
    final res = await http
        .get(_uri('/pos/balanca/peso'), headers: _headers())
        .timeout(const Duration(seconds: 8));
    final json = await _decode(res);
    return PesoPdv.fromJson(json);
  }

  /// Catálogo local do PDV (`GET /pos/sync`).
  Future<List<ProdutoLan>> listarProdutosCatalogo() async {
    final res = await http
        .get(_uri('/pos/sync'), headers: _headers())
        .timeout(const Duration(seconds: 30));
    final json = await _decode(res);
    final produtos = json['produtos'];
    if (produtos is! List) return [];
    return produtos
        .whereType<Map>()
        .map((e) => ProdutoLan.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<List<ProdutoLan>> listarProdutosKg() async {
    final todos = await listarProdutosCatalogo();
    final kg = todos.where((p) => p.vendidoPorKg).toList()
      ..sort(
        (a, b) => a.descricao.toLowerCase().compareTo(b.descricao.toLowerCase()),
      );
    return kg;
  }

  String? urlImagemProduto(ProdutoLan produto) {
    final caminho = produto.caminhoimagem?.trim();
    if (caminho == null || caminho.isEmpty) return null;
    if (caminho.startsWith('http://') || caminho.startsWith('https://')) {
      return caminho;
    }
    final base = prefs.baseUrl.replaceAll(RegExp(r'/+$'), '');
    if (caminho.startsWith('/')) return '$base$caminho';
    return '$base/$caminho';
  }

  Map<String, String> authHeaders() => _headers();
}
