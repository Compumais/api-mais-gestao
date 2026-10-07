import 'package:estacao_balanca/core/leitor_comanda.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final t0 = DateTime(2026, 1, 1, 12);

  group('LeitorComandaBuffer', () {
    test('entrega todos os dígitos no Enter, sem perder nenhum', () {
      final leitor = LeitorComandaBuffer();
      final codigo = '0012345678';
      for (var i = 0; i < codigo.length; i++) {
        leitor.adicionarDigito(
          codigo[i],
          t0.add(Duration(milliseconds: i * 5)),
        );
      }
      expect(leitor.finalizar(t0.add(const Duration(milliseconds: 80))), codigo);
      expect(leitor.conteudo, isEmpty);
    });

    test('preserva dígitos repetidos', () {
      final leitor = LeitorComandaBuffer();
      for (var i = 0; i < 6; i++) {
        leitor.adicionarDigito('1', t0.add(Duration(milliseconds: i)));
      }
      expect(leitor.finalizar(t0.add(const Duration(milliseconds: 10))), '111111');
    });

    test('rejeita leitura com menos de 2 dígitos', () {
      final leitor = LeitorComandaBuffer();
      leitor.adicionarDigito('7', t0);
      expect(leitor.finalizar(t0), isNull);
    });

    test('Enter sem dígitos não gera leitura', () {
      expect(LeitorComandaBuffer().finalizar(t0), isNull);
    });

    test('descarta tecla solta antiga antes de uma nova leitura', () {
      final leitor = LeitorComandaBuffer();
      leitor.adicionarDigito('9', t0);
      final depois = t0.add(const Duration(seconds: 5));
      for (var i = 0; i < 4; i++) {
        leitor.adicionarDigito('1', depois.add(Duration(milliseconds: i)));
      }
      expect(
        leitor.finalizar(depois.add(const Duration(milliseconds: 10))),
        '1111',
      );
    });

    test('pausa curta no meio do código não descarta o começo', () {
      final leitor = LeitorComandaBuffer();
      leitor.adicionarDigito('1', t0);
      leitor.adicionarDigito('2', t0.add(const Duration(milliseconds: 400)));
      leitor.adicionarDigito('3', t0.add(const Duration(milliseconds: 500)));
      expect(leitor.finalizar(t0.add(const Duration(milliseconds: 600))), '123');
    });
  });

  group('digitoDaTecla', () {
    test('usa o caractere quando presente', () {
      expect(
        digitoDaTecla(character: '5', tecla: LogicalKeyboardKey.digit5),
        '5',
      );
    });

    test('não trata símbolo de Shift+dígito como dígito', () {
      expect(
        digitoDaTecla(character: '!', tecla: LogicalKeyboardKey.digit1),
        isNull,
      );
    });

    test('usa a tecla lógica sem caractere (teclado numérico)', () {
      expect(digitoDaTecla(tecla: LogicalKeyboardKey.numpad3), '3');
      expect(digitoDaTecla(tecla: LogicalKeyboardKey.digit0), '0');
      expect(digitoDaTecla(tecla: LogicalKeyboardKey.keyA), isNull);
    });

    test('reconhece Enter e Enter do teclado numérico', () {
      expect(teclaEhEnter(LogicalKeyboardKey.enter), isTrue);
      expect(teclaEhEnter(LogicalKeyboardKey.numpadEnter), isTrue);
      expect(teclaEhEnter(LogicalKeyboardKey.tab), isFalse);
    });
  });
}
