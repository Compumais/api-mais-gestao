import 'dart:async';
import 'dart:typed_data';

import 'package:estacao_balanca/features/balanca/balanca_leitura.dart';
import 'package:estacao_balanca/features/balanca/balanca_service.dart';
import 'package:estacao_balanca/features/balanca/porta_serial_info.dart';
import 'package:estacao_balanca/features/balanca/prt3_parser.dart';
import 'package:estacao_balanca/features/balanca/prt3_protocol.dart';
import 'package:usb_serial/usb_serial.dart';

/// Balança Prix Prt3 via USB OTG no Android (mesmo modelo do POS).
class AndroidUsbBalanca implements BalancaService {
  AndroidUsbBalanca({
    required this.portaNome,
    this.baudRate = 2400,
  });

  /// Preferência: `vid:pid` (ex. `1027:24577`), ou vazio para auto.
  final String portaNome;
  final int baudRate;

  UsbPort? _porta;
  StreamSubscription<Uint8List>? _sub;
  final List<int> _buffer = [];
  final List<int> _rxLog = [];
  final List<int> _txLog = [];
  bool _conectado = false;
  String _dispositivo = '';

  @override
  bool get conectado => _conectado;

  @override
  String get diagnostico {
    final tx = _txLog.map((b) => b.toRadixString(16).padLeft(2, '0')).join(' ');
    final rx = _rxLog.map((b) => b.toRadixString(16).padLeft(2, '0')).join(' ');
    return 'android-usb=$_dispositivo baud=$baudRate tx=[$tx] rx=[$rx]';
  }

  @override
  Future<List<String>> listarPortas() async {
    final infos = await listarDispositivosUsb();
    return infos.map((e) => e.id).toList();
  }

  static Future<List<PortaSerialInfo>> listarDispositivosUsb() async {
    try {
      final devices = await UsbSerial.listDevices();
      return devices
          .where((d) => d.vid != null && d.pid != null)
          .map((d) {
            final id = '${d.vid}:${d.pid}';
            final nome = (d.productName?.trim().isNotEmpty ?? false)
                ? d.productName!.trim()
                : (d.manufacturerName?.trim().isNotEmpty ?? false)
                    ? d.manufacturerName!.trim()
                    : 'Conversor USB-Serial';
            return PortaSerialInfo(id: id, label: '$nome ($id)');
          })
          .toList();
    } catch (_) {
      return const [];
    }
  }

  static ({int vid, int pid})? parseVidPid(String raw) {
    final t = raw.trim();
    final m = RegExp(r'^(\d+)\s*:\s*(\d+)$').firstMatch(t);
    if (m == null) return null;
    return (vid: int.parse(m.group(1)!), pid: int.parse(m.group(2)!));
  }

  UsbDevice? _escolher(List<UsbDevice> devices) {
    final alvo = parseVidPid(portaNome);
    if (alvo != null) {
      for (final d in devices) {
        if (d.vid == alvo.vid && d.pid == alvo.pid) return d;
      }
    }
    if (devices.length == 1) return devices.first;
    return null;
  }

  @override
  Future<void> conectar() async {
    await desconectar();
    final devices = await UsbSerial.listDevices();
    if (devices.isEmpty) {
      throw StateError(
        'Nenhum conversor USB-Serial encontrado. Conecte o cabo OTG da balança.',
      );
    }
    final device = _escolher(devices);
    if (device == null) {
      throw StateError(
        'Selecione o conversor USB-Serial nas configurações '
        '(${devices.length} dispositivo(s) detectado(s)).',
      );
    }
    final port = await device.create();
    if (port == null) {
      throw StateError('Falha ao criar porta USB-Serial');
    }
    final aberto = await port.open();
    if (!aberto) {
      throw StateError(
        'Falha ao abrir USB-Serial (permissão negada ou dispositivo ocupado)',
      );
    }
    await port.setDTR(true);
    await port.setRTS(true);
    await port.setPortParameters(
      baudRate,
      UsbPort.DATABITS_8,
      UsbPort.STOPBITS_1,
      UsbPort.PARITY_NONE,
    );
    _porta = port;
    _dispositivo =
        '${device.productName ?? 'USB'} ${device.vid}:${device.pid}';
    _sub = port.inputStream?.listen((data) {
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
    _buffer.clear();
    try {
      await _porta?.close();
    } catch (_) {}
    _porta = null;
    _conectado = false;
  }

  @override
  Future<BalancaLeitura> lerPeso({
    Duration timeout = const Duration(seconds: 3),
  }) async {
    if (_porta == null || !_conectado) {
      await conectar();
    }
    final porta = _porta;
    if (porta == null) {
      return BalancaLeitura.estado(
        BalancaEstado.erro,
        'Porta USB-Serial não aberta',
      );
    }
    _buffer.clear();
    final parser = Prt3Parser();
    final pedido = Uint8List.fromList(Prt3Protocol.solicitarPeso());
    _txLog
      ..clear()
      ..addAll(pedido);
    await porta.write(pedido);

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
      'Timeout aguardando peso Prt3 (USB)',
    );
  }
}
