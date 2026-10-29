import 'package:estacao_balanca/features/balanca/balanca_leitura.dart';

abstract class BalancaService {
  Future<void> conectar();
  Future<void> desconectar();
  Future<BalancaLeitura> lerPeso({Duration timeout = const Duration(seconds: 3)});
  Future<List<String>> listarPortas();
  String get diagnostico;
  bool get conectado;
}
