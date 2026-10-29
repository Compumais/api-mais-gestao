import 'package:flutter/services.dart';

class ImpressoraEstacao {
  ImpressoraEstacao({MethodChannel? canal})
      : _canal = canal ?? const MethodChannel('estacao_balanca/impressora');

  final MethodChannel _canal;

  Future<void> imprimir(String texto) async {
    try {
      await _canal.invokeMethod<void>('imprimir', {'texto': texto});
    } on PlatformException catch (e) {
      throw ImpressoraException(e.message ?? 'Falha na impressora');
    } on MissingPluginException {
      throw ImpressoraException(
        'Impressora interna indisponível neste aparelho.',
      );
    }
  }
}

class ImpressoraException implements Exception {
  ImpressoraException(this.message);

  final String message;

  @override
  String toString() => message;
}
