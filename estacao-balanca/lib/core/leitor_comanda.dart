import 'package:flutter/services.dart';

/// Tamanho mínimo (dígitos) para aceitar uma leitura de comanda.
const int tamanhoMinimoCodigoComanda = 2;

/// Tempo máximo sem tecla para considerar o buffer abandonado (tecla solta).
/// Propositalmente largo: um leitor HID nunca passa disso no meio do código,
/// e descartar o começo de uma leitura geraria um número de comanda errado.
const Duration expiracaoBufferComanda = Duration(seconds: 1);

/// Acumula as teclas enviadas pelo leitor HID e entrega o código no `Enter`.
///
/// Classe pura (sem Flutter widgets) para ser testável. Substitui a leitura
/// via `TextField` invisível, que perdia dígitos em rajadas rápidas porque o
/// texto passa pelo canal assíncrono de edição do sistema.
class LeitorComandaBuffer {
  LeitorComandaBuffer({this.expiracao = expiracaoBufferComanda});

  final Duration expiracao;
  final StringBuffer _buffer = StringBuffer();
  DateTime? _ultimaTecla;

  String get conteudo => _buffer.toString();

  void limpar() {
    _buffer.clear();
    _ultimaTecla = null;
  }

  void _expirarSeNecessario(DateTime agora) {
    final ultima = _ultimaTecla;
    if (ultima != null && agora.difference(ultima) > expiracao) {
      limpar();
    }
  }

  /// Registra um dígito (`0`-`9`).
  void adicionarDigito(String digito, DateTime agora) {
    _expirarSeNecessario(agora);
    _buffer.write(digito);
    _ultimaTecla = agora;
  }

  /// Fecha a leitura. Retorna o código (só dígitos) ou `null` se não houver
  /// um código válido. O buffer é sempre zerado.
  String? finalizar(DateTime agora) {
    _expirarSeNecessario(agora);
    final codigo = _buffer.toString();
    limpar();
    if (codigo.length < tamanhoMinimoCodigoComanda) return null;
    return codigo;
  }
}

const _digitosTeclado = <LogicalKeyboardKey, String>{
  LogicalKeyboardKey.digit0: '0',
  LogicalKeyboardKey.digit1: '1',
  LogicalKeyboardKey.digit2: '2',
  LogicalKeyboardKey.digit3: '3',
  LogicalKeyboardKey.digit4: '4',
  LogicalKeyboardKey.digit5: '5',
  LogicalKeyboardKey.digit6: '6',
  LogicalKeyboardKey.digit7: '7',
  LogicalKeyboardKey.digit8: '8',
  LogicalKeyboardKey.digit9: '9',
  LogicalKeyboardKey.numpad0: '0',
  LogicalKeyboardKey.numpad1: '1',
  LogicalKeyboardKey.numpad2: '2',
  LogicalKeyboardKey.numpad3: '3',
  LogicalKeyboardKey.numpad4: '4',
  LogicalKeyboardKey.numpad5: '5',
  LogicalKeyboardKey.numpad6: '6',
  LogicalKeyboardKey.numpad7: '7',
  LogicalKeyboardKey.numpad8: '8',
  LogicalKeyboardKey.numpad9: '9',
};

/// Dígito representado pela tecla, ou `null` se não for dígito.
///
/// Quando o evento traz `character`, ele manda (evita tratar `Shift+1` = `!`
/// como `1`). Sem `character`, usa a tecla lógica (teclado numérico etc.).
String? digitoDaTecla({String? character, required LogicalKeyboardKey tecla}) {
  if (character != null && character.isNotEmpty) {
    final unidade = character.codeUnitAt(0);
    final ehDigito = character.length == 1 && unidade >= 0x30 && unidade <= 0x39;
    return ehDigito ? character : null;
  }
  return _digitosTeclado[tecla];
}

bool teclaEhEnter(LogicalKeyboardKey tecla) =>
    tecla == LogicalKeyboardKey.enter || tecla == LogicalKeyboardKey.numpadEnter;
