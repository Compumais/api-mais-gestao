import 'package:estacao_balanca/core/comanda_codigo.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('normalizarCodigoComanda', () {
    test('mantém código intacto quando a opção está desligada', () {
      expect(
        normalizarCodigoComanda('0012345', ignorarDigitoVerificador: false),
        '0012345',
      );
    });

    test('remove o último dígito quando a opção está ligada', () {
      expect(
        normalizarCodigoComanda('0012345', ignorarDigitoVerificador: true),
        '001234',
      );
      expect(
        normalizarCodigoComanda('1015', ignorarDigitoVerificador: true),
        '101',
      );
    });

    test('não remove dígito único', () {
      expect(
        normalizarCodigoComanda('5', ignorarDigitoVerificador: true),
        '5',
      );
    });

    test('ignora caracteres não numéricos do leitor', () {
      expect(
        normalizarCodigoComanda(' 12-34\n', ignorarDigitoVerificador: true),
        '123',
      );
    });
  });
}
