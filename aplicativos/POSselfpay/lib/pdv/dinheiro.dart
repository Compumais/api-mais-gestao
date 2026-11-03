String valorTef(double valor) {
  final centavos = (valor * 100).round();
  final sinal = centavos < 0 ? '-' : '';
  final absoluto = centavos.abs();
  final inteiro = absoluto ~/ 100;
  final fracao = (absoluto % 100).toString().padLeft(2, '0');
  return '$sinal$inteiro.$fracao';
}

String reais(double valor) {
  final texto = valorTef(valor);
  final negativo = texto.startsWith('-');
  final partes = texto.replaceFirst('-', '').split('.');
  final milhar = partes[0].replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (match) => '.',
  );
  return '${negativo ? '-' : ''}R\$ $milhar,${partes[1]}';
}

double lerNumero(Object? valor) {
  if (valor is num) {
    return valor.toDouble();
  }
  final texto = valor?.toString().trim().replaceAll(',', '.') ?? '';
  return double.tryParse(texto) ?? 0;
}
