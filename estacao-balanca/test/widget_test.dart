import 'package:flutter_test/flutter_test.dart';
import 'package:estacao_balanca/features/balanca/prt3_protocol.dart';

void main() {
  test('smoke protocolo Prt3', () {
    expect(Prt3Protocol.solicitarPeso(), [0x05]);
  });
}
