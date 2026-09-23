/// Stub: USB OTG só existe no Android. Evita puxar `usb_serial` no Windows.
library;

import 'package:estacao_balanca/features/balanca/balanca_leitura.dart';
import 'package:estacao_balanca/features/balanca/balanca_service.dart';
import 'package:estacao_balanca/features/balanca/porta_serial_info.dart';

BalancaService createAndroidUsbBalanca({
  required String portaNome,
  int baudRate = 2400,
}) {
  return _AndroidUsbIndisponivel();
}

Future<List<PortaSerialInfo>> listarDispositivosUsbAndroid() async =>
    const [];

class _AndroidUsbIndisponivel implements BalancaService {
  @override
  bool get conectado => false;

  @override
  String get diagnostico => 'USB OTG indisponível neste build';

  @override
  Future<void> conectar() async {
    throw StateError('USB OTG só é suportado no Android');
  }

  @override
  Future<void> desconectar() async {}

  @override
  Future<List<String>> listarPortas() async => const [];

  @override
  Future<BalancaLeitura> lerPeso({
    Duration timeout = const Duration(seconds: 3),
  }) async {
    return BalancaLeitura.estado(
      BalancaEstado.erro,
      'USB OTG só é suportado no Android',
    );
  }
}
