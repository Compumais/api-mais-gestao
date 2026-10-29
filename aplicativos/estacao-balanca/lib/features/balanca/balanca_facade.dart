import 'package:estacao_balanca/core/lan_client.dart';
import 'package:estacao_balanca/core/prefs.dart';
import 'package:estacao_balanca/features/balanca/balanca_leitura.dart';
import 'package:estacao_balanca/features/balanca/balanca_service.dart';
import 'package:estacao_balanca/features/balanca/pdv_balanca_service.dart';
import 'package:estacao_balanca/features/balanca/serial_balanca_service.dart';

/// Escolhe fonte local (serial) e/ou PDV conforme [AppPrefs.fontePeso].
class BalancaFacade implements BalancaService {
  BalancaFacade({
    required this.prefs,
    required LanClient client,
  }) : _pdv = PdvBalancaService(client);

  final AppPrefs prefs;
  final PdvBalancaService _pdv;
  SerialBalancaService? _serial;
  String _diag = '';
  bool _conectado = false;

  @override
  bool get conectado => _conectado;

  @override
  String get diagnostico => _diag;

  BalancaService? _localOuNulo() {
    if (!prefs.balancaLocalHabilitada) return null;
    // No Android, porta vazia = auto (único conversor USB-Serial).
    if (prefs.portaSerial.isEmpty && !plataformaUsaUsbOtg()) return null;
    final porta = prefs.portaSerial;
    final baud = prefs.baudRate;
    if (_serial != null &&
        (_serial!.portaNome != porta || _serial!.baudRate != baud)) {
      _serial!.desconectar();
      _serial = null;
    }
    _serial ??= SerialBalancaService(
      portaNome: porta,
      baudRate: baud,
    );
    return _serial;
  }

  @override
  Future<void> conectar() async {
    final fonte = prefs.fontePeso;
    if (fonte == FontePeso.pdv) {
      await _pdv.conectar();
      _conectado = _pdv.conectado;
      _diag = _pdv.diagnostico;
      return;
    }
    final local = _localOuNulo();
    if (local != null) {
      try {
        await local.conectar();
        _conectado = local.conectado;
        _diag = local.diagnostico;
        return;
      } catch (e) {
        _diag = 'Serial falhou: $e';
        if (fonte == FontePeso.local) rethrow;
      }
    }
    if (fonte == FontePeso.auto || fonte == FontePeso.pdv) {
      await _pdv.conectar();
      _conectado = _pdv.conectado;
      _diag = '${_diag.isEmpty ? '' : '$_diag | '}${_pdv.diagnostico}';
    }
  }

  @override
  Future<void> desconectar() async {
    await _serial?.desconectar();
    await _pdv.desconectar();
    _conectado = false;
  }

  @override
  Future<List<String>> listarPortas() async {
    final portas = <String>['pdv'];
    try {
      portas.addAll(await listarPortasSerialSeguro());
    } catch (_) {}
    return portas;
  }

  @override
  Future<BalancaLeitura> lerPeso({
    Duration timeout = const Duration(seconds: 3),
  }) async {
    final fonte = prefs.fontePeso;

    if (fonte == FontePeso.pdv) {
      final l = await _pdv.lerPeso(timeout: timeout);
      _diag = _pdv.diagnostico;
      _conectado = _pdv.conectado;
      return l;
    }

    final local = _localOuNulo();
    if (local != null) {
      try {
        final l = await local.lerPeso(timeout: timeout);
        _diag = local.diagnostico;
        _conectado = local.conectado;
        if (l.isPesoValido || fonte == FontePeso.local) {
          return l;
        }
      } catch (e) {
        _diag = 'Serial: $e';
        if (fonte == FontePeso.local) {
          return BalancaLeitura.estado(BalancaEstado.erro, e.toString());
        }
      }
    } else if (fonte == FontePeso.local) {
      return BalancaLeitura.estado(
        BalancaEstado.desabilitada,
        'Balança local sem porta configurada',
      );
    }

    final pdv = await _pdv.lerPeso(timeout: timeout);
    _diag = '${_diag.isEmpty ? '' : '$_diag | '}${_pdv.diagnostico}';
    _conectado = _pdv.conectado;
    return pdv;
  }
}
