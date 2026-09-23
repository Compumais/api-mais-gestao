import 'package:estacao_balanca/core/lan_client.dart';
import 'package:estacao_balanca/features/balanca/balanca_leitura.dart';
import 'package:estacao_balanca/features/balanca/balanca_service.dart';

/// Lê peso via `GET /pos/balanca/peso` no PDV desktop.
class PdvBalancaService implements BalancaService {
  PdvBalancaService(this._client);

  final LanClient _client;
  String _diag = '';
  bool _conectado = false;

  @override
  bool get conectado => _conectado;

  @override
  String get diagnostico => _diag;

  @override
  Future<void> conectar() async {
    _conectado = true;
    _diag = 'Fonte: PDV LAN';
  }

  @override
  Future<void> desconectar() async {
    _conectado = false;
  }

  @override
  Future<List<String>> listarPortas() async => const ['pdv'];

  @override
  Future<BalancaLeitura> lerPeso({
    Duration timeout = const Duration(seconds: 3),
  }) async {
    try {
      final peso = await _client.lerPesoPdv();
      _conectado = peso.conectado;
      _diag = peso.mensagem ?? 'PDV';
      if (peso.peso > 0) {
        return BalancaLeitura.peso(
          double.parse(peso.peso.toStringAsFixed(3)),
        );
      }
      return BalancaLeitura.estado(
        peso.conectado ? BalancaEstado.conectada : BalancaEstado.desconectada,
        peso.mensagem ?? 'Sem peso no PDV',
      );
    } catch (e) {
      _conectado = false;
      _diag = e.toString();
      return BalancaLeitura.estado(BalancaEstado.erro, e.toString());
    }
  }
}
