import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:estacao_balanca/features/balanca/balanca_leitura.dart';
import 'package:estacao_balanca/features/balanca/prt3_parser.dart';
import 'package:estacao_balanca/features/balanca/prt3_protocol.dart';

List<BalancaLeitura> parse(String valor) {
  final bytes = latin1.encode(valor);
  return Prt3Parser().aceitar(bytes);
}

void main() {
  test('le peso normal e zero', () {
    final normal = parse('\u000214385\u0003').first;
    final zero = parse('\u000200000\u0003').first;

    expect(normal.pesoKg!.toStringAsFixed(3), '14.385');
    expect(normal.isPesoValido, isTrue);
    expect(zero.pesoKg!.toStringAsFixed(3), '0.000');
    expect(zero.isPesoValido, isFalse);
  });

  test('distingue estados da balanca', () {
    expect(parse('\u0002IIIII\u0003').first.estado, BalancaEstado.instavel);
    expect(
      parse('\u0002NNNNN\u0003').first.estado,
      BalancaEstado.pesoNegativo,
    );
    expect(parse('\u0002SSSSS\u0003').first.estado, BalancaEstado.sobrecarga);
  });

  test('rejeita frame incompleto e caracteres invalidos', () {
    expect(parse('\u0002123'), isEmpty);
    expect(parse('\u0002123\u0003').first.estado, BalancaEstado.erro);
    expect(parse('\u000212A45\u0003').first.estado, BalancaEstado.erro);
  });

  test('processa multiplos frames e ruido', () {
    final leituras = parse('lixo\u000200100\u0003xx\u000200250\u0003');
    expect(leituras.length, 2);
    expect(leituras[0].pesoKg!.toStringAsFixed(3), '0.100');
    expect(leituras[1].pesoKg!.toStringAsFixed(3), '0.250');
  });

  test('recupera sincronizacao em novo STX e chunks', () {
    final parser = Prt3Parser();
    final primeiro = latin1.encode('\u0002ruido\u000201');
    final segundo = latin1.encode('250\u0003');

    expect(parser.aceitar(primeiro), isEmpty);
    final leituras = parser.aceitar(segundo);
    expect(leituras.length, 1);
    expect(leituras.first.pesoKg!.toStringAsFixed(3), '1.250');
  });

  test('comando de peso eh ENQ', () {
    expect(Prt3Protocol.solicitarPeso(), [0x05]);
  });
}
