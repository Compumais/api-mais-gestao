import 'package:estacao_balanca/features/balanca/balanca_leitura.dart';
import 'package:estacao_balanca/features/balanca/balanca_service.dart';
import 'package:estacao_balanca/features/balanca/porta_serial_info.dart';
import 'package:estacao_balanca/features/balanca/serial_balanca_stub.dart'
    if (dart.library.io) 'package:estacao_balanca/features/balanca/serial_balanca_io.dart'
    as serial;

/// Balança Prix Prt3 via serial desktop (COM) ou USB OTG no Android.
class SerialBalancaService implements BalancaService {
  SerialBalancaService({
    required this.portaNome,
    this.baudRate = 2400,
  });

  final String portaNome;
  final int baudRate;

  late final BalancaService _impl = serial.createSerialBalanca(
    portaNome: portaNome,
    baudRate: baudRate,
  );

  @override
  bool get conectado => _impl.conectado;

  @override
  String get diagnostico => _impl.diagnostico;

  @override
  Future<void> conectar() => _impl.conectar();

  @override
  Future<void> desconectar() => _impl.desconectar();

  @override
  Future<List<String>> listarPortas() => _impl.listarPortas();

  @override
  Future<BalancaLeitura> lerPeso({
    Duration timeout = const Duration(seconds: 3),
  }) =>
      _impl.lerPeso(timeout: timeout);
}

Future<List<String>> listarPortasSerialSeguro() =>
    serial.listarPortasSerialSeguro();

Future<List<PortaSerialInfo>> listarPortasSerialInfo() =>
    serial.listarPortasSerialInfo();

bool plataformaUsaUsbOtg() => serial.plataformaUsaUsbOtg();
