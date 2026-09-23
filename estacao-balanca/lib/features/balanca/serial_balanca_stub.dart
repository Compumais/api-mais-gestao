import 'package:estacao_balanca/features/balanca/balanca_leitura.dart';
import 'package:estacao_balanca/features/balanca/balanca_service.dart';
import 'package:estacao_balanca/features/balanca/porta_serial_info.dart';

BalancaService createSerialBalanca({
  required String portaNome,
  int baudRate = 2400,
}) {
  return _UnsupportedSerial();
}

Future<List<String>> listarPortasSerialSeguro() async => const [];

Future<List<PortaSerialInfo>> listarPortasSerialInfo() async => const [];

bool plataformaUsaUsbOtg() => false;

class _UnsupportedSerial implements BalancaService {
  @override
  bool get conectado => false;

  @override
  String get diagnostico => 'Serial não suportado nesta plataforma';

  @override
  Future<void> conectar() async {}

  @override
  Future<void> desconectar() async {}

  @override
  Future<List<String>> listarPortas() async => const [];

  @override
  Future<BalancaLeitura> lerPeso({
    Duration timeout = const Duration(seconds: 3),
  }) async {
    return BalancaLeitura.estado(
      BalancaEstado.desabilitada,
      'Serial não suportado nesta plataforma',
    );
  }
}
