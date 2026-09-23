enum BalancaEstado {
  desabilitada,
  desconectada,
  conectando,
  conectada,
  lendo,
  estavel,
  instavel,
  pesoNegativo,
  sobrecarga,
  erro,
}

class BalancaLeitura {
  const BalancaLeitura({
    required this.estado,
    this.pesoKg,
    this.mensagem,
  });

  final BalancaEstado estado;
  final double? pesoKg;
  final String? mensagem;

  factory BalancaLeitura.estado(BalancaEstado estado, String mensagem) {
    return BalancaLeitura(estado: estado, mensagem: mensagem);
  }

  factory BalancaLeitura.peso(double pesoKg) {
    return BalancaLeitura(
      estado: BalancaEstado.estavel,
      pesoKg: pesoKg,
      mensagem: 'Peso estável',
    );
  }

  bool get isPesoValido =>
      estado == BalancaEstado.estavel &&
      pesoKg != null &&
      pesoKg! > 0;
}
