import 'package:flutter/services.dart';

import 'retorno_tef.dart';

abstract class TefBridge {
  Future<bool> disponivel();

  Future<RetornoTef> executar(Map<String, String> extras, {bool exigeNsu = true});
}

class TefAndroid implements TefBridge {
  TefAndroid({MethodChannel? canal})
      : _canal = canal ?? const MethodChannel('com.pos_selfpay/tef');

  final MethodChannel _canal;

  @override
  Future<bool> disponivel() async {
    try {
      final ok = await _canal.invokeMethod<bool>('disponivel');
      return ok == true;
    } on MissingPluginException {
      return false;
    }
  }

  @override
  Future<RetornoTef> executar(
    Map<String, String> extras, {
    bool exigeNsu = true,
  }) async {
    try {
      final bruto = await _canal.invokeMethod<dynamic>('transacionar', {
        'extras': extras,
      });
      if (bruto is! Map) {
        return const RetornoTef(
          aprovado: false,
          mensagem: 'Resposta do TEF inválida.',
        );
      }
      final mapa = Map<Object?, Object?>.from(bruto);
      final codigo = mapa['resultCode'];
      final resultCode = codigo is int ? codigo : int.tryParse('$codigo') ?? 0;
      final crus = mapa['extras'];
      final campos = <String, String?>{};
      if (crus is Map) {
        crus.forEach((chave, valor) {
          campos[chave.toString()] = valor?.toString();
        });
      }
      return interpretarRetorno(
        resultCode: resultCode,
        extras: campos,
        exigeNsu: exigeNsu,
      );
    } on PlatformException catch (erro) {
      return RetornoTef(
        aprovado: false,
        mensagem: erro.message ?? 'Falha ao abrir o Intent Digital Hub.',
      );
    } on MissingPluginException {
      return const RetornoTef(
        aprovado: false,
        mensagem: 'TEF disponível apenas no Android.',
      );
    }
  }
}
