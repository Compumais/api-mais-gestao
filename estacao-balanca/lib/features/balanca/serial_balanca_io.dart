import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter_libserialport/flutter_libserialport.dart';
import 'package:estacao_balanca/features/balanca/balanca_leitura.dart';
import 'package:estacao_balanca/features/balanca/balanca_service.dart';
import 'package:estacao_balanca/features/balanca/porta_serial_info.dart';
import 'package:estacao_balanca/features/balanca/prt3_parser.dart';
import 'package:estacao_balanca/features/balanca/prt3_protocol.dart';
import 'package:estacao_balanca/features/balanca/serial_android_usb.dart';

BalancaService createSerialBalanca({
  required String portaNome,
  int baudRate = 2400,
}) {
  if (!kIsWeb && Platform.isAndroid) {
    return AndroidUsbBalanca(portaNome: portaNome, baudRate: baudRate);
  }
  return _SerialBalancaDesktop(portaNome: portaNome, baudRate: baudRate);
}

Future<List<String>> listarPortasSerialSeguro() async {
  final infos = await listarPortasSerialInfo();
  return infos.map((e) => e.id).toList();
}

Future<List<PortaSerialInfo>> listarPortasSerialInfo() async {
  try {
    if (kIsWeb) return const [];
    if (Platform.isAndroid) {
      return await AndroidUsbBalanca.listarDispositivosUsb();
    }
    return SerialPort.availablePorts
        .map((p) => PortaSerialInfo(id: p, label: p))
        .toList();
  } catch (_) {
    return const [];
  }
}

bool plataformaUsaUsbOtg() => !kIsWeb && Platform.isAndroid;

class _SerialBalancaDesktop implements BalancaService {
  _SerialBalancaDesktop({
    required this.portaNome,
    this.baudRate = 2400,
  });

  final String portaNome;
  final int baudRate;

  SerialPort? _porta;
  SerialPortReader? _reader;
  StreamSubscription<Uint8List>? _sub;
  final List<int> _buffer = [];
  final List<int> _rxLog = [];
  final List<int> _txLog = [];
  bool _conectado = false;

  @override
  bool get conectado => _conectado;

  @override
  String get diagnostico {
    final tx = _txLog.map((b) => b.toRadixString(16).padLeft(2, '0')).join(' ');
    final rx = _rxLog.map((b) => b.toRadixString(16).padLeft(2, '0')).join(' ');
    return 'porta=$portaNome baud=$baudRate tx=[$tx] rx=[$rx]';
  }

  @override
  Future<List<String>> listarPortas() async {
    try {
      return SerialPort.availablePorts;
    } catch (_) {
      return const [];
    }
  }

  @override
  Future<void> conectar() async {
    await desconectar();
    if (portaNome.isEmpty) {
      throw StateError('Porta serial não configurada');
    }
    final porta = SerialPort(portaNome);
    if (!porta.openReadWrite()) {
      throw StateError(
        'Falha ao abrir $portaNome: ${SerialPort.lastError}',
      );
    }
    porta.config = SerialPortConfig()
      ..baudRate = baudRate
      ..bits = 8
      ..parity = SerialPortParity.none
      ..stopBits = 1
      ..setFlowControl(SerialPortFlowControl.none);
    _porta = porta;
    _reader = SerialPortReader(porta);
    _sub = _reader!.stream.listen((data) {
      _buffer.addAll(data);
      _rxLog.addAll(data);
      if (_rxLog.length > 64) {
        _rxLog.removeRange(0, _rxLog.length - 64);
      }
    });
    _conectado = true;
  }

  @override
  Future<void> desconectar() async {
    await _sub?.cancel();
    _sub = null;
    _reader = null;
    _buffer.clear();
    try {
      _porta?.close();
    } catch (_) {}
    _porta = null;
    _conectado = false;
  }

  @override
  Future<BalancaLeitura> lerPeso({
    Duration timeout = const Duration(seconds: 3),
  }) async {
    if (_porta == null || !_porta!.isOpen) {
      await conectar();
    }
    _buffer.clear();
    final parser = Prt3Parser();
    final pedido = Uint8List.fromList(Prt3Protocol.solicitarPeso());
    _txLog
      ..clear()
      ..addAll(pedido);
    _porta!.write(pedido);

    final deadline = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(deadline)) {
      if (_buffer.isNotEmpty) {
        final chunk = List<int>.from(_buffer);
        _buffer.clear();
        final leituras = parser.aceitar(chunk);
        for (final l in leituras) {
          if (l.isPesoValido ||
              l.estado == BalancaEstado.instavel ||
              l.estado == BalancaEstado.pesoNegativo ||
              l.estado == BalancaEstado.sobrecarga ||
              l.estado == BalancaEstado.erro) {
            return l;
          }
        }
      }
      await Future<void>.delayed(const Duration(milliseconds: 40));
    }
    return BalancaLeitura.estado(
      BalancaEstado.erro,
      'Timeout aguardando peso Prt3',
    );
  }
}
