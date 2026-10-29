import 'dart:convert';
import 'dart:typed_data';

import 'package:estacao_balanca/features/balanca/balanca_leitura.dart';
import 'package:estacao_balanca/features/balanca/prt3_protocol.dart';

/// Parser incremental Prt3: STX + cinco caracteres ASCII + ETX.
class Prt3Parser {
  static const int payloadSize = 5;
  static const int maxFrameSize = 32;

  final BytesBuilder _frame = BytesBuilder(copy: false);
  bool _recebendo = false;

  List<BalancaLeitura> aceitar(List<int> dados) {
    final leituras = <BalancaLeitura>[];
    for (final atual in dados) {
      if (atual == Prt3Protocol.stx) {
        _frame.clear();
        _recebendo = true;
        continue;
      }
      if (!_recebendo) continue;
      if (atual == Prt3Protocol.etx) {
        leituras.add(parsearFrame(_frame.takeBytes()));
        _recebendo = false;
        continue;
      }
      if (_frame.length >= maxFrameSize) {
        _frame.clear();
        _recebendo = false;
        leituras.add(
          BalancaLeitura.estado(
            BalancaEstado.erro,
            'Frame Prt3 excedeu o limite',
          ),
        );
        continue;
      }
      _frame.addByte(atual);
    }
    return leituras;
  }

  void resetar() {
    _frame.clear();
    _recebendo = false;
  }

  static BalancaLeitura parsearFrame(List<int> payload) {
    if (payload.length != payloadSize) {
      return BalancaLeitura.estado(
        BalancaEstado.erro,
        'Frame Prt3 incompleto',
      );
    }
    final valor = ascii.decode(payload, allowInvalid: true);
    if (valor == 'IIIII') {
      return BalancaLeitura.estado(BalancaEstado.instavel, 'Peso instável');
    }
    if (valor == 'NNNNN') {
      return BalancaLeitura.estado(
        BalancaEstado.pesoNegativo,
        'Peso negativo',
      );
    }
    if (valor == 'SSSSS') {
      return BalancaLeitura.estado(
        BalancaEstado.sobrecarga,
        'Sobrecarga da balança',
      );
    }
    if (!RegExp(r'^\d{5}$').hasMatch(valor)) {
      return BalancaLeitura.estado(
        BalancaEstado.erro,
        'Caracteres inválidos no frame Prt3',
      );
    }
    final kg = int.parse(valor) / 1000.0;
    return BalancaLeitura.peso(double.parse(kg.toStringAsFixed(3)));
  }
}
